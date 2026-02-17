import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import {
  OrganizationWhatsAppSettings,
} from './entities/organization-whatsapp-settings.entity';
import { WhatsAppEventType, WhatsAppTemplateStatus } from './dto/whatsapp-notification-settings.dto';

/**
 * WhatsApp Business Template Category
 */
export enum WhatsAppTemplateCategory {
  UTILITY = 'UTILITY',
  MARKETING = 'MARKETING',
  AUTHENTICATION = 'AUTHENTICATION',
}

/**
 * WhatsApp template component type
 */
export interface WhatsAppTemplateComponent {
  type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS';
  format?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';
  text?: string;
  example?: {
    header_text?: string[];
    body_text?: string[][];
  };
  buttons?: Array<{
    type: 'PHONE_NUMBER' | 'URL' | 'QUICK_REPLY';
    text: string;
    phone_number?: string;
    url?: string;
  }>;
}

/**
 * Meta Graph API response for template
 */
export interface MetaTemplateResponse {
  id: string;
  name: string;
  status: 'APPROVED' | 'PENDING' | 'REJECTED' | 'DISABLED';
  category: string;
  language: string;
  components: WhatsAppTemplateComponent[];
  rejected_reason?: string;
  quality_score?: {
    score: string;
    date: number;
  };
}

/**
 * Meta Graph API response for template list
 */
export interface MetaTemplatesListResponse {
  data: MetaTemplateResponse[];
  paging?: {
    cursors: {
      before: string;
      after: string;
    };
    next?: string;
  };
}

/**
 * DTO for creating a WhatsApp template via Meta API
 */
export interface CreateWhatsAppBusinessTemplateDto {
  name: string;
  language: string;
  category: WhatsAppTemplateCategory;
  components: WhatsAppTemplateComponent[];
}

/**
 * DTO for updating a WhatsApp template via Meta API
 */
export interface UpdateWhatsAppBusinessTemplateDto {
  components: WhatsAppTemplateComponent[];
}

/**
 * Response for WhatsApp Business template
 */
export interface WhatsAppBusinessTemplateDto {
  id: string;
  name: string;
  status: string;
  category: string;
  language: string;
  components: WhatsAppTemplateComponent[];
  rejectedReason?: string;
  qualityScore?: string;
  localEventType?: WhatsAppEventType;
}

@Injectable()
export class WhatsAppBusinessTemplateService {
  private readonly logger = new Logger(WhatsAppBusinessTemplateService.name);
  private readonly encryptionKey: Buffer;
  private readonly encryptionAlgorithm = 'aes-256-gcm';
  private readonly apiVersion = 'v22.0';
  private readonly baseUrl = 'https://graph.facebook.com';

  constructor(
    @InjectRepository(OrganizationWhatsAppSettings)
    private readonly whatsappSettingsRepository: Repository<OrganizationWhatsAppSettings>,
    private readonly configService: ConfigService,
  ) {
    const keyString = this.configService.get<string>('WHATSAPP_TOKEN_ENCRYPTION_KEY');
    if (keyString) {
      this.encryptionKey = Buffer.from(keyString, 'hex');
    } else {
      this.logger.warn('WHATSAPP_TOKEN_ENCRYPTION_KEY not set, using default key (NOT SAFE FOR PRODUCTION)');
      this.encryptionKey = crypto.scryptSync('default-dev-key', 'salt', 32);
    }
  }

