import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  UseGuards,
  Headers,
  Res,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiHeader,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { MetaOAuthService } from './meta-oauth.service';
import { NotificationSettingsService } from './notification-settings.service';
import {
  MetaOAuthUrlResponseDto,
  MetaOAuthCallbackDto,
  CompleteMetaOAuthDto,
  WhatsAppAssetsResponseDto,
} from './dto/meta-oauth.dto';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { OrgRolesGuard } from '../auth/guards/org-roles.guard';
import { OrgAdminOnly } from '../auth/decorators/org-roles.decorator';
import { ConfigService } from '@nestjs/config';

@ApiTags('meta-oauth')
@Controller('auth/meta')
export class MetaOAuthController {
  constructor(
    private readonly metaOAuthService: MetaOAuthService,
    private readonly notificationSettingsService: NotificationSettingsService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Generate OAuth URL for Meta login popup
   */
  @Get('organizations/:orgId/oauth-url')
  @UseGuards(ClerkAuthGuard, OrgRolesGuard)
  @OrgAdminOnly()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate Meta OAuth URL for WhatsApp connection' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiHeader({ name: 'x-organization-id', description: 'Organization ID', required: true })
  @ApiResponse({
    status: 200,
    description: 'OAuth URL generated',
    type: MetaOAuthUrlResponseDto,
  })
  getOAuthUrl(
    @Param('orgId') orgId: string,
    @Headers('x-organization-id') headerOrgId: string,
    @Query('redirectUri') customRedirectUri?: string,
  ): MetaOAuthUrlResponseDto {
    const organizationId = orgId || headerOrgId;
    return this.metaOAuthService.generateAuthUrl(organizationId, customRedirectUri);
  }

  /**
   * OAuth callback handler - receives authorization code from Meta
   * This endpoint is called by Meta after user grants permissions
   */
  @Get('callback')
  @ApiOperation({ summary: 'Meta OAuth callback handler' })
  @ApiQuery({ name: 'code', description: 'Authorization code from Meta' })
  @ApiQuery({ name: 'state', description: 'State parameter for CSRF protection' })
  @ApiResponse({
    status: 302,
    description: 'Redirects to frontend with success/error status',
  })
  async handleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Query('error_description') errorDescription: string,
    @Res() res: Response,
  ) {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000');

    // Redirect to popup callback page (not the main settings page)
    const callbackPath = '/auth/meta/callback';

    // Handle error from Meta
    if (error) {
      const errorUrl = new URL(callbackPath, frontendUrl);
      errorUrl.searchParams.set('oauth_error', error);
      errorUrl.searchParams.set('oauth_error_description', errorDescription || 'Unknown error');
      return res.redirect(errorUrl.toString());
    }

    // Handle missing code
    if (!code || !state) {
      const errorUrl = new URL(callbackPath, frontendUrl);
      errorUrl.searchParams.set('oauth_error', 'missing_params');
      errorUrl.searchParams.set('oauth_error_description', 'Missing code or state parameter');
      return res.redirect(errorUrl.toString());
    }

    try {
      const result = await this.metaOAuthService.handleCallback(code, state);
      
      // Redirect to popup callback page with success
      const successUrl = new URL(callbackPath, frontendUrl);
      successUrl.searchParams.set('oauth_success', 'true');
      successUrl.searchParams.set('oauth_org_id', result.organizationId);
      
      return res.redirect(successUrl.toString());
    } catch (err) {
      const errorUrl = new URL(callbackPath, frontendUrl);
      errorUrl.searchParams.set('oauth_error', 'callback_failed');
      errorUrl.searchParams.set('oauth_error_description', err.message || 'Failed to process OAuth callback');
      return res.redirect(errorUrl.toString());
    }
  }

  /**
   * Get available WhatsApp Business assets after OAuth
   */
  @Get('organizations/:orgId/whatsapp-assets')
  @UseGuards(ClerkAuthGuard, OrgRolesGuard)
  @OrgAdminOnly()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get available WhatsApp Business assets after OAuth' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiHeader({ name: 'x-organization-id', description: 'Organization ID', required: true })
  @ApiResponse({
    status: 200,
    description: 'Available WhatsApp Business assets',
    type: WhatsAppAssetsResponseDto,
  })
  async getWhatsAppAssets(
    @Param('orgId') orgId: string,
    @Headers('x-organization-id') headerOrgId: string,
  ): Promise<WhatsAppAssetsResponseDto> {
    const organizationId = orgId || headerOrgId;
    return this.metaOAuthService.getWhatsAppAssets(organizationId);
  }

  /**
   * Complete OAuth connection with selected WhatsApp assets
   */
  @Post('organizations/:orgId/complete')
  @UseGuards(ClerkAuthGuard, OrgRolesGuard)
  @OrgAdminOnly()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Complete WhatsApp OAuth connection with selected assets' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiHeader({ name: 'x-organization-id', description: 'Organization ID', required: true })
  @ApiResponse({
    status: 200,
    description: 'Connection completed successfully',
  })
  async completeConnection(
    @Param('orgId') orgId: string,
    @Headers('x-organization-id') headerOrgId: string,
    @Body() dto: CompleteMetaOAuthDto,
  ) {
    const organizationId = orgId || headerOrgId;
    
    await this.metaOAuthService.completeConnection(
      organizationId,
      dto.wabaId,
      dto.phoneNumberId,
      dto.displayPhoneNumber,
    );

    return this.notificationSettingsService.getWhatsAppSettings(organizationId);
  }

  /**
   * Check if there's a pending OAuth session
   */
  @Get('organizations/:orgId/pending-session')
  @UseGuards(ClerkAuthGuard, OrgRolesGuard)
  @OrgAdminOnly()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check if there is a pending OAuth session' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiHeader({ name: 'x-organization-id', description: 'Organization ID', required: true })
  @ApiResponse({
    status: 200,
    description: 'Pending session status',
  })
  hasPendingSession(
    @Param('orgId') orgId: string,
    @Headers('x-organization-id') headerOrgId: string,
  ): { hasPendingSession: boolean } {
    const organizationId = orgId || headerOrgId;
    return {
      hasPendingSession: this.metaOAuthService.hasPendingSession(organizationId),
    };
  }

  /**
   * Cancel pending OAuth session
   */
  @Post('organizations/:orgId/cancel-session')
  @UseGuards(ClerkAuthGuard, OrgRolesGuard)
  @OrgAdminOnly()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel pending OAuth session' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiHeader({ name: 'x-organization-id', description: 'Organization ID', required: true })
  @ApiResponse({
    status: 200,
    description: 'Session cancelled',
  })
  cancelPendingSession(
    @Param('orgId') orgId: string,
    @Headers('x-organization-id') headerOrgId: string,
  ): { success: boolean } {
    const organizationId = orgId || headerOrgId;
    this.metaOAuthService.cancelPendingSession(organizationId);
    return { success: true };
  }
}
