import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { IsString, IsNotEmpty } from 'class-validator';
import { GamificationService } from './gamification.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Client } from '../clients/entities/client.entity';
import { BookingLink } from '../booking-links/entities/booking-link.entity';

// DTOs for public endpoints
class LookupClientDto {
  @IsString()
  @IsNotEmpty()
  phone: string;
}

class ValidateReferralPublicDto {
  @IsString()
  @IsNotEmpty()
  referralCode: string;
}

class SpinWheelPublicDto {
  @IsString()
  @IsNotEmpty()
  clientId: string;
}

class GenerateReferralPublicDto {
  @IsString()
  @IsNotEmpty()
  clientId: string;
}

@Controller('public/gamification')
export class PublicGamificationController {
  constructor(
    private readonly gamificationService: GamificationService,
    @InjectRepository(Client)
    private readonly clientRepository: Repository<Client>,
    @InjectRepository(BookingLink)
    private readonly bookingLinkRepository: Repository<BookingLink>,
  ) {}

  // Check if gamification is enabled for a booking link
  @Get(':slug/status')
  async getGamificationStatus(@Param('slug') slug: string) {
    const bookingLink = await this.bookingLinkRepository.findOne({
      where: { slug, isActive: true },
    });

    if (!bookingLink) {
      throw new BadRequestException('Invalid booking link');
    }

    const settings = await this.gamificationService.getSettings(bookingLink.userId);
    
    return {
      enabled: settings.enabled,
      referralsEnabled: settings.referralsEnabled,
      spinWheelEnabled: settings.spinWheelEnabled,
      virtualPetEnabled: settings.virtualPetEnabled,
      pointsPerBooking: settings.pointsPerBooking,
      levels: {
        bronze: { threshold: settings.bronzeThreshold, discount: settings.bronzeDiscount },
        silver: { threshold: settings.silverThreshold, discount: settings.silverDiscount },
        gold: { threshold: settings.goldThreshold, discount: settings.goldDiscount },
        platinum: { threshold: settings.platinumThreshold, discount: settings.platinumDiscount },
      },
    };
  }

  // Lookup existing client by phone
  @Post(':slug/lookup')
  async lookupClient(
    @Param('slug') slug: string,
    @Body() dto: LookupClientDto,
  ) {
    const bookingLink = await this.bookingLinkRepository.findOne({
      where: { slug, isActive: true },
    });

    if (!bookingLink) {
      throw new BadRequestException('Invalid booking link');
    }

    const client = await this.clientRepository.findOne({
      where: { phone: dto.phone, userId: bookingLink.userId },
    });

    if (!client) {
      return { found: false };
    }

    const settings = await this.gamificationService.getSettings(bookingLink.userId);

    if (!settings.enabled) {
      return {
        found: true,
        client: {
          id: client.id,
          name: client.name,
          email: client.email,
          phone: client.phone,
        },
        gamification: null,
      };
    }

    const gamification = await this.gamificationService.getClientGamificationSummary(
      client.id,
      bookingLink.userId,
    );

    return {
      found: true,
      client: {
        id: client.id,
        name: client.name,
        email: client.email,
        phone: client.phone,
      },
      gamification,
    };
  }

  // Validate a referral code
  @Post(':slug/validate-referral')
  async validateReferral(
    @Param('slug') slug: string,
    @Body() dto: ValidateReferralPublicDto,
    @Query('clientPhone') clientPhone?: string,
  ) {
    const bookingLink = await this.bookingLinkRepository.findOne({
      where: { slug, isActive: true },
    });

    if (!bookingLink) {
      throw new BadRequestException('Invalid booking link');
    }

    const settings = await this.gamificationService.getSettings(bookingLink.userId);

    if (!settings.enabled || !settings.referralsEnabled) {
      return { valid: false, message: 'Referrals are not enabled' };
    }

    const result = await this.gamificationService.validateReferralCode(
      dto.referralCode,
      bookingLink.userId,
    );

    if (!result.valid) {
      return { valid: false, message: 'Invalid referral code' };
    }

    // Check if the client is trying to use their own referral code
    if (clientPhone && result.referrer) {
      const existingClient = await this.clientRepository.findOne({
        where: { phone: clientPhone, userId: bookingLink.userId },
      });
      if (existingClient && existingClient.id === result.referrer.id) {
        return { valid: false, message: 'You cannot use your own referral code' };
      }
    }

    return {
      valid: true,
      referrerId: result.referrer?.id,
      referrerName: result.referrer?.name?.split(' ')[0] || 'Someone',
      bonusPoints: settings.pointsForReferred,
    };
  }

  // Generate referral code for existing client
  @Post(':slug/generate-referral')
  async generateReferralCode(
    @Param('slug') slug: string,
    @Body() dto: GenerateReferralPublicDto,
  ) {
    const bookingLink = await this.bookingLinkRepository.findOne({
      where: { slug, isActive: true },
    });

    if (!bookingLink) {
      throw new BadRequestException('Invalid booking link');
    }

    const settings = await this.gamificationService.getSettings(bookingLink.userId);

    if (!settings.enabled || !settings.referralsEnabled) {
      throw new BadRequestException('Referrals are not enabled');
    }

    const code = await this.gamificationService.generateReferralCode(
      dto.clientId,
      bookingLink.userId,
    );

    return { referralCode: code };
  }

  // Spin the wheel after booking
  @Post(':slug/spin')
  async spinWheel(
    @Param('slug') slug: string,
    @Body() dto: SpinWheelPublicDto,
  ) {
    const bookingLink = await this.bookingLinkRepository.findOne({
      where: { slug, isActive: true },
    });

    if (!bookingLink) {
      throw new BadRequestException('Invalid booking link');
    }

    const settings = await this.gamificationService.getSettings(bookingLink.userId);

    if (!settings.enabled || !settings.spinWheelEnabled) {
      throw new BadRequestException('Spin wheel is not enabled');
    }

    return this.gamificationService.spinWheel(dto.clientId, bookingLink.userId);
  }

  // Get spin wheel configuration
  @Get(':slug/spin-wheel-config')
  async getSpinWheelConfig(@Param('slug') slug: string) {
    const bookingLink = await this.bookingLinkRepository.findOne({
      where: { slug, isActive: true },
    });

    if (!bookingLink) {
      throw new BadRequestException('Invalid booking link');
    }

    const settings = await this.gamificationService.getSettings(bookingLink.userId);

    if (!settings.enabled || !settings.spinWheelEnabled) {
      return { enabled: false, prizes: [] };
    }

    return {
      enabled: true,
      prizes: settings.spinWheelPrizes,
    };
  }
}
