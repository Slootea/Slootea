import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GamificationSettings, defaultSpinWheelPrizes, SpinWheelPrize } from './entities/gamification-settings.entity';
import { Referral } from './entities/referral.entity';
import { ClientReward } from './entities/client-reward.entity';
import { PointsHistory, PointsTransactionType } from './entities/points-history.entity';
import { Client, ClientLevel } from '../clients/entities/client.entity';
import { User } from '../users/entities/user.entity';
import {
  CreateGamificationSettingsDto,
  UpdateGamificationSettingsDto,
  UpdateClientGamificationDto,
  SpinWheelResultDto,
  ClientGamificationSummary,
} from './dto/gamification.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class GamificationService {
  constructor(
    @InjectRepository(GamificationSettings)
    private readonly settingsRepository: Repository<GamificationSettings>,
    @InjectRepository(Referral)
    private readonly referralRepository: Repository<Referral>,
    @InjectRepository(ClientReward)
    private readonly rewardRepository: Repository<ClientReward>,
    @InjectRepository(PointsHistory)
    private readonly historyRepository: Repository<PointsHistory>,
    @InjectRepository(Client)
    private readonly clientRepository: Repository<Client>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  // Helper to get organizationId from userId
  private async getOrganizationId(userId: string): Promise<string> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user?.organizationId) {
      throw new NotFoundException('User or organization not found');
    }
    return user.organizationId;
  }

  // Settings Management
  async getSettings(userId: string): Promise<GamificationSettings> {
    let settings = await this.settingsRepository.findOne({ where: { userId } });
    
    if (!settings) {
      // Create default settings
      settings = this.settingsRepository.create({
        userId,
        enabled: false,
        spinWheelPrizes: defaultSpinWheelPrizes,
      });
      settings = await this.settingsRepository.save(settings);
    }
    
    return settings;
  }

  async updateSettings(
    userId: string,
    updateDto: UpdateGamificationSettingsDto,
  ): Promise<GamificationSettings> {
    let settings = await this.getSettings(userId);
    Object.assign(settings, updateDto);
    return this.settingsRepository.save(settings);
  }

  async isGamificationEnabled(userId: string): Promise<boolean> {
    const settings = await this.getSettings(userId);
    return settings.enabled;
  }

  // Points Management
  async addPoints(
    clientId: string,
    userId: string,
    points: number,
    transactionType: PointsTransactionType,
    description?: string,
    relatedEntityId?: string,
  ): Promise<Client> {
    const organizationId = await this.getOrganizationId(userId);
    const client = await this.clientRepository.findOne({
      where: { id: clientId, organizationId },
    });

    if (!client) {
      throw new NotFoundException('Client not found');
    }

    client.totalPoints += points;
    client.availablePoints += points;

    // Check for level up
    await this.checkAndUpdateLevel(client, userId);

    await this.clientRepository.save(client);

    // Record history
    await this.historyRepository.save({
      clientId,
      userId,
      transactionType,
      points,
      balanceAfter: client.availablePoints,
      description,
      relatedEntityId,
    });

    return client;
  }

  async deductPoints(
    clientId: string,
    userId: string,
    points: number,
    description?: string,
  ): Promise<Client> {
    const organizationId = await this.getOrganizationId(userId);
    const client = await this.clientRepository.findOne({
      where: { id: clientId, organizationId },
    });

    if (!client) {
      throw new NotFoundException('Client not found');
    }

    if (client.availablePoints < points) {
      throw new BadRequestException('Insufficient points');
    }

    client.availablePoints -= points;

    await this.clientRepository.save(client);

    // Record history
    await this.historyRepository.save({
      clientId,
      userId,
      transactionType: 'redemption',
      points: -points,
      balanceAfter: client.availablePoints,
      description,
    });

    return client;
  }

  async adjustPoints(
    clientId: string,
    userId: string,
    points: number,
    reason?: string,
  ): Promise<Client> {
    const organizationId = await this.getOrganizationId(userId);
    const client = await this.clientRepository.findOne({
      where: { id: clientId, organizationId },
    });

    if (!client) {
      throw new NotFoundException('Client not found');
    }

    if (points > 0) {
      client.totalPoints += points;
      client.availablePoints += points;
    } else {
      client.availablePoints = Math.max(0, client.availablePoints + points);
    }

    await this.checkAndUpdateLevel(client, userId);
    await this.clientRepository.save(client);

    await this.historyRepository.save({
      clientId,
      userId,
      transactionType: 'manual_adjustment',
      points,
      balanceAfter: client.availablePoints,
      description: reason || 'Manual adjustment',
    });

    return client;
  }

  private async checkAndUpdateLevel(client: Client, userId: string): Promise<void> {
    const settings = await this.getSettings(userId);
    
    let newLevel: ClientLevel = 'bronze';
    
    if (client.totalPoints >= settings.platinumThreshold) {
      newLevel = 'platinum';
    } else if (client.totalPoints >= settings.goldThreshold) {
      newLevel = 'gold';
    } else if (client.totalPoints >= settings.silverThreshold) {
      newLevel = 'silver';
    }

    if (client.level !== newLevel) {
      const oldLevel = client.level;
      client.level = newLevel;
      
      // Award level-up reward
      await this.rewardRepository.save({
        clientId: client.id,
        userId,
        rewardType: 'level_up',
        rewardName: `Level Up: ${newLevel.charAt(0).toUpperCase() + newLevel.slice(1)}`,
        description: `Congratulations! You've reached ${newLevel} level!`,
        valueType: 'discount',
        value: this.getDiscountForLevel(newLevel, settings),
      });
    }
  }

  private getDiscountForLevel(level: ClientLevel, settings: GamificationSettings): number {
    switch (level) {
      case 'platinum': return settings.platinumDiscount;
      case 'gold': return settings.goldDiscount;
      case 'silver': return settings.silverDiscount;
      default: return settings.bronzeDiscount;
    }
  }

  // Referral Management
  async generateReferralCode(clientId: string, userId: string): Promise<string> {
    const organizationId = await this.getOrganizationId(userId);
    const client = await this.clientRepository.findOne({
      where: { id: clientId, organizationId },
    });

    if (!client) {
      throw new NotFoundException('Client not found');
    }

    if (client.referralCode) {
      return client.referralCode;
    }

    // Generate unique code
    const code = this.generateUniqueCode();
    client.referralCode = code;
    await this.clientRepository.save(client);

    return code;
  }

  private generateUniqueCode(): string {
    return uuidv4().substring(0, 8).toUpperCase();
  }

  async validateReferralCode(
    code: string,
    userId: string,
  ): Promise<{ valid: boolean; referrer?: Client }> {
    const organizationId = await this.getOrganizationId(userId);
    const referrer = await this.clientRepository.findOne({
      where: { referralCode: code, organizationId },
    });

    return {
      valid: !!referrer,
      referrer: referrer || undefined,
    };
  }

  async processReferral(
    referralCode: string,
    newClientId: string,
    userId: string,
  ): Promise<void> {
    const settings = await this.getSettings(userId);
    
    if (!settings.referralsEnabled) {
      return;
    }

    const validation = await this.validateReferralCode(referralCode, userId);
    
    if (!validation.valid || !validation.referrer) {
      return;
    }

    const referrer = validation.referrer;
    const organizationId = await this.getOrganizationId(userId);
    const newClient = await this.clientRepository.findOne({
      where: { id: newClientId, organizationId },
    });

    if (!newClient || referrer.id === newClient.id) {
      return;
    }

    // Check max referrals limit
    if (settings.maxReferralsPerClient > 0 && referrer.successfulReferrals >= settings.maxReferralsPerClient) {
      return;
    }

    // Create referral record
    await this.referralRepository.save({
      referralCode,
      referrerId: referrer.id,
      referredId: newClient.id,
      userId,
      status: 'completed',
      pointsAwarded: settings.pointsPerReferral,
      completedAt: new Date(),
    });

    // Award points to referrer
    referrer.totalReferrals += 1;
    referrer.successfulReferrals += 1;
    await this.clientRepository.save(referrer);
    
    await this.addPoints(
      referrer.id,
      userId,
      settings.pointsPerReferral,
      'referral_sent',
      `Referral bonus for ${newClient.name}`,
    );

    // Award points to referred
    newClient.referredBy = referralCode;
    await this.clientRepository.save(newClient);
    
    await this.addPoints(
      newClient.id,
      userId,
      settings.pointsForReferred,
      'referral_received',
      'Welcome bonus for using referral code',
    );
  }

  // Streak Management
  async updateStreak(clientId: string, userId: string, completed: boolean): Promise<void> {
    const organizationId = await this.getOrganizationId(userId);
    const client = await this.clientRepository.findOne({
      where: { id: clientId, organizationId },
    });

    if (!client) {
      return;
    }

    const settings = await this.getSettings(userId);

    if (completed) {
      client.currentStreak += 1;
      
      if (client.currentStreak > client.longestStreak) {
        client.longestStreak = client.currentStreak;
      }

      // Award streak bonus
      if (settings.streakBonusPoints > 0 && client.currentStreak > 1) {
        await this.addPoints(
          clientId,
          userId,
          settings.streakBonusPoints * client.currentStreak,
          'streak_bonus',
          `Streak bonus (${client.currentStreak} appointments)`,
        );
      }
    } else {
      // Reset streak on no-show or cancellation
      client.currentStreak = 0;
    }

    await this.clientRepository.save(client);
  }

  // Spin Wheel
  async spinWheel(clientId: string, userId: string): Promise<SpinWheelResultDto> {
    const settings = await this.getSettings(userId);

    if (!settings.spinWheelEnabled) {
      throw new BadRequestException('Spin wheel is not enabled');
    }

    const organizationId = await this.getOrganizationId(userId);
    const client = await this.clientRepository.findOne({
      where: { id: clientId, organizationId },
    });

    if (!client) {
      throw new NotFoundException('Client not found');
    }

    // Determine prize based on probability
    const prize = this.selectPrize(settings.spinWheelPrizes || defaultSpinWheelPrizes);

    let pointsEarned = 0;

    if (prize.type === 'points') {
      pointsEarned = prize.value;
      await this.addPoints(
        clientId,
        userId,
        prize.value,
        'spin_wheel',
        `Spin wheel prize: ${prize.name}`,
      );
    } else if (prize.type === 'discount' || prize.type === 'freebie') {
      // Create a reward
      await this.rewardRepository.save({
        clientId,
        userId,
        rewardType: 'spin_wheel',
        rewardName: prize.name,
        description: prize.description || `Won from spin wheel`,
        valueType: prize.type === 'discount' ? 'discount' : 'freebie',
        value: prize.value,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      });
    }

    // Update client spin stats
    client.spinWheelSpins += 1;
    client.lastSpinAt = new Date();
    await this.clientRepository.save(client);

    return {
      prize,
      pointsEarned,
      newBalance: client.availablePoints + pointsEarned,
    };
  }

  private selectPrize(prizes: SpinWheelPrize[]): SpinWheelPrize {
    const random = Math.random() * 100;
    let cumulative = 0;

    for (const prize of prizes) {
      cumulative += prize.probability;
      if (random <= cumulative) {
        return prize;
      }
    }

    return prizes[prizes.length - 1];
  }

  // Client Gamification Summary
  async getClientGamificationSummary(
    clientId: string,
    userId: string,
  ): Promise<ClientGamificationSummary> {
    const organizationId = await this.getOrganizationId(userId);
    const client = await this.clientRepository.findOne({
      where: { id: clientId, organizationId },
    });

    if (!client) {
      throw new NotFoundException('Client not found');
    }

    const settings = await this.getSettings(userId);

    // Calculate level progress
    const thresholds = {
      bronze: settings.bronzeThreshold,
      silver: settings.silverThreshold,
      gold: settings.goldThreshold,
      platinum: settings.platinumThreshold,
    };

    const levels: ClientLevel[] = ['bronze', 'silver', 'gold', 'platinum'];
    const currentLevelIndex = levels.indexOf(client.level);
    const nextLevel = currentLevelIndex < 3 ? levels[currentLevelIndex + 1] : null;

    let levelProgress = 100;
    let pointsToNextLevel = 0;

    if (nextLevel) {
      const currentThreshold = thresholds[client.level];
      const nextThreshold = thresholds[nextLevel];
      const range = nextThreshold - currentThreshold;
      const progress = client.totalPoints - currentThreshold;
      levelProgress = Math.min(100, Math.round((progress / range) * 100));
      pointsToNextLevel = nextThreshold - client.totalPoints;
    }

    // Generate referral code if not exists
    let referralCode = client.referralCode;
    if (!referralCode) {
      referralCode = await this.generateReferralCode(clientId, userId);
    }

    const discount = this.getDiscountForLevel(client.level, settings);

    return {
      totalPoints: client.totalPoints,
      availablePoints: client.availablePoints,
      level: client.level,
      levelProgress,
      nextLevel,
      pointsToNextLevel: Math.max(0, pointsToNextLevel),
      currentStreak: client.currentStreak,
      longestStreak: client.longestStreak,
      referralCode: referralCode,
      totalReferrals: client.totalReferrals,
      successfulReferrals: client.successfulReferrals,
      canSpin: settings.spinWheelEnabled,
      discountPercentage: discount,
    };
  }

  // Update client gamification data manually
  async updateClientGamification(
    clientId: string,
    userId: string,
    updateDto: UpdateClientGamificationDto,
  ): Promise<Client> {
    const organizationId = await this.getOrganizationId(userId);
    const client = await this.clientRepository.findOne({
      where: { id: clientId, organizationId },
    });

    if (!client) {
      throw new NotFoundException('Client not found');
    }

    Object.assign(client, updateDto);
    return this.clientRepository.save(client);
  }

  // Points History
  async getPointsHistory(
    clientId: string,
    userId: string,
    limit = 20,
  ): Promise<PointsHistory[]> {
    return this.historyRepository.find({
      where: { clientId, userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  // Client Rewards
  async getClientRewards(
    clientId: string,
    userId: string,
    includeRedeemed = false,
  ): Promise<ClientReward[]> {
    const where: any = { clientId, userId };
    if (!includeRedeemed) {
      where.isRedeemed = false;
    }

    return this.rewardRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  async redeemReward(rewardId: string, userId: string): Promise<ClientReward> {
    const reward = await this.rewardRepository.findOne({
      where: { id: rewardId, userId },
    });

    if (!reward) {
      throw new NotFoundException('Reward not found');
    }

    if (reward.isRedeemed) {
      throw new BadRequestException('Reward already redeemed');
    }

    if (reward.expiresAt && reward.expiresAt < new Date()) {
      throw new BadRequestException('Reward has expired');
    }

    reward.isRedeemed = true;
    reward.redeemedAt = new Date();

    return this.rewardRepository.save(reward);
  }

  // Award points for booking
  async awardBookingPoints(clientId: string, userId: string, appointmentId: string): Promise<void> {
    const settings = await this.getSettings(userId);
    
    if (!settings.enabled || settings.pointsPerBooking <= 0) {
      return;
    }

    await this.addPoints(
      clientId,
      userId,
      settings.pointsPerBooking,
      'booking',
      'Points for booking an appointment',
      appointmentId,
    );
  }

  // Award points for completed appointment
  async awardCompletionPoints(clientId: string, userId: string, appointmentId: string): Promise<void> {
    const settings = await this.getSettings(userId);
    
    if (!settings.enabled || settings.pointsPerCompletedAppointment <= 0) {
      return;
    }

    await this.addPoints(
      clientId,
      userId,
      settings.pointsPerCompletedAppointment,
      'completed_appointment',
      'Points for completing an appointment',
      appointmentId,
    );

    // Update streak
    await this.updateStreak(clientId, userId, true);
  }

  // Gamification stats for dashboard
  async getGamificationStats(userId: string) {
    const settings = await this.getSettings(userId);
    const organizationId = await this.getOrganizationId(userId);
    
    const totalPointsIssued = await this.historyRepository
      .createQueryBuilder('history')
      .where('history.userId = :userId', { userId })
      .andWhere('history.points > 0')
      .select('SUM(history.points)', 'total')
      .getRawOne();

    const totalReferrals = await this.referralRepository.count({
      where: { userId, status: 'completed' },
    });

    const levelDistribution = await this.clientRepository
      .createQueryBuilder('client')
      .where('client.organizationId = :organizationId', { organizationId })
      .select('client.level', 'level')
      .addSelect('COUNT(*)', 'count')
      .groupBy('client.level')
      .getRawMany();

    const topReferrers = await this.clientRepository
      .createQueryBuilder('client')
      .where('client.organizationId = :organizationId', { organizationId })
      .andWhere('client.successfulReferrals > 0')
      .orderBy('client.successfulReferrals', 'DESC')
      .take(5)
      .getMany();

    return {
      enabled: settings.enabled,
      totalPointsIssued: parseInt(totalPointsIssued?.total || '0', 10),
      totalReferrals,
      levelDistribution,
      topReferrers: topReferrers.map(c => ({
        id: c.id,
        name: c.name,
        referrals: c.successfulReferrals,
        level: c.level,
      })),
    };
  }
}
