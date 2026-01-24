import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { GamificationService } from './gamification.service';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import {
  UpdateGamificationSettingsDto,
  UpdateClientGamificationDto,
  AdjustPointsDto,
  ValidateReferralDto,
} from './dto/gamification.dto';

@Controller('gamification')
@UseGuards(ClerkAuthGuard)
export class GamificationController {
  constructor(private readonly gamificationService: GamificationService) {}

  // Settings endpoints
  @Get('settings')
  async getSettings(@Request() req: any) {
    return this.gamificationService.getSettings(req.user.dbUserId);
  }

  @Put('settings')
  async updateSettings(
    @Request() req: any,
    @Body() updateDto: UpdateGamificationSettingsDto,
  ) {
    return this.gamificationService.updateSettings(req.user.dbUserId, updateDto);
  }

  // Dashboard stats
  @Get('stats')
  async getStats(@Request() req: any) {
    return this.gamificationService.getGamificationStats(req.user.dbUserId);
  }

  // Client gamification endpoints
  @Get('clients/:clientId')
  async getClientGamification(
    @Request() req: any,
    @Param('clientId') clientId: string,
  ) {
    return this.gamificationService.getClientGamificationSummary(clientId, req.user.dbUserId);
  }

  @Put('clients/:clientId')
  async updateClientGamification(
    @Request() req: any,
    @Param('clientId') clientId: string,
    @Body() updateDto: UpdateClientGamificationDto,
  ) {
    return this.gamificationService.updateClientGamification(clientId, req.user.dbUserId, updateDto);
  }

  @Post('clients/:clientId/adjust-points')
  async adjustPoints(
    @Request() req: any,
    @Param('clientId') clientId: string,
    @Body() adjustDto: AdjustPointsDto,
  ) {
    return this.gamificationService.adjustPoints(
      clientId,
      req.user.dbUserId,
      adjustDto.points,
      adjustDto.reason,
    );
  }

  @Get('clients/:clientId/history')
  async getPointsHistory(
    @Request() req: any,
    @Param('clientId') clientId: string,
    @Query('limit') limit?: number,
  ) {
    return this.gamificationService.getPointsHistory(clientId, req.user.dbUserId, limit || 20);
  }

  @Get('clients/:clientId/rewards')
  async getClientRewards(
    @Request() req: any,
    @Param('clientId') clientId: string,
    @Query('includeRedeemed') includeRedeemed?: boolean,
  ) {
    return this.gamificationService.getClientRewards(clientId, req.user.dbUserId, includeRedeemed);
  }

  @Post('clients/:clientId/generate-referral')
  async generateReferralCode(
    @Request() req: any,
    @Param('clientId') clientId: string,
  ) {
    const code = await this.gamificationService.generateReferralCode(clientId, req.user.dbUserId);
    return { referralCode: code };
  }

  // Rewards
  @Post('rewards/:rewardId/redeem')
  async redeemReward(
    @Request() req: any,
    @Param('rewardId') rewardId: string,
  ) {
    return this.gamificationService.redeemReward(rewardId, req.user.dbUserId);
  }
}
