import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  BadRequestException,
} from '@nestjs/common';
import { VirtualPetService } from './virtual-pet.service';
import {
  CreateVirtualPetDto,
  FeedPetDto,
  PlayWithPetDto,
  BuyItemDto,
  PlaceItemDto,
  UpdatePetNameDto,
} from './dto/virtual-pet.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BookingLink } from '../booking-links/entities/booking-link.entity';
import { GamificationSettings } from './entities/gamification-settings.entity';

@Controller('public/virtual-pet')
export class PublicVirtualPetController {
  constructor(
    private readonly virtualPetService: VirtualPetService,
    @InjectRepository(BookingLink)
    private readonly bookingLinkRepository: Repository<BookingLink>,
    @InjectRepository(GamificationSettings)
    private readonly settingsRepository: Repository<GamificationSettings>,
  ) {}

  private async validateAndGetUserId(slug: string): Promise<string> {
    const bookingLink = await this.bookingLinkRepository.findOne({
      where: { slug, isActive: true },
    });

    if (!bookingLink) {
      throw new BadRequestException('Invalid booking link');
    }

    const settings = await this.settingsRepository.findOne({
      where: { userId: bookingLink.userId },
    });

    if (!settings?.enabled || !settings?.virtualPetEnabled) {
      throw new BadRequestException('Virtual pet feature is not enabled');
    }

    return bookingLink.userId;
  }

  // Check if virtual pet is enabled
  @Get(':slug/status')
  async getVirtualPetStatus(@Param('slug') slug: string) {
    const bookingLink = await this.bookingLinkRepository.findOne({
      where: { slug, isActive: true },
    });

    if (!bookingLink) {
      throw new BadRequestException('Invalid booking link');
    }

    const settings = await this.settingsRepository.findOne({
      where: { userId: bookingLink.userId },
    });

    return {
      enabled: settings?.enabled && settings?.virtualPetEnabled,
      gamificationEnabled: settings?.enabled,
    };
  }

  // Get pet for client
  @Get(':slug/:clientId')
  async getPet(
    @Param('slug') slug: string,
    @Param('clientId') clientId: string,
  ) {
    const userId = await this.validateAndGetUserId(slug);
    return this.virtualPetService.getPet(clientId, userId);
  }

  // Create a new pet
  @Post(':slug/:clientId')
  async createPet(
    @Param('slug') slug: string,
    @Param('clientId') clientId: string,
    @Body() createDto: CreateVirtualPetDto,
  ) {
    const userId = await this.validateAndGetUserId(slug);
    return this.virtualPetService.createPet(clientId, userId, createDto);
  }

  // Feed pet
  @Post(':slug/:clientId/feed')
  async feedPet(
    @Param('slug') slug: string,
    @Param('clientId') clientId: string,
    @Body() feedDto: FeedPetDto,
  ) {
    const userId = await this.validateAndGetUserId(slug);
    return this.virtualPetService.feedPet(clientId, userId, feedDto);
  }

  // Play with pet
  @Post(':slug/:clientId/play')
  async playWithPet(
    @Param('slug') slug: string,
    @Param('clientId') clientId: string,
    @Body() playDto: PlayWithPetDto,
  ) {
    const userId = await this.validateAndGetUserId(slug);
    return this.virtualPetService.playWithPet(clientId, userId, playDto);
  }

  // Get shop items
  @Get(':slug/:clientId/shop')
  async getShopItems(
    @Param('slug') slug: string,
    @Param('clientId') clientId: string,
  ) {
    const userId = await this.validateAndGetUserId(slug);
    return this.virtualPetService.getShopItems(clientId, userId);
  }

  // Buy item
  @Post(':slug/:clientId/buy')
  async buyItem(
    @Param('slug') slug: string,
    @Param('clientId') clientId: string,
    @Body() buyDto: BuyItemDto,
  ) {
    const userId = await this.validateAndGetUserId(slug);
    return this.virtualPetService.buyItem(clientId, userId, buyDto);
  }

  // Get inventory
  @Get(':slug/:clientId/inventory')
  async getInventory(
    @Param('slug') slug: string,
    @Param('clientId') clientId: string,
  ) {
    const userId = await this.validateAndGetUserId(slug);
    return this.virtualPetService.getInventory(clientId, userId);
  }

  // Place decoration in playground
  @Post(':slug/:clientId/place-item')
  async placeItem(
    @Param('slug') slug: string,
    @Param('clientId') clientId: string,
    @Body() placeDto: PlaceItemDto,
  ) {
    const userId = await this.validateAndGetUserId(slug);
    return this.virtualPetService.placeItem(clientId, userId, placeDto);
  }

  // Remove decoration from playground
  @Delete(':slug/:clientId/playground-item/:itemId')
  async removeItem(
    @Param('slug') slug: string,
    @Param('clientId') clientId: string,
    @Param('itemId') itemId: string,
  ) {
    const userId = await this.validateAndGetUserId(slug);
    return this.virtualPetService.removeItem(clientId, userId, itemId);
  }

  // Equip/unequip accessory
  @Post(':slug/:clientId/equip/:itemId')
  async equipAccessory(
    @Param('slug') slug: string,
    @Param('clientId') clientId: string,
    @Param('itemId') itemId: string,
  ) {
    const userId = await this.validateAndGetUserId(slug);
    return this.virtualPetService.equipAccessory(clientId, userId, itemId);
  }

  // Update pet name
  @Put(':slug/:clientId/name')
  async updatePetName(
    @Param('slug') slug: string,
    @Param('clientId') clientId: string,
    @Body() updateDto: UpdatePetNameDto,
  ) {
    const userId = await this.validateAndGetUserId(slug);
    return this.virtualPetService.updatePetName(clientId, userId, updateDto.name);
  }
}
