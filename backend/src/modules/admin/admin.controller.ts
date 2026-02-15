import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  Logger,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { SystemAdminGuard } from '../auth/guards/system-admin.guard';
import {
  OrganizationQueryDto,
  UsersQueryDto,
  AppointmentsQueryDto,
} from './dto/admin-query.dto';
import {
  AdminUpdateOrganizationDto,
  AdminUpdateOrganizationSettingsDto,
  AdminCreateServiceDto,
  AdminUpdateServiceDto,
  AdminUpdateUserRoleDto,
  AdminBulkAssignProvidersDto,
} from './dto/admin-actions.dto';
import { AppointmentStatus } from '../appointments/entities/appointment.entity';
import { NotificationSettingsService } from '../notification-settings/notification-settings.service';
import {
  UpdateWhatsAppSettingsDto,
  ConnectWhatsAppDto,
} from '../notification-settings/dto/whatsapp-notification-settings.dto';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(ClerkAuthGuard, SystemAdminGuard)
@Controller('admin')
export class AdminController {
  private readonly logger = new Logger(AdminController.name);

  constructor(
    private readonly adminService: AdminService,
    private readonly notificationSettingsService: NotificationSettingsService,
  ) {}

  // ==================== Dashboard / Stats ====================

  @Get('stats')
  @ApiOperation({ summary: 'Get system-wide statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getSystemStats() {
    return this.adminService.getSystemStats();
  }

  @Get('activity')
  @ApiOperation({ summary: 'Get recent system activity' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getRecentActivity(@Query('limit') limit?: number) {
    return this.adminService.getRecentActivity(limit || 20);
  }

  // ==================== Organizations ====================

  @Get('organizations')
  @ApiOperation({ summary: 'Get all organizations with pagination and filtering' })
  @ApiResponse({ status: 200, description: 'Organizations retrieved successfully' })
  async getAllOrganizations(@Query() query: OrganizationQueryDto) {
    return this.adminService.getAllOrganizations(query);
  }

  @Get('organizations/:id')
  @ApiOperation({ summary: 'Get organization by ID' })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  async getOrganization(@Param('id') id: string) {
    return this.adminService.getOrganizationById(id);
  }

  @Get('organizations/:id/details')
  @ApiOperation({ summary: 'Get detailed organization information including settings, services, members' })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  async getOrganizationDetails(@Param('id') id: string) {
    return this.adminService.getOrganizationDetails(id);
  }

  @Patch('organizations/:id')
  @ApiOperation({ summary: 'Update organization' })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  async updateOrganization(
    @Param('id') id: string,
    @Body() updateDto: AdminUpdateOrganizationDto,
    @Request() req: any,
  ) {
    this.logger.log(`Admin ${req.user.id} updating organization ${id}`);
    return this.adminService.updateOrganization(id, updateDto);
  }

  @Delete('organizations/:id')
  @ApiOperation({ summary: 'Delete organization' })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  async deleteOrganization(@Param('id') id: string, @Request() req: any) {
    this.logger.warn(`Admin ${req.user.id} deleting organization ${id}`);
    await this.adminService.deleteOrganization(id);
    return { message: 'Organization deleted successfully' };
  }

  // ==================== Organization Settings ====================

  @Get('organizations/:id/settings')
  @ApiOperation({ summary: 'Get organization settings' })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  async getOrganizationSettings(@Param('id') id: string) {
    return this.adminService.getOrganizationSettings(id);
  }

  @Put('organizations/:id/settings')
  @ApiOperation({ summary: 'Update organization settings' })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  async updateOrganizationSettings(
    @Param('id') id: string,
    @Body() updateDto: AdminUpdateOrganizationSettingsDto,
    @Request() req: any,
  ) {
    this.logger.log(`Admin ${req.user.id} updating settings for organization ${id}`);
    return this.adminService.updateOrganizationSettings(id, updateDto);
  }

  // ==================== Organization Services ====================

  @Get('organizations/:id/services')
  @ApiOperation({ summary: 'Get all services for an organization' })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  async getOrganizationServices(@Param('id') id: string) {
    return this.adminService.getOrganizationServices(id);
  }

  @Post('organizations/:id/services')
  @ApiOperation({ summary: 'Create a service for an organization' })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  async createService(
    @Param('id') id: string,
    @Body() createDto: AdminCreateServiceDto,
    @Request() req: any,
  ) {
    this.logger.log(`Admin ${req.user.id} creating service for organization ${id}`);
    return this.adminService.createService(id, createDto);
  }

  @Patch('services/:id')
  @ApiOperation({ summary: 'Update a service' })
  @ApiParam({ name: 'id', description: 'Service ID' })
  async updateService(
    @Param('id') id: string,
    @Body() updateDto: AdminUpdateServiceDto,
    @Request() req: any,
  ) {
    this.logger.log(`Admin ${req.user.id} updating service ${id}`);
    return this.adminService.updateService(id, updateDto);
  }

  @Delete('services/:id')
  @ApiOperation({ summary: 'Delete a service' })
  @ApiParam({ name: 'id', description: 'Service ID' })
  async deleteService(@Param('id') id: string, @Request() req: any) {
    this.logger.warn(`Admin ${req.user.id} deleting service ${id}`);
    await this.adminService.deleteService(id);
    return { message: 'Service deleted successfully' };
  }

  // ==================== Service Provider Assignment ====================

  @Get('services/:serviceId/providers')
  @ApiOperation({ summary: 'Get providers assigned to a service' })
  @ApiParam({ name: 'serviceId', description: 'Service ID' })
  async getServiceProviders(@Param('serviceId') serviceId: string) {
    return this.adminService.getServiceProviders(serviceId);
  }

  @Put('services/:serviceId/providers')
  @ApiOperation({ summary: 'Bulk assign providers to a service' })
  @ApiParam({ name: 'serviceId', description: 'Service ID' })
  async bulkAssignProviders(
    @Param('serviceId') serviceId: string,
    @Body() dto: AdminBulkAssignProvidersDto,
    @Request() req: any,
  ) {
    this.logger.log(`Admin ${req.user.id} assigning ${dto.memberIds.length} providers to service ${serviceId}`);
    return this.adminService.bulkAssignProviders(serviceId, dto.memberIds);
  }

  // ==================== Organization Booking Links ====================

  @Get('organizations/:id/booking-links')
  @ApiOperation({ summary: 'Get all booking links for an organization' })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  async getOrganizationBookingLinks(@Param('id') id: string) {
    return this.adminService.getOrganizationBookingLinks(id);
  }

  @Delete('booking-links/:id')
  @ApiOperation({ summary: 'Delete a booking link' })
  @ApiParam({ name: 'id', description: 'Booking Link ID' })
  async deleteBookingLink(@Param('id') id: string, @Request() req: any) {
    this.logger.warn(`Admin ${req.user.id} deleting booking link ${id}`);
    await this.adminService.deleteBookingLink(id);
    return { message: 'Booking link deleted successfully' };
  }

  // ==================== Users ====================

  @Get('users')
  @ApiOperation({ summary: 'Get all users with pagination and filtering' })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  async getAllUsers(@Query() query: UsersQueryDto) {
    return this.adminService.getAllUsers(query);
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiParam({ name: 'id', description: 'User ID' })
  async getUser(@Param('id') id: string) {
    return this.adminService.getUserById(id);
  }

  @Get('users/clerk/:clerkId')
  @ApiOperation({ summary: 'Get user by Clerk ID' })
  @ApiParam({ name: 'clerkId', description: 'Clerk User ID' })
  async getUserByClerkId(@Param('clerkId') clerkId: string) {
    return this.adminService.getUserByClerkId(clerkId);
  }

  @Post('users/:clerkId/set-admin')
  @ApiOperation({ summary: 'Grant system admin role to a user' })
  @ApiParam({ name: 'clerkId', description: 'Clerk User ID' })
  async setUserAsSystemAdmin(@Param('clerkId') clerkId: string, @Request() req: any) {
    this.logger.warn(`Admin ${req.user.id} granting admin role to ${clerkId}`);
    await this.adminService.setUserAsSystemAdmin(clerkId);
    return { message: 'User granted system admin role' };
  }

  @Post('users/:clerkId/remove-admin')
  @ApiOperation({ summary: 'Remove system admin role from a user' })
  @ApiParam({ name: 'clerkId', description: 'Clerk User ID' })
  async removeSystemAdminRole(@Param('clerkId') clerkId: string, @Request() req: any) {
    this.logger.warn(`Admin ${req.user.id} revoking admin role from ${clerkId}`);
    await this.adminService.removeSystemAdminRole(clerkId);
    return { message: 'System admin role removed from user' };
  }

  @Put('users/:clerkId/metadata')
  @ApiOperation({ summary: 'Update user public metadata' })
  @ApiParam({ name: 'clerkId', description: 'Clerk User ID' })
  async updateUserMetadata(
    @Param('clerkId') clerkId: string,
    @Body() metadata: Record<string, any>,
    @Request() req: any,
  ) {
    this.logger.log(`Admin ${req.user.id} updating metadata for user ${clerkId}`);
    await this.adminService.updateUserPublicMetadata(clerkId, metadata);
    return { message: 'User metadata updated' };
  }

  // ==================== Appointments ====================

  @Get('appointments')
  @ApiOperation({ summary: 'Get all appointments with pagination and filtering' })
  @ApiResponse({ status: 200, description: 'Appointments retrieved successfully' })
  async getAllAppointments(@Query() query: AppointmentsQueryDto) {
    return this.adminService.getAllAppointments(query);
  }

  @Get('appointments/:id')
  @ApiOperation({ summary: 'Get appointment by ID' })
  @ApiParam({ name: 'id', description: 'Appointment ID' })
  async getAppointment(@Param('id') id: string) {
    return this.adminService.getAppointmentById(id);
  }

  @Patch('appointments/:id/status')
  @ApiOperation({ summary: 'Update appointment status' })
  @ApiParam({ name: 'id', description: 'Appointment ID' })
  async updateAppointmentStatus(
    @Param('id') id: string,
    @Body('status') status: AppointmentStatus,
    @Request() req: any,
  ) {
    this.logger.log(`Admin ${req.user.id} updating appointment ${id} status to ${status}`);
    return this.adminService.updateAppointmentStatus(id, status);
  }

  // ==================== WhatsApp Settings ====================

  @Get('organizations/:id/whatsapp')
  @ApiOperation({ summary: 'Get WhatsApp settings for an organization' })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  async getWhatsAppSettings(@Param('id') id: string) {
    return this.notificationSettingsService.getWhatsAppSettings(id);
  }

  @Put('organizations/:id/whatsapp')
  @ApiOperation({ summary: 'Update WhatsApp settings' })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  async updateWhatsAppSettings(
    @Param('id') id: string,
    @Body() updateDto: UpdateWhatsAppSettingsDto,
    @Request() req: any,
  ) {
    this.logger.log(`Admin ${req.user.id} updating WhatsApp settings for organization ${id}`);
    return this.notificationSettingsService.updateWhatsAppSettings(id, updateDto);
  }

  @Post('organizations/:id/whatsapp/connect')
  @ApiOperation({ summary: 'Connect WhatsApp Business Account' })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  async connectWhatsApp(
    @Param('id') id: string,
    @Body() connectDto: ConnectWhatsAppDto,
    @Request() req: any,
  ) {
    this.logger.log(`Admin ${req.user.id} connecting WhatsApp for organization ${id}`);
    return this.notificationSettingsService.connectWhatsApp(id, connectDto);
  }

  @Post('organizations/:id/whatsapp/disconnect')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Disconnect WhatsApp Business Account' })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  async disconnectWhatsApp(@Param('id') id: string, @Request() req: any) {
    this.logger.log(`Admin ${req.user.id} disconnecting WhatsApp for organization ${id}`);
    return this.notificationSettingsService.disconnectWhatsApp(id);
  }
}
