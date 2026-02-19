import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual, LessThanOrEqual, In } from 'typeorm';
import { Appointment, AppointmentStatus } from '../appointments/entities/appointment.entity';
import { Client } from '../clients/entities/client.entity';
import { User } from '../users/entities/user.entity';
import { ServiceOption } from '../service-options/entities/service-option.entity';
import { UserOrganization } from '../organizations/entities/user-organization.entity';
import {
  OrganizationStatsDto,
  OrganizationOverviewDto,
  MemberStatsDto,
  MonthlyAnalyticsDto,
  ServiceStatDto,
  StatusBreakdownDto,
  DayBreakdownDto,
  HourBreakdownDto,
  TrendDataDto,
  ReportsQueryDto,
} from './dto/reports.dto';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
    @InjectRepository(Client)
    private readonly clientRepository: Repository<Client>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(ServiceOption)
    private readonly serviceOptionRepository: Repository<ServiceOption>,
    @InjectRepository(UserOrganization)
    private readonly userOrganizationRepository: Repository<UserOrganization>,
  ) {}

  /**
   * Get all active members for an organization from user_organizations table
   */
  private async getOrganizationMembers(organizationId: string): Promise<User[]> {
    const userOrgs = await this.userOrganizationRepository.find({
      where: { organizationId },
      relations: ['user'],
    });
    
    return userOrgs
      .map(uo => uo.user)
      .filter((user): user is User => user !== null && user.isActive);
  }

  /**
   * Check if a member belongs to an organization
   */
  private async isMemberOfOrganization(memberId: string, organizationId: string): Promise<User | null> {
    const userOrg = await this.userOrganizationRepository.findOne({
      where: { userId: memberId, organizationId },
      relations: ['user'],
    });
    
    return userOrg?.user || null;
  }

  /**
   * Get comprehensive organization overview with stats, trends, and analytics
   */
  async getOrganizationOverview(
    organizationId: string,
    query?: ReportsQueryDto,
  ): Promise<OrganizationOverviewDto> {
    const [
      baseStats,
      monthlyAnalytics,
      memberStats,
      dailyTrend,
    ] = await Promise.all([
      this.getOrganizationStats(organizationId, query),
      this.getMonthlyAnalytics(organizationId, 12), // Last 12 months
      this.getMemberStats(organizationId, query),
      this.getDailyTrend(organizationId, 30), // Last 30 days
    ]);

    return {
      ...baseStats,
      monthlyAnalytics,
      memberStats,
      dailyTrend,
    };
  }

  /**
   * Get organization-wide statistics
   */
  async getOrganizationStats(
    organizationId: string,
    query?: ReportsQueryDto,
  ): Promise<OrganizationStatsDto> {
    // Get organization members from user_organizations table
    const members = await this.getOrganizationMembers(organizationId);
    const memberIds = members.map(m => m.id);

    if (memberIds.length === 0) {
      return this.getEmptyStats();
    }

    // Date range
    const endDate = query?.endDate ? new Date(query.endDate) : new Date();
    endDate.setHours(23, 59, 59, 999);
    
    const startDate = query?.startDate 
      ? new Date(query.startDate) 
      : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000); // Default: last 30 days
    startDate.setHours(0, 0, 0, 0);

    // Get appointments for date range - use organizationId directly for proper data isolation
    const appointments = await this.appointmentRepository.find({
      where: {
        organizationId,
        startTime: Between(startDate, endDate),
      },
      relations: ['serviceOption', 'user'],
    });

    // Calculate basic stats
    const totalAppointments = appointments.length;
    const completedAppointments = appointments.filter(
      a => a.status === AppointmentStatus.COMPLETED
    ).length;
    const cancelledAppointments = appointments.filter(
      a => a.status === AppointmentStatus.CANCELLED
    ).length;
    const noShowAppointments = appointments.filter(
      a => a.status === AppointmentStatus.NO_SHOW
    ).length;
    const pendingAppointments = appointments.filter(
      a => a.status === AppointmentStatus.PENDING_CONFIRMATION
    ).length;

    // Rates
    const completionRate = totalAppointments > 0 
      ? Math.round((completedAppointments / totalAppointments) * 1000) / 10 
      : 0;
    const noShowRate = totalAppointments > 0 
      ? Math.round((noShowAppointments / totalAppointments) * 1000) / 10 
      : 0;
    const cancelRate = totalAppointments > 0 
      ? Math.round((cancelledAppointments / totalAppointments) * 1000) / 10 
      : 0;

    // Client stats
    const clients = await this.clientRepository.find({
      where: { organizationId },
    });
    const totalClients = clients.length;
    
    const thisMonthStart = new Date();
    thisMonthStart.setDate(1);
    thisMonthStart.setHours(0, 0, 0, 0);
    const newClientsThisMonth = clients.filter(
      c => new Date(c.createdAt) >= thisMonthStart
    ).length;
    
    const repeatClients = clients.filter(
      c => c.completedAppointments > 1
    ).length;

    // Active members (those with at least 1 appointment in period)
    const membersWithAppointments = new Set(appointments.map(a => a.userId));
    const activeMembers = membersWithAppointments.size;

    // Average appointments per day
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) || 1;
    const averageAppointmentsPerDay = Math.round((totalAppointments / daysDiff) * 10) / 10;

    // Appointments by day of week
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const appointmentsByDayOfWeek: DayBreakdownDto[] = dayNames.map((day, index) => ({
      day,
      dayIndex: index,
      count: appointments.filter(a => new Date(a.startTime).getDay() === index).length,
    }));

    // Find busiest day
    const busiestDayData = appointmentsByDayOfWeek.reduce((max, curr) => 
      curr.count > max.count ? curr : max, appointmentsByDayOfWeek[0]);
    const busiestDay = busiestDayData.day;

    // Appointments by hour
    const appointmentsByHour: HourBreakdownDto[] = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      count: appointments.filter(a => new Date(a.startTime).getHours() === hour).length,
    }));

    // Find busiest hour
    const busiestHourData = appointmentsByHour.reduce((max, curr) => 
      curr.count > max.count ? curr : max, appointmentsByHour[0]);
    const busiestHour = busiestHourData.hour;

    // Status breakdown
    const appointmentsByStatus: StatusBreakdownDto[] = [
      { status: 'completed', count: completedAppointments, percentage: completionRate },
      { status: 'cancelled', count: cancelledAppointments, percentage: cancelRate },
      { status: 'no_show', count: noShowAppointments, percentage: noShowRate },
      { status: 'pending', count: pendingAppointments, percentage: totalAppointments > 0 ? Math.round((pendingAppointments / totalAppointments) * 1000) / 10 : 0 },
      { status: 'confirmed', count: totalAppointments - completedAppointments - cancelledAppointments - noShowAppointments - pendingAppointments, percentage: 0 },
    ].filter(s => s.count > 0);

    // Recalculate confirmed percentage
    const confirmedCount = appointmentsByStatus.find(s => s.status === 'confirmed')?.count || 0;
    if (confirmedCount > 0 && totalAppointments > 0) {
      const confirmedItem = appointmentsByStatus.find(s => s.status === 'confirmed');
      if (confirmedItem) {
        confirmedItem.percentage = Math.round((confirmedCount / totalAppointments) * 1000) / 10;
      }
    }

    // Top services
    const serviceStats = new Map<string, { name: string; total: number; completed: number }>();
    for (const apt of appointments) {
      const serviceId = apt.serviceOptionId;
      const serviceName = apt.serviceOption?.title || 'Unknown Service';
      
      if (!serviceStats.has(serviceId)) {
        serviceStats.set(serviceId, { name: serviceName, total: 0, completed: 0 });
      }
      
      const stats = serviceStats.get(serviceId)!;
      stats.total++;
      if (apt.status === AppointmentStatus.COMPLETED) {
        stats.completed++;
      }
    }

    const topServices: ServiceStatDto[] = Array.from(serviceStats.entries())
      .map(([serviceId, stats]) => ({
        serviceId,
        serviceName: stats.name,
        totalAppointments: stats.total,
        completedAppointments: stats.completed,
        percentage: totalAppointments > 0 
          ? Math.round((stats.total / totalAppointments) * 1000) / 10 
          : 0,
      }))
      .sort((a, b) => b.totalAppointments - a.totalAppointments)
      .slice(0, 10);

    return {
      totalAppointments,
      completedAppointments,
      cancelledAppointments,
      noShowAppointments,
      pendingAppointments,
      totalClients,
      newClientsThisMonth,
      repeatClients,
      totalMembers: members.length,
      activeMembers,
      completionRate,
      noShowRate,
      cancelRate,
      averageAppointmentsPerDay,
      busiestDay,
      busiestHour,
      topServices,
      appointmentsByStatus,
      appointmentsByDayOfWeek,
      appointmentsByHour,
    };
  }

  /**
   * Get monthly analytics for the past N months
   */
  async getMonthlyAnalytics(
    organizationId: string,
    monthsBack: number = 12,
  ): Promise<MonthlyAnalyticsDto[]> {
    const result: MonthlyAnalyticsDto[] = [];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    for (let i = 0; i < monthsBack; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      date.setDate(1);
      date.setHours(0, 0, 0, 0);

      const startOfMonth = new Date(date);
      const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);

      // Use organizationId directly for proper data isolation
      const appointments = await this.appointmentRepository.find({
        where: {
          organizationId,
          startTime: Between(startOfMonth, endOfMonth),
        },
      });

      const newClients = await this.clientRepository.count({
        where: {
          organizationId,
          createdAt: Between(startOfMonth, endOfMonth),
        },
      });

      result.push({
        month: monthNames[date.getMonth()],
        year: date.getFullYear(),
        totalAppointments: appointments.length,
        completedAppointments: appointments.filter(a => a.status === AppointmentStatus.COMPLETED).length,
        cancelledAppointments: appointments.filter(a => a.status === AppointmentStatus.CANCELLED).length,
        noShowAppointments: appointments.filter(a => a.status === AppointmentStatus.NO_SHOW).length,
        pendingAppointments: appointments.filter(a => a.status === AppointmentStatus.PENDING_CONFIRMATION).length,
        newClients,
        revenue: 0, // Can be extended to calculate actual revenue if pricing is implemented
      });
    }

    return result.reverse(); // Oldest to newest
  }

  /**
   * Get stats for each member in the organization
   */
  async getMemberStats(
    organizationId: string,
    query?: ReportsQueryDto,
  ): Promise<MemberStatsDto[]> {
    const members = await this.getOrganizationMembers(organizationId);

    if (members.length === 0) {
      return [];
    }

    // Date range
    const endDate = query?.endDate ? new Date(query.endDate) : new Date();
    endDate.setHours(23, 59, 59, 999);
    
    const startDate = query?.startDate 
      ? new Date(query.startDate) 
      : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    startDate.setHours(0, 0, 0, 0);

    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) || 1;

    const result: MemberStatsDto[] = [];

    for (const member of members) {
      const appointments = await this.appointmentRepository.find({
        where: {
          userId: member.id,
          startTime: Between(startDate, endDate),
        },
      });

      const totalAppointments = appointments.length;
      const completedAppointments = appointments.filter(
        a => a.status === AppointmentStatus.COMPLETED
      ).length;
      const cancelledAppointments = appointments.filter(
        a => a.status === AppointmentStatus.CANCELLED
      ).length;
      const noShowAppointments = appointments.filter(
        a => a.status === AppointmentStatus.NO_SHOW
      ).length;

      const completionRate = totalAppointments > 0 
        ? Math.round((completedAppointments / totalAppointments) * 1000) / 10 
        : 0;
      const noShowRate = totalAppointments > 0 
        ? Math.round((noShowAppointments / totalAppointments) * 1000) / 10 
        : 0;
      const averageAppointmentsPerDay = Math.round((totalAppointments / daysDiff) * 10) / 10;

      result.push({
        memberId: member.id,
        memberName: `${member.firstName || ''} ${member.lastName || ''}`.trim() || member.email,
        memberEmail: member.email,
        totalAppointments,
        completedAppointments,
        cancelledAppointments,
        noShowAppointments,
        completionRate,
        noShowRate,
        averageAppointmentsPerDay,
      });
    }

    return result.sort((a, b) => b.totalAppointments - a.totalAppointments);
  }

  /**
   * Get detailed stats for a specific member
   */
  async getMemberDetailedStats(
    organizationId: string,
    memberId: string,
    query?: ReportsQueryDto,
  ): Promise<MemberStatsDto & { monthlyData: MonthlyAnalyticsDto[] }> {
    const member = await this.isMemberOfOrganization(memberId, organizationId);

    if (!member) {
      throw new NotFoundException('Member not found in organization');
    }

    // Date range
    const endDate = query?.endDate ? new Date(query.endDate) : new Date();
    endDate.setHours(23, 59, 59, 999);
    
    const startDate = query?.startDate 
      ? new Date(query.startDate) 
      : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    startDate.setHours(0, 0, 0, 0);

    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) || 1;

    const appointments = await this.appointmentRepository.find({
      where: {
        userId: member.id,
        startTime: Between(startDate, endDate),
      },
    });

    const totalAppointments = appointments.length;
    const completedAppointments = appointments.filter(
      a => a.status === AppointmentStatus.COMPLETED
    ).length;
    const cancelledAppointments = appointments.filter(
      a => a.status === AppointmentStatus.CANCELLED
    ).length;
    const noShowAppointments = appointments.filter(
      a => a.status === AppointmentStatus.NO_SHOW
    ).length;

    const completionRate = totalAppointments > 0 
      ? Math.round((completedAppointments / totalAppointments) * 1000) / 10 
      : 0;
    const noShowRate = totalAppointments > 0 
      ? Math.round((noShowAppointments / totalAppointments) * 1000) / 10 
      : 0;
    const averageAppointmentsPerDay = Math.round((totalAppointments / daysDiff) * 10) / 10;

    // Get monthly data for this member
    const monthlyData = await this.getMemberMonthlyData(memberId, 12);

    return {
      memberId: member.id,
      memberName: `${member.firstName || ''} ${member.lastName || ''}`.trim() || member.email,
      memberEmail: member.email,
      totalAppointments,
      completedAppointments,
      cancelledAppointments,
      noShowAppointments,
      completionRate,
      noShowRate,
      averageAppointmentsPerDay,
      monthlyData,
    };
  }

  /**
   * Get monthly data for a specific member
   */
  private async getMemberMonthlyData(
    memberId: string,
    monthsBack: number = 12,
  ): Promise<MonthlyAnalyticsDto[]> {
    const result: MonthlyAnalyticsDto[] = [];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    for (let i = 0; i < monthsBack; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      date.setDate(1);
      date.setHours(0, 0, 0, 0);

      const startOfMonth = new Date(date);
      const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);

      const appointments = await this.appointmentRepository.find({
        where: {
          userId: memberId,
          startTime: Between(startOfMonth, endOfMonth),
        },
      });

      result.push({
        month: monthNames[date.getMonth()],
        year: date.getFullYear(),
        totalAppointments: appointments.length,
        completedAppointments: appointments.filter(a => a.status === AppointmentStatus.COMPLETED).length,
        cancelledAppointments: appointments.filter(a => a.status === AppointmentStatus.CANCELLED).length,
        noShowAppointments: appointments.filter(a => a.status === AppointmentStatus.NO_SHOW).length,
        pendingAppointments: appointments.filter(a => a.status === AppointmentStatus.PENDING_CONFIRMATION).length,
        newClients: 0, // Not applicable for individual members
        revenue: 0,
      });
    }

    return result.reverse();
  }

  /**
   * Get daily appointment trend for the past N days
   */
  async getDailyTrend(
    organizationId: string,
    daysBack: number = 30,
  ): Promise<TrendDataDto[]> {
    const result: TrendDataDto[] = [];

    for (let i = daysBack - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const startOfDay = new Date(date);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      // Use organizationId directly for proper data isolation
      const appointments = await this.appointmentRepository.find({
        where: {
          organizationId,
          startTime: Between(startOfDay, endOfDay),
        },
      });

      result.push({
        date: date.toISOString().split('T')[0],
        appointments: appointments.length,
        completed: appointments.filter(a => a.status === AppointmentStatus.COMPLETED).length,
        cancelled: appointments.filter(a => a.status === AppointmentStatus.CANCELLED).length,
        noShow: appointments.filter(a => a.status === AppointmentStatus.NO_SHOW).length,
      });
    }

    return result;
  }

  /**
   * Get service-specific analytics
   */
  async getServiceAnalytics(
    organizationId: string,
    query?: ReportsQueryDto,
  ): Promise<ServiceStatDto[]> {
    // Date range
    const endDate = query?.endDate ? new Date(query.endDate) : new Date();
    endDate.setHours(23, 59, 59, 999);
    
    const startDate = query?.startDate 
      ? new Date(query.startDate) 
      : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    startDate.setHours(0, 0, 0, 0);

    // Use organizationId directly for proper data isolation
    const appointments = await this.appointmentRepository.find({
      where: {
        organizationId,
        startTime: Between(startDate, endDate),
      },
      relations: ['serviceOption'],
    });

    const totalAppointments = appointments.length;
    const serviceStats = new Map<string, { name: string; total: number; completed: number }>();

    for (const apt of appointments) {
      const serviceId = apt.serviceOptionId;
      const serviceName = apt.serviceOption?.title || 'Unknown Service';
      
      if (!serviceStats.has(serviceId)) {
        serviceStats.set(serviceId, { name: serviceName, total: 0, completed: 0 });
      }
      
      const stats = serviceStats.get(serviceId)!;
      stats.total++;
      if (apt.status === AppointmentStatus.COMPLETED) {
        stats.completed++;
      }
    }

    return Array.from(serviceStats.entries())
      .map(([serviceId, stats]) => ({
        serviceId,
        serviceName: stats.name,
        totalAppointments: stats.total,
        completedAppointments: stats.completed,
        percentage: totalAppointments > 0 
          ? Math.round((stats.total / totalAppointments) * 1000) / 10 
          : 0,
      }))
      .sort((a, b) => b.totalAppointments - a.totalAppointments);
  }

  /**
   * Return empty stats structure
   */
  private getEmptyStats(): OrganizationStatsDto {
    return {
      totalAppointments: 0,
      completedAppointments: 0,
      cancelledAppointments: 0,
      noShowAppointments: 0,
      pendingAppointments: 0,
      totalClients: 0,
      newClientsThisMonth: 0,
      repeatClients: 0,
      totalMembers: 0,
      activeMembers: 0,
      completionRate: 0,
      noShowRate: 0,
      cancelRate: 0,
      averageAppointmentsPerDay: 0,
      busiestDay: 'N/A',
      busiestHour: 0,
      topServices: [],
      appointmentsByStatus: [],
      appointmentsByDayOfWeek: [],
      appointmentsByHour: [],
    };
  }
}
