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
import { WhatsAppBusinessTemplateService } from './whatsapp-business-template.service';
import {
  UpdateWhatsAppSettingsDto,
  ConnectWhatsAppDto,
  AssignWhatsAppTemplateDto,
  WhatsAppNotificationSettingsResponseDto,
  WhatsAppTemplateResponseDto,
} from './dto/whatsapp-notification-settings.dto';
import {
  UpdateSmsSettingsDto,
  ConnectSmsDto,
  SmsNotificationSettingsResponseDto,
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

  /**
   * Assign a WhatsApp template to an event type
   */
  @Post('whatsapp/templates')
  @ApiOperation({ summary: 'Assign WhatsApp template to event type' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiHeader({ name: 'x-organization-id', description: 'Organization ID', required: true })
  @ApiResponse({
    status: 201,
    description: 'Template assigned successfully',
    type: WhatsAppTemplateResponseDto,
  })
  async assignTemplate(
    @Param('orgId') orgId: string,
    @Headers('x-organization-id') headerOrgId: string,
    @Body() dto: AssignWhatsAppTemplateDto,
  ): Promise<WhatsAppTemplateResponseDto> {
    const organizationId = orgId || headerOrgId;
    return this.notificationSettingsService.assignTemplate(organizationId, dto);
  }

  /**
   * Delete a template assignment
   */
  @Delete('whatsapp/templates/:templateId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete template assignment' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiParam({ name: 'templateId', description: 'Template ID' })
  @ApiHeader({ name: 'x-organization-id', description: 'Organization ID', required: true })
  @ApiResponse({
    status: 204,
    description: 'Template deleted successfully',
  })
  async deleteTemplate(
    @Param('orgId') orgId: string,
    @Param('templateId') templateId: string,
    @Headers('x-organization-id') headerOrgId: string,
  ): Promise<void> {
    const organizationId = orgId || headerOrgId;
    return this.notificationSettingsService.deleteTemplate(organizationId, templateId);
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
    
    // Link it to the local event type
    await this.whatsappBusinessTemplateService.createOrUpdateLocalTemplate(
      organizationId,
      dto.eventType,
      templateName,
      dto.language,
      false,
    );
    
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

  /**
   * Link an existing Meta template to a local event type
   */
  @Post('whatsapp/business-templates/link')
  @ApiOperation({ summary: 'Link existing Meta template to event type' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiHeader({ name: 'x-organization-id', description: 'Organization ID', required: true })
  @ApiResponse({
    status: 200,
    description: 'Template linked successfully',
    type: WhatsAppTemplateResponseDto,
  })
  async linkTemplateToEvent(
    @Param('orgId') orgId: string,
    @Headers('x-organization-id') headerOrgId: string,
    @Body() dto: LinkTemplateToEventDto,
  ): Promise<WhatsAppTemplateResponseDto> {
    const organizationId = orgId || headerOrgId;
    const template = await this.whatsappBusinessTemplateService.createOrUpdateLocalTemplate(
      organizationId,
      dto.eventType,
      dto.templateName,
      dto.languageCode,
      false,
    );
    
    return {
      id: template.id,
      eventType: template.eventType,
      templateName: template.templateName,
      languageCode: template.languageCode,
      status: template.status,
    };
  }

  // ==================== SMS Settings Endpoints ====================

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
    return this.notificationSettingsService.getSmsSettings(organizationId);
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
    return this.notificationSettingsService.updateSmsSettings(organizationId, dto);
  }

  /**
   * Connect Twilio SMS
   * 
   * This endpoint stores the Twilio credentials for sending SMS.
   */
  @Post('sms/connect')
  @ApiOperation({ summary: 'Connect Twilio SMS' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiHeader({ name: 'x-organization-id', description: 'Organization ID', required: true })
  @ApiResponse({
    status: 200,
    description: 'Twilio SMS connected successfully',
    type: SmsNotificationSettingsResponseDto,
  })
  async connectSms(
    @Param('orgId') orgId: string,
    @Headers('x-organization-id') headerOrgId: string,
    @Body() dto: ConnectSmsDto,
  ): Promise<SmsNotificationSettingsResponseDto> {
    const organizationId = orgId || headerOrgId;
    return this.notificationSettingsService.connectSms(organizationId, dto);
  }

  /**
   * Disconnect Twilio SMS
   */
  @Post('sms/disconnect')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Disconnect Twilio SMS' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiHeader({ name: 'x-organization-id', description: 'Organization ID', required: true })
  @ApiResponse({
    status: 200,
    description: 'Twilio SMS disconnected successfully',
    type: SmsNotificationSettingsResponseDto,
  })
  async disconnectSms(
    @Param('orgId') orgId: string,
    @Headers('x-organization-id') headerOrgId: string,
  ): Promise<SmsNotificationSettingsResponseDto> {
    const organizationId = orgId || headerOrgId;
    return this.notificationSettingsService.disconnectSms(organizationId);
  }
}
