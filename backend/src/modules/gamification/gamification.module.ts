import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GamificationService } from './gamification.service';
import { GamificationController } from './gamification.controller';
import { PublicGamificationController } from './public-gamification.controller';
import { GamificationSettings } from './entities/gamification-settings.entity';
import { Referral } from './entities/referral.entity';
import { ClientReward } from './entities/client-reward.entity';
import { PointsHistory } from './entities/points-history.entity';
import { Client } from '../clients/entities/client.entity';
import { BookingLink } from '../booking-links/entities/booking-link.entity';
import { AuthModule } from '../auth/auth.module';
import { VirtualPet } from './entities/virtual-pet.entity';
import { PetInventoryItem } from './entities/pet-item.entity';
import { VirtualPetService } from './virtual-pet.service';
import { PublicVirtualPetController } from './public-virtual-pet.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      GamificationSettings,
      Referral,
      ClientReward,
      PointsHistory,
      Client,
      BookingLink,
      VirtualPet,
      PetInventoryItem,
    ]),
    AuthModule,
  ],
  controllers: [GamificationController, PublicGamificationController, PublicVirtualPetController],
  providers: [GamificationService, VirtualPetService],
  exports: [GamificationService, VirtualPetService],
})
export class GamificationModule {}
