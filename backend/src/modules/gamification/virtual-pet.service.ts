import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VirtualPet, calculateMood, calculateStage, stageThresholds, experiencePerLevel, PetType, PlacedItem } from './entities/virtual-pet.entity';
import { PetInventoryItem, defaultShopItems, getShopItem, ShopItem } from './entities/pet-item.entity';
import { Client } from '../clients/entities/client.entity';
import {
  CreateVirtualPetDto,
  FeedPetDto,
  PlayWithPetDto,
  BuyItemDto,
  PlaceItemDto,
  VirtualPetResponseDto,
  PetInteractionResultDto,
  ShopItemDto,
  InventoryItemDto,
  PetShopResponseDto,
  PetInventoryResponseDto,
  BuyItemResultDto,
} from './dto/virtual-pet.dto';

@Injectable()
export class VirtualPetService {
  constructor(
    @InjectRepository(VirtualPet)
    private readonly petRepository: Repository<VirtualPet>,
    @InjectRepository(PetInventoryItem)
    private readonly inventoryRepository: Repository<PetInventoryItem>,
    @InjectRepository(Client)
    private readonly clientRepository: Repository<Client>,
  ) {}

  // Get or create pet for a client
  async getOrCreatePet(clientId: string, userId: string): Promise<VirtualPet | null> {
    let pet = await this.petRepository.findOne({
      where: { clientId, userId },
    });

    return pet;
  }

  // Create a new pet
  async createPet(
    clientId: string,
    userId: string,
    createDto: CreateVirtualPetDto,
  ): Promise<VirtualPetResponseDto> {
    const existingPet = await this.petRepository.findOne({
      where: { clientId, userId },
    });

    if (existingPet) {
      throw new BadRequestException('Client already has a pet');
    }

    const pet = this.petRepository.create({
      name: createDto.name,
      type: createDto.type,
      clientId,
      userId,
      stage: 'egg',
      experience: 0,
      hunger: 100,
      happiness: 100,
      energy: 100,
      level: 1,
      accessories: [],
      playgroundItems: [],
    });

    await this.petRepository.save(pet);
    return this.toPetResponse(pet);
  }

  // Get pet by client ID
  async getPet(clientId: string, userId: string): Promise<VirtualPetResponseDto | null> {
    const pet = await this.petRepository.findOne({
      where: { clientId, userId },
    });

    if (!pet) {
      return null;
    }

    // Apply time-based stat decay
    await this.applyStatDecay(pet);
    
    return this.toPetResponse(pet);
  }

  // Feed the pet
  async feedPet(
    clientId: string,
    userId: string,
    feedDto: FeedPetDto,
  ): Promise<PetInteractionResultDto> {
    const pet = await this.petRepository.findOne({
      where: { clientId, userId },
    });

    if (!pet) {
      throw new NotFoundException('Pet not found');
    }

    // Check if item exists in inventory
    const inventoryItem = await this.inventoryRepository.findOne({
      where: { clientId, userId, itemId: feedDto.itemId },
    });

    if (!inventoryItem || inventoryItem.quantity < 1) {
      throw new BadRequestException('Item not in inventory');
    }

    const shopItem = getShopItem(feedDto.itemId);
    if (!shopItem || shopItem.type !== 'food') {
      throw new BadRequestException('Invalid food item');
    }

    // Use the item
    inventoryItem.quantity -= 1;
    if (inventoryItem.quantity <= 0) {
      await this.inventoryRepository.remove(inventoryItem);
    } else {
      await this.inventoryRepository.save(inventoryItem);
    }

    // Apply effects
    const oldStage = pet.stage;
    const oldLevel = pet.level;

    if (shopItem.effect) {
      pet.hunger = Math.min(100, pet.hunger + (shopItem.effect.hunger || 0));
      pet.happiness = Math.min(100, pet.happiness + (shopItem.effect.happiness || 0));
      pet.energy = Math.min(100, pet.energy + (shopItem.effect.energy || 0));
      pet.experience += shopItem.effect.experience || 0;
    }

    pet.lastFedAt = new Date();
    pet.totalTimesFed += 1;

    // Check for level up and stage evolution
    const { leveledUp, stageEvolved } = this.checkEvolution(pet);

    await this.petRepository.save(pet);

    return {
      pet: this.toPetResponse(pet),
      message: `Fed ${pet.name} with ${shopItem.name}!`,
      rewards: shopItem.effect,
      leveledUp,
      stageEvolved,
      newStage: stageEvolved ? pet.stage : undefined,
      newLevel: leveledUp ? pet.level : undefined,
    };
  }

