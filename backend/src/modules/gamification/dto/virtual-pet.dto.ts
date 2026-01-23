import { IsString, IsOptional, IsInt, IsNumber, Min, Max, IsArray, IsEnum } from 'class-validator';
import { PetType, PlacedItem } from '../entities/virtual-pet.entity';
import { ItemType } from '../entities/pet-item.entity';

export class CreateVirtualPetDto {
  @IsString()
  name: string;

  @IsEnum(['cat', 'dog', 'bunny', 'hamster', 'bird'])
  type: PetType;
}

export class FeedPetDto {
  @IsString()
  itemId: string; // Food item ID from shop/inventory
}

export class PlayWithPetDto {
  @IsString()
  @IsOptional()
  toyId?: string; // Optional toy item ID from inventory

  @IsString()
  @IsOptional()
  action?: 'pet' | 'play' | 'cuddle'; // Direct interactions that don't require items
}

export class BuyItemDto {
  @IsString()
  itemId: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  quantity?: number;
}

export class UseItemDto {
  @IsString()
  itemId: string;
}

export class PlaceItemDto {
  @IsString()
  itemId: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  x: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  y: number;

  @IsNumber()
  @IsOptional()
  rotation?: number;
}

export class RemoveItemDto {
  @IsString()
  itemId: string;
}

export class EquipAccessoryDto {
  @IsString()
  itemId: string;
}

export class UpdatePetNameDto {
  @IsString()
  name: string;
}

// Response DTOs

export class VirtualPetResponseDto {
  id: string;
  name: string;
  type: PetType;
  stage: string;
  experience: number;
  experienceToNextLevel: number;
  hunger: number;
  happiness: number;
  energy: number;
  level: number;
  mood: string;
  accessories: string[];
  playgroundItems: PlacedItem[];
  lastFedAt: Date | null;
  lastPlayedAt: Date | null;
  totalTimesPlayed: number;
  totalTimesFed: number;
  createdAt: Date;
}

export class PetInteractionResultDto {
  pet: VirtualPetResponseDto;
  message: string;
  rewards?: {
    experience?: number;
    happiness?: number;
    hunger?: number;
    energy?: number;
  };
  leveledUp?: boolean;
  stageEvolved?: boolean;
  newStage?: string;
  newLevel?: number;
}

export class ShopItemDto {
  id: string;
  name: string;
  description: string;
  type: ItemType;
  rarity: string;
  price: number;
  effect?: {
    hunger?: number;
    happiness?: number;
    energy?: number;
    experience?: number;
  };
  emoji: string;
  unlockLevel?: number;
  canPurchase: boolean;
  reason?: string;
}

export class InventoryItemDto {
  id: string;
  itemId: string;
  name: string;
  type: ItemType;
  quantity: number;
  emoji: string;
  effect?: {
    hunger?: number;
    happiness?: number;
    energy?: number;
    experience?: number;
  };
}

export class PetShopResponseDto {
  items: ShopItemDto[];
  clientPoints: number;
  petLevel: number;
}

export class PetInventoryResponseDto {
  items: InventoryItemDto[];
  clientPoints: number;
}

export class BuyItemResultDto {
  success: boolean;
  message: string;
  item?: InventoryItemDto;
  pointsSpent: number;
  remainingPoints: number;
}
