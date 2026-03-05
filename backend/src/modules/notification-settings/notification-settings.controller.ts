import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Headers,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiHeader,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { NotificationSettingsService } from './notification-settings.service';
import { SmsSettingsService } from './sms-settings.service';
import { WhatsAppBusinessTemplateService } from './whatsapp-business-template.service';
import {
  UpdateWhatsAppSettingsDto,
  ConnectWhatsAppDto,
  WhatsAppNotificationSettingsResponseDto,
  WhatsAppTemplateResponseDto,
} from './dto/whatsapp-notification-settings.dto';
import {
  UpdateSmsSettingsDto,
  ConnectSmsDto,
  SmsNotificationSettingsResponseDto,
  CreateSmsTemplateDto,
  UpdateSmsTemplateDto,
  SmsTemplateResponseDto,
  SmsTemplatesListResponseDto,
} from './dto/sms-notification-settings.dto';
import {
  CreateWhatsAppBusinessTemplateDto,
  UpdateWhatsAppBusinessTemplateDto,
  CreateTemplateFromMessageDto,
  LinkTemplateToEventDto,
  WhatsAppBusinessTemplateResponseDto,
  WhatsAppBusinessTemplatesListResponseDto,
  SyncTemplatesResponseDto,
} from './dto/whatsapp-business-template.dto';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { OrgRolesGuard } from '../auth/guards/org-roles.guard';
import { OrgAdminOnly } from '../auth/decorators/org-roles.decorator';

@ApiTags('notification-settings')
@Controller('organizations/:orgId/notification-settings')
@UseGuards(ClerkAuthGuard, OrgRolesGuard)
@OrgAdminOnly()
@ApiBearerAuth()
export class NotificationSettingsController {
  constructor(
    private readonly notificationSettingsService: NotificationSettingsService,
    private readonly smsSettingsService: SmsSettingsService,
    private readonly whatsappBusinessTemplateService: WhatsAppBusinessTemplateService,
  ) {}