  // Play with the pet
  async playWithPet(
    clientId: string,
    userId: string,
    playDto: PlayWithPetDto,
  ): Promise<PetInteractionResultDto> {
    const pet = await this.petRepository.findOne({
      where: { clientId, userId },
    });

    if (!pet) {
      throw new NotFoundException('Pet not found');
    }

    // Check energy
    if (pet.energy < 10) {
      throw new BadRequestException('Pet is too tired to play. Let them rest!');
    }

    const oldStage = pet.stage;
    const oldLevel = pet.level;
    let rewards: any = {};
    let message = '';

    if (playDto.toyId) {
      // Play with a toy from inventory
      const inventoryItem = await this.inventoryRepository.findOne({
        where: { clientId, userId, itemId: playDto.toyId },
      });

      if (!inventoryItem) {
        throw new BadRequestException('Toy not in inventory');
      }

      const shopItem = getShopItem(playDto.toyId);
      if (!shopItem || shopItem.type !== 'toy') {
        throw new BadRequestException('Invalid toy item');
      }

      // Apply effects (toys don't get consumed, but have effects)
      if (shopItem.effect) {
        pet.happiness = Math.min(100, pet.happiness + (shopItem.effect.happiness || 0));
        pet.energy = Math.max(0, pet.energy + (shopItem.effect.energy || 0)); // energy can be negative (consumed)
        pet.experience += shopItem.effect.experience || 0;
      }

      rewards = shopItem.effect;
      message = `Played with ${pet.name} using ${shopItem.name}!`;
    } else {
      // Direct interaction
      const action = playDto.action || 'pet';
      
      switch (action) {
        case 'pet':
          pet.happiness = Math.min(100, pet.happiness + 10);
          pet.experience += 5;
          rewards = { happiness: 10, experience: 5 };
          message = `Petted ${pet.name}! They loved it!`;
          break;
        case 'play':
          pet.happiness = Math.min(100, pet.happiness + 15);
          pet.energy = Math.max(0, pet.energy - 10);
          pet.experience += 8;
          rewards = { happiness: 15, energy: -10, experience: 8 };
          message = `Played with ${pet.name}! So much fun!`;
          break;
        case 'cuddle':
          pet.happiness = Math.min(100, pet.happiness + 20);
          pet.energy = Math.min(100, pet.energy + 5);
          pet.experience += 10;
          rewards = { happiness: 20, energy: 5, experience: 10 };
          message = `Cuddled with ${pet.name}! They feel so loved!`;
          break;
      }
    }

    pet.lastPlayedAt = new Date();
    pet.totalTimesPlayed += 1;

    // Check for level up and stage evolution
    const { leveledUp, stageEvolved } = this.checkEvolution(pet);

    await this.petRepository.save(pet);

    return {
      pet: this.toPetResponse(pet),
      message,
      rewards,
      leveledUp,
      stageEvolved,
      newStage: stageEvolved ? pet.stage : undefined,
      newLevel: leveledUp ? pet.level : undefined,
    };
  }

