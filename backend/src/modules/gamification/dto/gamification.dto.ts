import { IsBoolean, IsInt, IsOptional, IsArray, ValidateNested, Min, Max, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { PartialType } from '@nestjs/mapped-types';

export class SpinWheelPrizeDto {
  @IsString()
  id: string;

  @IsString()
  name: string;

  @IsString()
  type: 'points' | 'discount' | 'freebie' | 'nothing';

  @IsInt()
  @Min(0)
  value: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsInt()
  @Min(0)
  @Max(100)
  probability: number;

  @IsString()
  color: string;
}

export class CreateGamificationSettingsDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  pointsPerBooking?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  pointsPerCompletedAppointment?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  pointsPerReferral?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  pointsForReferred?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  streakBonusPoints?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  bronzeThreshold?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  silverThreshold?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  goldThreshold?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  platinumThreshold?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  bronzeDiscount?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  silverDiscount?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  goldDiscount?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  platinumDiscount?: number;

  @IsOptional()
  @IsBoolean()
  spinWheelEnabled?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SpinWheelPrizeDto)
  spinWheelPrizes?: SpinWheelPrizeDto[];

  @IsOptional()
  @IsBoolean()
  referralsEnabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxReferralsPerClient?: number;

  @IsOptional()
  @IsBoolean()
  virtualPetEnabled?: boolean;
}

export class UpdateGamificationSettingsDto extends PartialType(CreateGamificationSettingsDto) {}

export class UpdateClientGamificationDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  totalPoints?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  availablePoints?: number;

  @IsOptional()
  @IsString()
  level?: 'bronze' | 'silver' | 'gold' | 'platinum';

  @IsOptional()
  @IsInt()
  @Min(0)
  currentStreak?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  longestStreak?: number;
}

export class AdjustPointsDto {
  @IsInt()
  points: number;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class ValidateReferralDto {
  @IsString()
  referralCode: string;
}

export class SpinWheelResultDto {
  prize: SpinWheelPrizeDto;
  pointsEarned: number;
  newBalance: number;
}

export class ClientGamificationSummary {
  totalPoints: number;
  availablePoints: number;
  level: string;
  levelProgress: number; // percentage to next level
  nextLevel: string | null;
  pointsToNextLevel: number;
  currentStreak: number;
  longestStreak: number;
  referralCode: string;
  totalReferrals: number;
  successfulReferrals: number;
  canSpin: boolean;
  discountPercentage: number;
}
