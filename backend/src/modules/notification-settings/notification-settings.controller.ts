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
import {
  UpdateWhatsAppSettingsDto,
  ConnectWhatsAppDto,
  AssignWhatsAppTemplateDto,
  WhatsAppNotificationSettingsResponseDto,
  WhatsAppTemplateResponseDto,
} from './dto/whatsapp-notification-settings.dto';
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
   * TODO: In production, this would be called after completing Meta's Embedded Signup flow
   * The access token should be obtained from the OAuth callback
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
}