  // Buy item from shop
  async buyItem(
    clientId: string,
    userId: string,
    buyDto: BuyItemDto,
  ): Promise<BuyItemResultDto> {
    const client = await this.clientRepository.findOne({
      where: { id: clientId, userId },
    });

    if (!client) {
      throw new NotFoundException('Client not found');
    }

    const shopItem = getShopItem(buyDto.itemId);
    if (!shopItem) {
      throw new BadRequestException('Item not found in shop');
    }

    const quantity = buyDto.quantity || 1;
    const totalCost = shopItem.price * quantity;

    // Check if client has enough points
    if (client.availablePoints < totalCost) {
      return {
        success: false,
        message: `Not enough points. Need ${totalCost}, have ${client.availablePoints}`,
        pointsSpent: 0,
        remainingPoints: client.availablePoints,
      };
    }

    // Check pet level requirement
    if (shopItem.unlockLevel) {
      const pet = await this.petRepository.findOne({
        where: { clientId, userId },
      });
      
      if (!pet || pet.level < shopItem.unlockLevel) {
        return {
          success: false,
          message: `Pet must be level ${shopItem.unlockLevel} to buy this item`,
          pointsSpent: 0,
          remainingPoints: client.availablePoints,
        };
      }
    }

    // Deduct points
    client.availablePoints -= totalCost;
    await this.clientRepository.save(client);

    // Add to inventory
    let inventoryItem = await this.inventoryRepository.findOne({
      where: { clientId, userId, itemId: buyDto.itemId },
    });

    if (inventoryItem) {
      inventoryItem.quantity += quantity;
    } else {
      inventoryItem = this.inventoryRepository.create({
        clientId,
        userId,
        itemId: buyDto.itemId,
        name: shopItem.name,
        type: shopItem.type,
        quantity,
      });
    }

    await this.inventoryRepository.save(inventoryItem);

    return {
      success: true,
      message: `Purchased ${quantity}x ${shopItem.name}!`,
      item: {
        id: inventoryItem.id,
        itemId: inventoryItem.itemId,
        name: inventoryItem.name,
        type: inventoryItem.type,
        quantity: inventoryItem.quantity,
        emoji: shopItem.emoji,
        effect: shopItem.effect,
      },
      pointsSpent: totalCost,
      remainingPoints: client.availablePoints,
    };
  }

  // Get shop items
  async getShopItems(clientId: string, userId: string): Promise<PetShopResponseDto> {
    const client = await this.clientRepository.findOne({
      where: { id: clientId, userId },
    });

    if (!client) {
      throw new NotFoundException('Client not found');
    }

    const pet = await this.petRepository.findOne({
      where: { clientId, userId },
    });

    const petLevel = pet?.level || 1;

    const items: ShopItemDto[] = defaultShopItems.map(item => {
      let canPurchase = true;
      let reason: string | undefined;

      if (client.availablePoints < item.price) {
        canPurchase = false;
        reason = 'Not enough points';
      } else if (item.unlockLevel && petLevel < item.unlockLevel) {
        canPurchase = false;
        reason = `Requires pet level ${item.unlockLevel}`;
      }

      return {
        ...item,
        canPurchase,
        reason,
      };
    });

    return {
      items,
      clientPoints: client.availablePoints,
      petLevel,
    };
  }

  // Get inventory
  async getInventory(clientId: string, userId: string): Promise<PetInventoryResponseDto> {
    const client = await this.clientRepository.findOne({
      where: { id: clientId, userId },
    });

    if (!client) {
      throw new NotFoundException('Client not found');
    }

    const inventoryItems = await this.inventoryRepository.find({
      where: { clientId, userId },
    });

    const items: InventoryItemDto[] = inventoryItems.map(inv => {
      const shopItem = getShopItem(inv.itemId);
      return {
        id: inv.id,
        itemId: inv.itemId,
        name: inv.name,
        type: inv.type,
        quantity: inv.quantity,
        emoji: shopItem?.emoji || '📦',
        effect: shopItem?.effect,
      };
    });

    return {
      items,
      clientPoints: client.availablePoints,
    };
  }

  // Place decoration in playground
  async placeItem(
    clientId: string,
    userId: string,
    placeDto: PlaceItemDto,
  ): Promise<VirtualPetResponseDto> {
    const pet = await this.petRepository.findOne({
      where: { clientId, userId },
    });

    if (!pet) {
      throw new NotFoundException('Pet not found');
    }

    // Check if item is in inventory
    const inventoryItem = await this.inventoryRepository.findOne({
      where: { clientId, userId, itemId: placeDto.itemId },
    });

    if (!inventoryItem) {
      throw new BadRequestException('Item not in inventory');
    }

    const shopItem = getShopItem(placeDto.itemId);
    if (!shopItem || shopItem.type !== 'decoration') {
      throw new BadRequestException('Only decoration items can be placed');
    }

    // Add or update item placement
    const playgroundItems = pet.playgroundItems || [];
    const existingIndex = playgroundItems.findIndex(p => p.itemId === placeDto.itemId);

    const placedItem: PlacedItem = {
      itemId: placeDto.itemId,
      x: placeDto.x,
      y: placeDto.y,
      rotation: placeDto.rotation || 0,
    };

    if (existingIndex >= 0) {
      playgroundItems[existingIndex] = placedItem;
    } else {
      playgroundItems.push(placedItem);
    }

    pet.playgroundItems = playgroundItems;
    await this.petRepository.save(pet);

    return this.toPetResponse(pet);
  }

