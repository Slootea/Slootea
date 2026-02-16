import { Injectable, Logger, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import axios from 'axios';
import {
  MetaOAuthUrlResponseDto,
  WhatsAppAssetsResponseDto,
  WhatsAppBusinessAccountDto,
  WhatsAppPhoneNumberDto,
} from './dto/meta-oauth.dto';
import { OrganizationWhatsAppSettings } from './entities/organization-whatsapp-settings.entity';

interface MetaTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface MetaDebugTokenResponse {
  data: {
    app_id: string;
    user_id: string;
    is_valid: boolean;
    scopes: string[];
    expires_at: number;
    granular_scopes?: Array<{
      scope: string;
      target_ids?: string[];
    }>;
  };
}

interface OAuthStateData {
  organizationId: string;
  nonce: string;
  timestamp: number;
}

/**
 * Service for handling Meta (Facebook) OAuth for WhatsApp Business integration.
 * 
 * This service handles the OAuth 2.0 flow with Meta to grant WhatsApp Business
 * permissions to organizations.
 */
@Injectable()
export class MetaOAuthService {
  private readonly logger = new Logger(MetaOAuthService.name);
  private readonly metaApiVersion = 'v19.0';
  private readonly graphApiBaseUrl = 'https://graph.facebook.com';
  private readonly oauthBaseUrl = 'https://www.facebook.com';
  
  // In-memory state store (use Redis in production for multi-instance deployments)
  private stateStore: Map<string, OAuthStateData> = new Map();
  
  // Temporary token storage for popup flow (keyed by organizationId)
  private pendingTokens: Map<string, { accessToken: string; expiresAt: Date }> = new Map();
  
  private readonly encryptionKey: Buffer;
  private readonly encryptionAlgorithm = 'aes-256-gcm';

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(OrganizationWhatsAppSettings)
    private readonly whatsappSettingsRepository: Repository<OrganizationWhatsAppSettings>,
  ) {
    // Get encryption key from environment
    const keyString = this.configService.get<string>('WHATSAPP_TOKEN_ENCRYPTION_KEY');
    if (keyString) {
      this.encryptionKey = Buffer.from(keyString, 'hex');
    } else {
      this.logger.warn('WHATSAPP_TOKEN_ENCRYPTION_KEY not set, using default key (NOT SAFE FOR PRODUCTION)');
      this.encryptionKey = crypto.scryptSync('default-dev-key', 'salt', 32);
    }
  }

  /**
   * Get Meta App credentials from environment
   */
  private getMetaCredentials() {
    const appId = this.configService.get<string>('META_APP_ID');
    const appSecret = this.configService.get<string>('META_APP_SECRET');
    const redirectUri = this.configService.get<string>('META_OAUTH_REDIRECT_URI');

    if (!appId || !appSecret) {
      throw new BadRequestException('Meta App credentials not configured');
    }

    return { appId, appSecret, redirectUri };
  }

  /**
   * Generate OAuth authorization URL for Meta login
   */
  generateAuthUrl(organizationId: string, customRedirectUri?: string): MetaOAuthUrlResponseDto {
    const { appId, redirectUri: defaultRedirectUri } = this.getMetaCredentials();
    const redirectUri = customRedirectUri || defaultRedirectUri;

    if (!redirectUri) {
      throw new BadRequestException('OAuth redirect URI not configured');
    }

    // Generate state token for CSRF protection
    const nonce = crypto.randomBytes(16).toString('hex');
    const stateData: OAuthStateData = {
      organizationId,
      nonce,
      timestamp: Date.now(),
    };
    
    // Encode state as base64
    const state = Buffer.from(JSON.stringify(stateData)).toString('base64');
    
    // Store state for validation (expires in 10 minutes)
    this.stateStore.set(state, stateData);
    setTimeout(() => this.stateStore.delete(state), 10 * 60 * 1000);

    // Build OAuth URL with required scopes for WhatsApp Business
    const scopes = [
      'whatsapp_business_management',
      'whatsapp_business_messaging',
      'business_management',
    ].join(',');

    const params = new URLSearchParams({
      client_id: appId,
      redirect_uri: redirectUri,
      scope: scopes,
      response_type: 'code',
      state,
    });

    const authUrl = `${this.oauthBaseUrl}/${this.metaApiVersion}/dialog/oauth?${params.toString()}`;

    return { authUrl, state };
  }

  /**
   * Handle OAuth callback - exchange code for access token
   */
  async handleCallback(code: string, state: string): Promise<{ organizationId: string; success: boolean }> {
    // Validate state
    const stateData = this.stateStore.get(state);
    if (!stateData) {
      throw new UnauthorizedException('Invalid or expired OAuth state');
    }

    // Remove used state
    this.stateStore.delete(state);

    // Check timestamp (10 minute expiry)
    if (Date.now() - stateData.timestamp > 10 * 60 * 1000) {
      throw new UnauthorizedException('OAuth state expired');
    }

    const { appId, appSecret, redirectUri } = this.getMetaCredentials();

    // Exchange code for access token
    try {
      const tokenResponse = await axios.get<MetaTokenResponse>(
        `${this.graphApiBaseUrl}/${this.metaApiVersion}/oauth/access_token`,
        {
          params: {
            client_id: appId,
            client_secret: appSecret,
            redirect_uri: redirectUri,
            code,
          },
        },
      );

      const { access_token, expires_in } = tokenResponse.data;
      
      // Calculate expiration date
      const expiresAt = new Date(Date.now() + expires_in * 1000);
      
      // Store token temporarily for the popup flow
      this.pendingTokens.set(stateData.organizationId, {
        accessToken: access_token,
        expiresAt,
      });

      // Auto-expire after 5 minutes
      setTimeout(() => this.pendingTokens.delete(stateData.organizationId), 5 * 60 * 1000);

      this.logger.log(`OAuth callback successful for organization ${stateData.organizationId}`);

      return {
        organizationId: stateData.organizationId,
        success: true,
      };
    } catch (error) {
      this.logger.error('Failed to exchange OAuth code for token', error.response?.data || error);
      throw new BadRequestException('Failed to exchange authorization code');
    }
  }

  /**
   * Get available WhatsApp Business assets after OAuth
   */
  async getWhatsAppAssets(organizationId: string): Promise<WhatsAppAssetsResponseDto> {
    const pendingToken = this.pendingTokens.get(organizationId);
    if (!pendingToken) {
      throw new UnauthorizedException('No pending OAuth session. Please reconnect.');
    }

    const { accessToken } = pendingToken;

    try {
      // First, get businesses the user has access to
      const businessesResponse = await axios.get(
        `${this.graphApiBaseUrl}/${this.metaApiVersion}/me/businesses`,
        {
          params: { access_token: accessToken },
        },
      );

      const businesses = businessesResponse.data.data || [];
      const whatsappBusinessAccounts: WhatsAppBusinessAccountDto[] = [];
      const phoneNumbers: Record<string, WhatsAppPhoneNumberDto[]> = {};

      // For each business, get WhatsApp Business Accounts
      for (const business of businesses) {
        try {
          const wabaResponse = await axios.get(
            `${this.graphApiBaseUrl}/${this.metaApiVersion}/${business.id}/owned_whatsapp_business_accounts`,
            {
              params: {
                access_token: accessToken,
                fields: 'id,name,account_review_status',
              },
            },
          );

          const wabas = wabaResponse.data.data || [];
          
          for (const waba of wabas) {
            whatsappBusinessAccounts.push({
              id: waba.id,
              name: waba.name,
              account_review_status: waba.account_review_status,
            });

            // Get phone numbers for this WABA
            try {
              const phoneResponse = await axios.get(
                `${this.graphApiBaseUrl}/${this.metaApiVersion}/${waba.id}/phone_numbers`,
                {
                  params: {
                    access_token: accessToken,
                    fields: 'id,display_phone_number,verified_name,quality_rating',
                  },
                },
              );

              phoneNumbers[waba.id] = (phoneResponse.data.data || []).map((phone: any) => ({
                id: phone.id,
                display_phone_number: phone.display_phone_number,
                verified_name: phone.verified_name,
                quality_rating: phone.quality_rating,
              }));
            } catch (phoneError) {
              this.logger.warn(`Failed to fetch phone numbers for WABA ${waba.id}`, phoneError.response?.data);
              phoneNumbers[waba.id] = [];
            }
          }
        } catch (wabaError) {
          this.logger.warn(`Failed to fetch WABAs for business ${business.id}`, wabaError.response?.data);
        }
      }

      // If no businesses found, try direct WABA lookup (for personal accounts)
      if (whatsappBusinessAccounts.length === 0) {
        try {
          const directWabaResponse = await axios.get(
            `${this.graphApiBaseUrl}/${this.metaApiVersion}/me/accounts`,
            {
              params: {
                access_token: accessToken,
              },
            },
          );

          this.logger.debug('Direct account lookup response', directWabaResponse.data);
        } catch (directError) {
          this.logger.debug('Direct WABA lookup failed', directError.response?.data);
        }
      }

      return {
        whatsappBusinessAccounts,
        phoneNumbers,
      };
    } catch (error) {
      this.logger.error('Failed to fetch WhatsApp assets', error.response?.data || error);
      throw new BadRequestException('Failed to fetch WhatsApp Business assets');
    }
  }

  /**
   * Complete the OAuth connection by saving selected assets
   */
  async completeConnection(
    organizationId: string,
    wabaId: string,
    phoneNumberId: string,
    displayPhoneNumber?: string,
  ): Promise<void> {
    const pendingToken = this.pendingTokens.get(organizationId);
    if (!pendingToken) {
      throw new UnauthorizedException('No pending OAuth session. Please reconnect.');
    }

    // Encrypt the access token
    const encryptedToken = this.encrypt(pendingToken.accessToken);

    // Get or create WhatsApp settings
    let settings = await this.whatsappSettingsRepository.findOne({
      where: { organizationId },
    });

    if (!settings) {
      settings = this.whatsappSettingsRepository.create({
        organizationId,
        enabled: false,
      });
    }

    // Update with OAuth credentials
    settings.wabaId = wabaId;
    settings.phoneNumberId = phoneNumberId;
    settings.accessToken = encryptedToken;
    settings.tokenExpiresAt = pendingToken.expiresAt;
    settings.displayPhoneNumber = displayPhoneNumber || null;

    await this.whatsappSettingsRepository.save(settings);

    // Clear pending token
    this.pendingTokens.delete(organizationId);

    this.logger.log(`WhatsApp OAuth connection completed for organization ${organizationId}`);
  }

  /**
   * Check if there's a pending OAuth session for an organization
   */
  hasPendingSession(organizationId: string): boolean {
    return this.pendingTokens.has(organizationId);
  }

  /**
   * Cancel pending OAuth session
   */
  cancelPendingSession(organizationId: string): void {
    this.pendingTokens.delete(organizationId);
  }

  /**
   * Encrypt a string using AES-256-GCM
   */
  private encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.encryptionAlgorithm, this.encryptionKey, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }
}
