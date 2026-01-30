import {
  Controller,
  Get,
  Query,
  Param,
  UseGuards,
  Request,
  Headers,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiHeader, ApiQuery } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { OrgRolesGuard } from '../auth/guards/org-roles.guard';
import { OrgAdminOnly } from '../auth/decorators/org-roles.decorator';
import {
  ReportsQueryDto,
  OrganizationOverviewDto,
  OrganizationStatsDto,
  MemberStatsDto,
  MonthlyAnalyticsDto,
  ServiceStatDto,
  TrendDataDto,
} from './dto/reports.dto';

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(ClerkAuthGuard, OrgRolesGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('overview')
  @OrgAdminOnly()
  @ApiOperation({ summary: 'Get comprehensive organization overview (Admin only)' })
  @ApiResponse({ status: 200, description: 'Organization overview retrieved successfully', type: OrganizationOverviewDto })
  @ApiHeader({ name: 'x-organization-id', description: 'Organization ID', required: true })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date (ISO format)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date (ISO format)' })
  async getOrganizationOverview(
    @Headers('x-organization-id') organizationId: string,
    @Query() query: ReportsQueryDto,
  ): Promise<OrganizationOverviewDto> {
    return this.reportsService.getOrganizationOverview(organizationId, query);
  }

  @Get('stats')
  @OrgAdminOnly()
  @ApiOperation({ summary: 'Get organization statistics (Admin only)' })
  @ApiResponse({ status: 200, description: 'Organization stats retrieved successfully', type: OrganizationStatsDto })
  @ApiHeader({ name: 'x-organization-id', description: 'Organization ID', required: true })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date (ISO format)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date (ISO format)' })
  async getOrganizationStats(
    @Headers('x-organization-id') organizationId: string,
    @Query() query: ReportsQueryDto,
  ): Promise<OrganizationStatsDto> {
    return this.reportsService.getOrganizationStats(organizationId, query);
  }

  @Get('members')
  @OrgAdminOnly()
  @ApiOperation({ summary: 'Get all members statistics (Admin only)' })
  @ApiResponse({ status: 200, description: 'Member stats retrieved successfully', type: [MemberStatsDto] })
  @ApiHeader({ name: 'x-organization-id', description: 'Organization ID', required: true })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date (ISO format)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date (ISO format)' })
  async getMemberStats(
    @Headers('x-organization-id') organizationId: string,
    @Query() query: ReportsQueryDto,
  ): Promise<MemberStatsDto[]> {
    return this.reportsService.getMemberStats(organizationId, query);
  }

  @Get('members/:memberId')
  @OrgAdminOnly()
  @ApiOperation({ summary: 'Get detailed stats for a specific member (Admin only)' })
  @ApiResponse({ status: 200, description: 'Member detailed stats retrieved successfully' })
  @ApiHeader({ name: 'x-organization-id', description: 'Organization ID', required: true })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date (ISO format)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date (ISO format)' })
  async getMemberDetailedStats(
    @Headers('x-organization-id') organizationId: string,
    @Param('memberId') memberId: string,
    @Query() query: ReportsQueryDto,
  ): Promise<MemberStatsDto & { monthlyData: MonthlyAnalyticsDto[] }> {
    return this.reportsService.getMemberDetailedStats(organizationId, memberId, query);
  }

  @Get('monthly')
  @OrgAdminOnly()
  @ApiOperation({ summary: 'Get monthly analytics (Admin only)' })
  @ApiResponse({ status: 200, description: 'Monthly analytics retrieved successfully', type: [MonthlyAnalyticsDto] })
  @ApiHeader({ name: 'x-organization-id', description: 'Organization ID', required: true })
  @ApiQuery({ name: 'months', required: false, description: 'Number of months to retrieve (default: 12)' })
  async getMonthlyAnalytics(
    @Headers('x-organization-id') organizationId: string,
    @Query('months') months?: string,
  ): Promise<MonthlyAnalyticsDto[]> {
    const monthsBack = months ? parseInt(months, 10) : 12;
    return this.reportsService.getMonthlyAnalytics(organizationId, monthsBack);
  }

  @Get('daily-trend')
  @OrgAdminOnly()
  @ApiOperation({ summary: 'Get daily appointment trend (Admin only)' })
  @ApiResponse({ status: 200, description: 'Daily trend retrieved successfully', type: [TrendDataDto] })
  @ApiHeader({ name: 'x-organization-id', description: 'Organization ID', required: true })
  @ApiQuery({ name: 'days', required: false, description: 'Number of days to retrieve (default: 30)' })
  async getDailyTrend(
    @Headers('x-organization-id') organizationId: string,
    @Query('days') days?: string,
  ): Promise<TrendDataDto[]> {
    const daysBack = days ? parseInt(days, 10) : 30;
    return this.reportsService.getDailyTrend(organizationId, daysBack);
  }

  @Get('services')
  @OrgAdminOnly()
  @ApiOperation({ summary: 'Get service-specific analytics (Admin only)' })
  @ApiResponse({ status: 200, description: 'Service analytics retrieved successfully', type: [ServiceStatDto] })
  @ApiHeader({ name: 'x-organization-id', description: 'Organization ID', required: true })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date (ISO format)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date (ISO format)' })
  async getServiceAnalytics(
    @Headers('x-organization-id') organizationId: string,
    @Query() query: ReportsQueryDto,
  ): Promise<ServiceStatDto[]> {
    return this.reportsService.getServiceAnalytics(organizationId, query);
  }
}