  /**
   * Get WhatsApp notification settings for an organization
   */
  @Get('whatsapp')
  @ApiOperation({ summary: 'Get WhatsApp notification settings' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiHeader({ name: 'x-organization-id', description: 'Organization ID', required: true })
  @ApiResponse({
    status: 200,
    description: 'WhatsApp notification settings',
    type: WhatsAppNotificationSettingsResponseDto,
  })
  async getWhatsAppSettings(
    @Param('orgId') orgId: string,
    @Headers('x-organization-id') headerOrgId: string,
  ): Promise<WhatsAppNotificationSettingsResponseDto> {
    // Use orgId from path, validate it matches header
    const organizationId = orgId || headerOrgId;
    return this.notificationSettingsService.getWhatsAppSettings(organizationId);
  }

  /**
   * Update WhatsApp enabled status and notification parameters
   */
  @Put('whatsapp')
  @ApiOperation({ summary: 'Update WhatsApp settings (enable/disable and parameters)' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiHeader({ name: 'x-organization-id', description: 'Organization ID', required: true })
  @ApiResponse({
    status: 200,
    description: 'Updated WhatsApp notification settings',
    type: WhatsAppNotificationSettingsResponseDto,
  })
  async updateWhatsAppSettings(
    @Param('orgId') orgId: string,
    @Headers('x-organization-id') headerOrgId: string,
    @Body() dto: UpdateWhatsAppSettingsDto,
  ): Promise<WhatsAppNotificationSettingsResponseDto> {
    const organizationId = orgId || headerOrgId;
    return this.notificationSettingsService.updateWhatsAppSettings(organizationId, dto);
  }

  /**
   * Connect WhatsApp Business Account
   * 
   * This endpoint is called after completing Meta's Embedded Signup flow.
   * The access token should be obtained from the OAuth callback.
   */
  @Post('whatsapp/connect')
  @ApiOperation({ summary: 'Connect WhatsApp Business Account' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiHeader({ name: 'x-organization-id', description: 'Organization ID', required: true })
  @ApiResponse({
    status: 200,
    description: 'WhatsApp Business connected successfully',
    type: WhatsAppNotificationSettingsResponseDto,
  })
  async connectWhatsApp(
    @Param('orgId') orgId: string,
    @Headers('x-organization-id') headerOrgId: string,
    @Body() dto: ConnectWhatsAppDto,
  ): Promise<WhatsAppNotificationSettingsResponseDto> {
    const organizationId = orgId || headerOrgId;
    return this.notificationSettingsService.connectWhatsApp(organizationId, dto);
  }

  /**
   * Disconnect WhatsApp Business Account
   */
  @Post('whatsapp/disconnect')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Disconnect WhatsApp Business Account' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiHeader({ name: 'x-organization-id', description: 'Organization ID', required: true })
  @ApiResponse({
    status: 200,
    description: 'WhatsApp Business disconnected successfully',
    type: WhatsAppNotificationSettingsResponseDto,
  })
  async disconnectWhatsApp(
    @Param('orgId') orgId: string,
    @Headers('x-organization-id') headerOrgId: string,
  ): Promise<WhatsAppNotificationSettingsResponseDto> {
    const organizationId = orgId || headerOrgId;
    return this.notificationSettingsService.disconnectWhatsApp(organizationId);
  }

  // ==================== WhatsApp Business Templates (Meta Graph API) ====================

  /**
   * List all WhatsApp Business templates from Meta
   */
  @Get('whatsapp/business-templates')
  @ApiOperation({ summary: 'List WhatsApp Business templates from Meta' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiHeader({ name: 'x-organization-id', description: 'Organization ID', required: true })
  @ApiResponse({
    status: 200,
    description: 'List of WhatsApp Business templates',
    type: WhatsAppBusinessTemplatesListResponseDto,
  })
  async listBusinessTemplates(
    @Param('orgId') orgId: string,
    @Headers('x-organization-id') headerOrgId: string,
  ): Promise<WhatsAppBusinessTemplatesListResponseDto> {
    const organizationId = orgId || headerOrgId;
    try {
      const templates = await this.whatsappBusinessTemplateService.listTemplatesFromMeta(organizationId);
      return { templates, isConnected: true };
    } catch (error) {
      return { templates: [], isConnected: false };
    }
  }

  /**
   * Create a new WhatsApp Business template in Meta
   */
  @Post('whatsapp/business-templates')
  @ApiOperation({ summary: 'Create WhatsApp Business template in Meta' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiHeader({ name: 'x-organization-id', description: 'Organization ID', required: true })
  @ApiResponse({
    status: 201,
    description: 'Template created successfully',
    type: WhatsAppBusinessTemplateResponseDto,
  })
  async createBusinessTemplate(
    @Param('orgId') orgId: string,
    @Headers('x-organization-id') headerOrgId: string,
    @Body() dto: CreateWhatsAppBusinessTemplateDto,
  ): Promise<WhatsAppBusinessTemplateResponseDto> {
    const organizationId = orgId || headerOrgId;
    return this.whatsappBusinessTemplateService.createTemplateInMeta(organizationId, dto);
  }

  /**
   * Create a WhatsApp Business template from local message content
   * This auto-generates the template structure and creates it in Meta
   */
  @Post('whatsapp/business-templates/from-message')
  @ApiOperation({ summary: 'Create WhatsApp template from message content' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiHeader({ name: 'x-organization-id', description: 'Organization ID', required: true })
  @ApiResponse({
    status: 201,
    description: 'Template created successfully',
    type: WhatsAppBusinessTemplateResponseDto,
  })
  async createBusinessTemplateFromMessage(
    @Param('orgId') orgId: string,
    @Headers('x-organization-id') headerOrgId: string,
    @Body() dto: CreateTemplateFromMessageDto,
  ): Promise<WhatsAppBusinessTemplateResponseDto> {
    const organizationId = orgId || headerOrgId;
    
    // Generate template name if not provided
    const templateName = dto.templateName || 
      this.whatsappBusinessTemplateService.getTemplateNameForEventType(dto.eventType, organizationId);
    
    // Generate components from message content
    const components = this.whatsappBusinessTemplateService.generateDefaultTemplateComponents(
      dto.eventType,
      dto.messageContent,
    );
    
    // Create the template in Meta
    const template = await this.whatsappBusinessTemplateService.createTemplateInMeta(organizationId, {
      name: templateName,
      language: dto.language,
      category: 'UTILITY' as any,
      components,
    });
    
    return template;
  }

  /**
   * Update a WhatsApp Business template in Meta
   */
  @Put('whatsapp/business-templates/:templateId')
  @ApiOperation({ summary: 'Update WhatsApp Business template in Meta' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiParam({ name: 'templateId', description: 'Meta Template ID' })
  @ApiHeader({ name: 'x-organization-id', description: 'Organization ID', required: true })
  @ApiResponse({
    status: 200,
    description: 'Template updated successfully',
    type: WhatsAppBusinessTemplateResponseDto,
  })
  async updateBusinessTemplate(
    @Param('orgId') orgId: string,
    @Param('templateId') templateId: string,
    @Headers('x-organization-id') headerOrgId: string,
    @Body() dto: UpdateWhatsAppBusinessTemplateDto,
  ): Promise<WhatsAppBusinessTemplateResponseDto> {
    const organizationId = orgId || headerOrgId;
    return this.whatsappBusinessTemplateService.updateTemplateInMeta(organizationId, templateId, dto);
  }

  /**
   * Delete a WhatsApp Business template from Meta
   */
  @Delete('whatsapp/business-templates/:templateName')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete WhatsApp Business template from Meta' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiParam({ name: 'templateName', description: 'Template name' })
  @ApiHeader({ name: 'x-organization-id', description: 'Organization ID', required: true })
  @ApiResponse({
    status: 204,
    description: 'Template deleted successfully',
  })
  async deleteBusinessTemplate(
    @Param('orgId') orgId: string,
    @Param('templateName') templateName: string,
    @Headers('x-organization-id') headerOrgId: string,
  ): Promise<void> {
    const organizationId = orgId || headerOrgId;
    return this.whatsappBusinessTemplateService.deleteTemplateFromMeta(organizationId, templateName);
  }

  /**
   * Sync templates from Meta to local database
   * Updates local template statuses based on Meta API
   */
  @Post('whatsapp/business-templates/sync')
  @ApiOperation({ summary: 'Sync WhatsApp templates from Meta' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiHeader({ name: 'x-organization-id', description: 'Organization ID', required: true })
  @ApiResponse({
    status: 200,
    description: 'Templates synced successfully',
    type: SyncTemplatesResponseDto,
  })
  async syncBusinessTemplates(
    @Param('orgId') orgId: string,
    @Headers('x-organization-id') headerOrgId: string,
  ): Promise<SyncTemplatesResponseDto> {
    const organizationId = orgId || headerOrgId;
    return this.whatsappBusinessTemplateService.syncTemplatesFromMeta(organizationId);
  }

  // ==================== SMS (Verimor) Settings ====================

  /**
   * Get SMS notification settings for an organization
   */
  @Get('sms')
  @ApiOperation({ summary: 'Get SMS notification settings' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiHeader({ name: 'x-organization-id', description: 'Organization ID', required: true })
  @ApiResponse({
    status: 200,
    description: 'SMS notification settings',
    type: SmsNotificationSettingsResponseDto,
  })
  async getSmsSettings(
    @Param('orgId') orgId: string,
    @Headers('x-organization-id') headerOrgId: string,
  ): Promise<SmsNotificationSettingsResponseDto> {
    const organizationId = orgId || headerOrgId;
    return this.smsSettingsService.getSmsSettings(organizationId);
  }

  /**
   * Update SMS enabled status and notification parameters
   */
  @Put('sms')
  @ApiOperation({ summary: 'Update SMS settings (enable/disable and parameters)' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiHeader({ name: 'x-organization-id', description: 'Organization ID', required: true })
  @ApiResponse({
    status: 200,
    description: 'Updated SMS notification settings',
    type: SmsNotificationSettingsResponseDto,
  })
  async updateSmsSettings(
    @Param('orgId') orgId: string,
    @Headers('x-organization-id') headerOrgId: string,
    @Body() dto: UpdateSmsSettingsDto,
  ): Promise<SmsNotificationSettingsResponseDto> {
    const organizationId = orgId || headerOrgId;
    return this.smsSettingsService.updateSmsSettings(organizationId, dto);
  }

  /**
   * Connect custom Verimor credentials
   */
  @Post('sms/connect')
  @ApiOperation({ summary: 'Connect custom Verimor credentials' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiHeader({ name: 'x-organization-id', description: 'Organization ID', required: true })
  @ApiResponse({
    status: 200,
    description: 'Verimor credentials connected successfully',
    type: SmsNotificationSettingsResponseDto,
  })
  async connectSms(
    @Param('orgId') orgId: string,
    @Headers('x-organization-id') headerOrgId: string,
    @Body() dto: ConnectSmsDto,
  ): Promise<SmsNotificationSettingsResponseDto> {
    const organizationId = orgId || headerOrgId;
    return this.smsSettingsService.connectSms(organizationId, dto);
  }

  /**
   * Disconnect custom Verimor credentials (revert to global)
   */
  @Post('sms/disconnect')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Disconnect custom Verimor credentials' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiHeader({ name: 'x-organization-id', description: 'Organization ID', required: true })
  @ApiResponse({
    status: 200,
    description: 'Verimor credentials disconnected',
    type: SmsNotificationSettingsResponseDto,
  })
  async disconnectSms(
    @Param('orgId') orgId: string,
    @Headers('x-organization-id') headerOrgId: string,
  ): Promise<SmsNotificationSettingsResponseDto> {
    const organizationId = orgId || headerOrgId;
    return this.smsSettingsService.disconnectSms(organizationId);
  }

  // ==================== SMS Templates ====================

  /**
   * Get all SMS templates for an organization
   */
  @Get('sms/templates')
  @ApiOperation({ summary: 'Get all SMS templates' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiHeader({ name: 'x-organization-id', description: 'Organization ID', required: true })
  @ApiResponse({
    status: 200,
    description: 'List of SMS templates',
    type: SmsTemplatesListResponseDto,
  })
  async getSmsTemplates(
    @Param('orgId') orgId: string,
    @Headers('x-organization-id') headerOrgId: string,
  ): Promise<SmsTemplatesListResponseDto> {
    const organizationId = orgId || headerOrgId;
    const templates = await this.smsSettingsService.getTemplates(organizationId);
    return { templates };
  }

  /**
   * Create a new SMS template
   */
  @Post('sms/templates')
  @ApiOperation({ summary: 'Create SMS template' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiHeader({ name: 'x-organization-id', description: 'Organization ID', required: true })
  @ApiResponse({
    status: 201,
    description: 'Template created successfully',
    type: SmsTemplateResponseDto,
  })
  async createSmsTemplate(
    @Param('orgId') orgId: string,
    @Headers('x-organization-id') headerOrgId: string,
    @Body() dto: CreateSmsTemplateDto,
  ): Promise<SmsTemplateResponseDto> {
    const organizationId = orgId || headerOrgId;
    return this.smsSettingsService.createTemplate(organizationId, dto);
  }

  /**
   * Update an SMS template
   */
  @Put('sms/templates/:templateId')
  @ApiOperation({ summary: 'Update SMS template' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiParam({ name: 'templateId', description: 'Template ID' })
  @ApiHeader({ name: 'x-organization-id', description: 'Organization ID', required: true })
  @ApiResponse({
    status: 200,
    description: 'Template updated successfully',
    type: SmsTemplateResponseDto,
  })
  async updateSmsTemplate(
    @Param('orgId') orgId: string,
    @Param('templateId') templateId: string,
    @Headers('x-organization-id') headerOrgId: string,
    @Body() dto: UpdateSmsTemplateDto,
  ): Promise<SmsTemplateResponseDto> {
    const organizationId = orgId || headerOrgId;
    return this.smsSettingsService.updateTemplate(organizationId, templateId, dto);
  }

  /**
   * Delete an SMS template
   */
  @Delete('sms/templates/:templateId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete SMS template' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiParam({ name: 'templateId', description: 'Template ID' })
  @ApiHeader({ name: 'x-organization-id', description: 'Organization ID', required: true })
  @ApiResponse({
    status: 204,
    description: 'Template deleted successfully',
  })
  async deleteSmsTemplate(
    @Param('orgId') orgId: string,
    @Param('templateId') templateId: string,
    @Headers('x-organization-id') headerOrgId: string,
  ): Promise<void> {
    const organizationId = orgId || headerOrgId;
    return this.smsSettingsService.deleteTemplate(organizationId, templateId);
  }
}
