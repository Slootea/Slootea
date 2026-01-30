import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsDateString } from 'class-validator';

export class ReportsQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  memberId?: string;
}

export class MonthlyAnalyticsDto {
  @ApiProperty()
  month: string;

  @ApiProperty()
  year: number;

  @ApiProperty()
  totalAppointments: number;

  @ApiProperty()
  completedAppointments: number;

  @ApiProperty()
  cancelledAppointments: number;

  @ApiProperty()
  noShowAppointments: number;

  @ApiProperty()
  pendingAppointments: number;

  @ApiProperty()
  newClients: number;

  @ApiProperty()
  revenue: number;
}

export class MemberStatsDto {
  @ApiProperty()
  memberId: string;

  @ApiProperty()
  memberName: string;

  @ApiProperty()
  memberEmail: string;

  @ApiProperty()
  totalAppointments: number;

  @ApiProperty()
  completedAppointments: number;

  @ApiProperty()
  cancelledAppointments: number;

  @ApiProperty()
  noShowAppointments: number;

  @ApiProperty()
  completionRate: number;

  @ApiProperty()
  noShowRate: number;

  @ApiProperty()
  averageAppointmentsPerDay: number;
}

export class OrganizationStatsDto {
  @ApiProperty()
  totalAppointments: number;

  @ApiProperty()
  completedAppointments: number;

  @ApiProperty()
  cancelledAppointments: number;

  @ApiProperty()
  noShowAppointments: number;

  @ApiProperty()
  pendingAppointments: number;

  @ApiProperty()
  totalClients: number;

  @ApiProperty()
  newClientsThisMonth: number;

  @ApiProperty()
  repeatClients: number;

  @ApiProperty()
  totalMembers: number;

  @ApiProperty()
  activeMembers: number;

  @ApiProperty()
  completionRate: number;

  @ApiProperty()
  noShowRate: number;

  @ApiProperty()
  cancelRate: number;

  @ApiProperty()
  averageAppointmentsPerDay: number;

  @ApiProperty()
  busiestDay: string;

  @ApiProperty()
  busiestHour: number;

  @ApiProperty()
  topServices: ServiceStatDto[];

  @ApiProperty()
  appointmentsByStatus: StatusBreakdownDto[];

  @ApiProperty()
  appointmentsByDayOfWeek: DayBreakdownDto[];

  @ApiProperty()
  appointmentsByHour: HourBreakdownDto[];
}

export class ServiceStatDto {
  @ApiProperty()
  serviceId: string;

  @ApiProperty()
  serviceName: string;

  @ApiProperty()
  totalAppointments: number;

  @ApiProperty()
  completedAppointments: number;

  @ApiProperty()
  percentage: number;
}

export class StatusBreakdownDto {
  @ApiProperty()
  status: string;

  @ApiProperty()
  count: number;

  @ApiProperty()
  percentage: number;
}

export class DayBreakdownDto {
  @ApiProperty()
  day: string;

  @ApiProperty()
  dayIndex: number;

  @ApiProperty()
  count: number;
}

export class HourBreakdownDto {
  @ApiProperty()
  hour: number;

  @ApiProperty()
  count: number;
}

export class TrendDataDto {
  @ApiProperty()
  date: string;

  @ApiProperty()
  appointments: number;

  @ApiProperty()
  completed: number;

  @ApiProperty()
  cancelled: number;

  @ApiProperty()
  noShow: number;
}

export class OrganizationOverviewDto extends OrganizationStatsDto {
  @ApiProperty({ type: [MonthlyAnalyticsDto] })
  monthlyAnalytics: MonthlyAnalyticsDto[];

  @ApiProperty({ type: [MemberStatsDto] })
  memberStats: MemberStatsDto[];

  @ApiProperty({ type: [TrendDataDto] })
  dailyTrend: TrendDataDto[];
}