  /**
   * Decrypt a string encrypted with AES-256-GCM
   */
  private decrypt(encryptedText: string): string {
    const parts = encryptedText.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted text format');
    }

    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];

    const decipher = crypto.createDecipheriv(this.encryptionAlgorithm, this.encryptionKey, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Get WhatsApp settings for an organization
   */
  private async getWhatsAppSettings(organizationId: string): Promise<OrganizationWhatsAppSettings> {
    const settings = await this.whatsappSettingsRepository.findOne({
      where: { organizationId },
    });

    if (!settings || !settings.wabaId || !settings.accessToken) {
      throw new BadRequestException('WhatsApp Business not connected for this organization');
    }

    return settings;
  }

  /**
   * Get decrypted access token
   */
  private async getAccessToken(organizationId: string): Promise<{ accessToken: string; wabaId: string }> {
    const settings = await this.getWhatsAppSettings(organizationId);
    return {
      accessToken: this.decrypt(settings.accessToken!),
      wabaId: settings.wabaId!,
    };
  }

  /**
   * List all message templates from Meta WhatsApp Business API
   */
  async listTemplatesFromMeta(organizationId: string): Promise<WhatsAppBusinessTemplateDto[]> {
    const { accessToken, wabaId } = await this.getAccessToken(organizationId);

    const url = `${this.baseUrl}/${this.apiVersion}/${wabaId}/message_templates`;

    this.logger.debug(`Fetching WhatsApp templates from Meta for organization ${organizationId}`);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        this.logger.error('Failed to fetch templates from Meta', data);
        throw new BadRequestException(data.error?.message || 'Failed to fetch templates from WhatsApp Business');
      }

      const templatesResponse = data as MetaTemplatesListResponse;

      return templatesResponse.data.map((template) => {
        return {
          id: template.id,
          name: template.name,
          status: template.status,
          category: template.category,
          language: template.language,
          components: template.components,
          rejectedReason: template.rejected_reason,
          qualityScore: template.quality_score?.score,
        };
      });
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('Error fetching templates from Meta', error);
      throw new BadRequestException('Failed to communicate with WhatsApp Business API');
    }
  }

  /**
   * Get a specific template from Meta by name
   */
  async getTemplateFromMeta(organizationId: string, templateName: string): Promise<WhatsAppBusinessTemplateDto | null> {
    const { accessToken, wabaId } = await this.getAccessToken(organizationId);

    const url = `${this.baseUrl}/${this.apiVersion}/${wabaId}/message_templates?name=${encodeURIComponent(templateName)}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        this.logger.error('Failed to fetch template from Meta', data);
        return null;
      }

      const templatesResponse = data as MetaTemplatesListResponse;
      const template = templatesResponse.data[0];

      if (!template) {
        return null;
      }

      return {
        id: template.id,
        name: template.name,
        status: template.status,
        category: template.category,
        language: template.language,
        components: template.components,
        rejectedReason: template.rejected_reason,
        qualityScore: template.quality_score?.score,
      };
    } catch (error) {
      this.logger.error('Error fetching template from Meta', error);
      return null;
    }
  }

  /**
   * Create a new message template in Meta WhatsApp Business
   * The template is automatically submitted for approval when created
   */
  async createTemplateInMeta(
    organizationId: string,
    dto: CreateWhatsAppBusinessTemplateDto,
  ): Promise<WhatsAppBusinessTemplateDto> {
    const { accessToken, wabaId } = await this.getAccessToken(organizationId);

    const url = `${this.baseUrl}/${this.apiVersion}/${wabaId}/message_templates`;

    const payload = {
      name: dto.name,
      language: dto.language,
      category: dto.category,
      components: dto.components,
    };

    this.logger.debug(`Creating WhatsApp template in Meta: ${dto.name}`);
    this.logger.debug(`Request URL: ${url}`);
    this.logger.debug(`Request payload: ${JSON.stringify(payload, null, 2)}`);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        this.logger.error('Failed to create template in Meta', JSON.stringify(data, null, 2));
        this.logger.error('Request payload was:', JSON.stringify(payload, null, 2));
        const errorMessage = data.error?.error_user_msg || data.error?.message || 'Failed to create template in WhatsApp Business';
        const errorDetails = data.error?.error_data?.details || '';
        throw new BadRequestException(`${errorMessage}${errorDetails ? ': ' + errorDetails : ''}`);
      }

      this.logger.log(`WhatsApp template created: ${dto.name} (ID: ${data.id})`);

      // Return the created template info
      return {
        id: data.id,
        name: dto.name,
        status: data.status || 'PENDING',
        category: dto.category,
        language: dto.language,
        components: dto.components,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('Error creating template in Meta', error);
      throw new BadRequestException('Failed to communicate with WhatsApp Business API');
    }
  }

  /**
   * Update an existing message template in Meta
   * Note: Only certain fields can be updated after approval
   */
  async updateTemplateInMeta(
    organizationId: string,
    templateId: string,
    dto: UpdateWhatsAppBusinessTemplateDto,
  ): Promise<WhatsAppBusinessTemplateDto> {
    const { accessToken } = await this.getAccessToken(organizationId);

    const url = `${this.baseUrl}/${this.apiVersion}/${templateId}`;

    const payload = {
      components: dto.components,
    };

    this.logger.debug(`Updating WhatsApp template in Meta: ${templateId}`);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        this.logger.error('Failed to update template in Meta', data);
        throw new BadRequestException(data.error?.message || 'Failed to update template in WhatsApp Business');
      }

      this.logger.log(`WhatsApp template updated: ${templateId}`);

      // Fetch the updated template
      const templates = await this.listTemplatesFromMeta(organizationId);
      const updated = templates.find(t => t.id === templateId);

      if (!updated) {
        throw new NotFoundException('Template not found after update');
      }

      return updated;
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Error updating template in Meta', error);
      throw new BadRequestException('Failed to communicate with WhatsApp Business API');
    }
  }

  /**
   * Delete a message template from Meta WhatsApp Business
   */
  async deleteTemplateFromMeta(
    organizationId: string,
    templateName: string,
  ): Promise<void> {
    const { accessToken, wabaId } = await this.getAccessToken(organizationId);

    const url = `${this.baseUrl}/${this.apiVersion}/${wabaId}/message_templates?name=${encodeURIComponent(templateName)}`;

    this.logger.debug(`Deleting WhatsApp template from Meta: ${templateName}`);

    try {
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        this.logger.error('Failed to delete template from Meta', data);
        throw new BadRequestException(data.error?.message || 'Failed to delete template from WhatsApp Business');
      }

      this.logger.log(`WhatsApp template deleted: ${templateName}`);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('Error deleting template from Meta', error);
      throw new BadRequestException('Failed to communicate with WhatsApp Business API');
    }
  }

  /**
   * Sync templates from Meta - returns list of templates
   */
  async syncTemplatesFromMeta(organizationId: string): Promise<{
    synced: number;
    templates: WhatsAppBusinessTemplateDto[];
  }> {
    const templates = await this.listTemplatesFromMeta(organizationId);

    return {
      synced: templates.length,
      templates,
    };
  }

  /**
   * Generate default appointment templates based on message template type
   */
  generateDefaultTemplateComponents(
    eventType: WhatsAppEventType,
    messageContent: string,
  ): WhatsAppTemplateComponent[] {
    // Use named variables - Meta WhatsApp Business API supports named parameters
    // Format: {{variable_name}} with example values provided
    
    // Define placeholders with their Meta-compatible names and example values
    const placeholderDefinitions: Record<string, { metaName: string; example: string }> = {
      '{{clientName}}': { metaName: 'client_name', example: 'John' },
      '{{serviceName}}': { metaName: 'service_name', example: 'Haircut' },
      '{{appointmentDate}}': { metaName: 'appointment_date', example: 'January 15, 2026' },
      '{{appointmentTime}}': { metaName: 'appointment_time', example: '10:00 AM' },
      '{{providerName}}': { metaName: 'provider_name', example: 'Dr. Smith' },
      '{{organizationName}}': { metaName: 'organization_name', example: 'Best Clinic' },
      '{{appointmentLink}}': { metaName: 'appointment_link', example: 'https://example.com/apt/123' },
      '{{confirmationLink}}': { metaName: 'confirmation_link', example: 'https://example.com/confirm/123' },
    };

    // Convert placeholders to Meta's named variable format
    let convertedContent = messageContent;
    const usedExamples: { name: string; example: string }[] = [];

    for (const [placeholder, { metaName, example }] of Object.entries(placeholderDefinitions)) {
      if (convertedContent.includes(placeholder)) {
        // Replace with Meta's named variable format: {{variable_name}}
        convertedContent = convertedContent.replace(
          new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'),
          `{{${metaName}}}`
        );
        usedExamples.push({ name: metaName, example });
      }
    }

    // Build example object with named parameters
    const exampleParams = usedExamples.length > 0 
      ? { body_text: [usedExamples.map(e => e.example)] }
      : undefined;

    const components: WhatsAppTemplateComponent[] = [
      {
        type: 'BODY',
        text: convertedContent,
        example: exampleParams,
      },
    ];

    return components;
  }

  /**
   * Get template name for event type
   */
  getTemplateNameForEventType(eventType: WhatsAppEventType, organizationId: string): string {
    // Use a prefix to avoid collision with other businesses
    const prefix = organizationId.substring(0, 8).toLowerCase().replace(/[^a-z0-9]/g, '');
    
    switch (eventType) {
      case WhatsAppEventType.APPOINTMENT_CREATED:
        return `appt_created_${prefix}`;
      case WhatsAppEventType.APPOINTMENT_REMINDER:
        return `appt_reminder_${prefix}`;
      case WhatsAppEventType.APPOINTMENT_CANCELED:
        return `appt_canceled_${prefix}`;
      case WhatsAppEventType.APPOINTMENT_RESCHEDULED:
        return `appt_rescheduled_${prefix}`;
      default:
        return `appt_notification_${prefix}`;
    }
  }
}