  // Remove decoration from playground
  async removeItem(
    clientId: string,
    userId: string,
    itemId: string,
  ): Promise<VirtualPetResponseDto> {
    const pet = await this.petRepository.findOne({
      where: { clientId, userId },
    });

    if (!pet) {
      throw new NotFoundException('Pet not found');
    }

    const playgroundItems = pet.playgroundItems || [];
    pet.playgroundItems = playgroundItems.filter(p => p.itemId !== itemId);

    await this.petRepository.save(pet);
    return this.toPetResponse(pet);
  }

  // Equip accessory
  async equipAccessory(
    clientId: string,
    userId: string,
    itemId: string,
  ): Promise<VirtualPetResponseDto> {
    const pet = await this.petRepository.findOne({
      where: { clientId, userId },
    });

    if (!pet) {
      throw new NotFoundException('Pet not found');
    }

    // Check if item is in inventory
    const inventoryItem = await this.inventoryRepository.findOne({
      where: { clientId, userId, itemId },
    });

    if (!inventoryItem) {
      throw new BadRequestException('Item not in inventory');
    }

    const shopItem = getShopItem(itemId);
    if (!shopItem || shopItem.type !== 'accessory') {
      throw new BadRequestException('Only accessories can be equipped');
    }

    // Toggle accessory
    const accessories = pet.accessories || [];
    const index = accessories.indexOf(itemId);
    
    if (index >= 0) {
      accessories.splice(index, 1); // Unequip
    } else {
      accessories.push(itemId); // Equip
    }

    pet.accessories = accessories;
    await this.petRepository.save(pet);

    return this.toPetResponse(pet);
  }

  // Update pet name
  async updatePetName(
    clientId: string,
    userId: string,
    name: string,
  ): Promise<VirtualPetResponseDto> {
    const pet = await this.petRepository.findOne({
      where: { clientId, userId },
    });

    if (!pet) {
      throw new NotFoundException('Pet not found');
    }

    pet.name = name;
    await this.petRepository.save(pet);

    return this.toPetResponse(pet);
  }

  // Private helper methods

  private async applyStatDecay(pet: VirtualPet): Promise<void> {
    const now = new Date();
    const lastUpdate = pet.updatedAt || pet.createdAt;
    const hoursSinceUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60);

    // Decay rates per hour
    const hungerDecay = 2; // -2 per hour
    const happinessDecay = 1; // -1 per hour
    const energyRecovery = 5; // +5 per hour (rest recovers energy)

    if (hoursSinceUpdate >= 1) {
      const decayMultiplier = Math.min(hoursSinceUpdate, 24); // Cap at 24 hours
      
      pet.hunger = Math.max(0, pet.hunger - (hungerDecay * decayMultiplier));
      pet.happiness = Math.max(0, pet.happiness - (happinessDecay * decayMultiplier));
      pet.energy = Math.min(100, pet.energy + (energyRecovery * decayMultiplier));

      await this.petRepository.save(pet);
    }
  }

  private checkEvolution(pet: VirtualPet): { leveledUp: boolean; stageEvolved: boolean } {
    let leveledUp = false;
    let stageEvolved = false;

    // Check level up
    while (pet.experience >= experiencePerLevel(pet.level + 1)) {
      pet.level += 1;
      leveledUp = true;
    }

    // Check stage evolution
    const newStage = calculateStage(pet.experience);
    if (newStage !== pet.stage) {
      pet.stage = newStage;
      stageEvolved = true;
    }

    return { leveledUp, stageEvolved };
  }

  private toPetResponse(pet: VirtualPet): VirtualPetResponseDto {
    return {
      id: pet.id,
      name: pet.name,
      type: pet.type,
      stage: pet.stage,
      experience: pet.experience,
      experienceToNextLevel: experiencePerLevel(pet.level + 1) - pet.experience,
      hunger: pet.hunger,
      happiness: pet.happiness,
      energy: pet.energy,
      level: pet.level,
      mood: calculateMood(pet),
      accessories: pet.accessories || [],
      playgroundItems: pet.playgroundItems || [],
      lastFedAt: pet.lastFedAt,
      lastPlayedAt: pet.lastPlayedAt,
      totalTimesPlayed: pet.totalTimesPlayed,
      totalTimesFed: pet.totalTimesFed,
      createdAt: pet.createdAt,
    };
  }
}
