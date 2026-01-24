import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Client } from '../../clients/entities/client.entity';

export type ItemType = 'food' | 'toy' | 'accessory' | 'decoration';
export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'legendary';

@Entity('pet_inventory_items')
export class PetInventoryItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  itemId: string; // References shop item

  @Column()
  name: string;

  @Column({ type: 'varchar' })
  type: ItemType;

  @Column({ type: 'int', default: 1 })
  quantity: number;

  @Column()
  clientId: string;

  @ManyToOne(() => Client, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'clientId' })
  client: Client;

  @Column()
  userId: string;

  @CreateDateColumn()
  acquiredAt: Date;
}

// Shop items configuration
export interface ShopItem {
  id: string;
  name: string;
  description: string;
  type: ItemType;
  rarity: ItemRarity;
  price: number; // in points
  effect?: {
    hunger?: number; // amount to increase
    happiness?: number;
    energy?: number;
    experience?: number;
  };
  emoji: string;
  unlockLevel?: number; // minimum pet level to purchase
}

export const defaultShopItems: ShopItem[] = [
  // Food items
  {
    id: 'food_basic',
    name: 'Basic Kibble',
    description: 'Simple but nutritious food for your pet',
    type: 'food',
    rarity: 'common',
    price: 10,
    effect: { hunger: 20, experience: 5 },
    emoji: '🍖',
  },
  {
    id: 'food_premium',
    name: 'Premium Meal',
    description: 'Delicious gourmet meal that your pet will love',
    type: 'food',
    rarity: 'uncommon',
    price: 25,
    effect: { hunger: 40, happiness: 10, experience: 10 },
    emoji: '🥩',
  },
  {
    id: 'food_treat',
    name: 'Special Treat',
    description: 'A special treat that makes your pet very happy',
    type: 'food',
    rarity: 'rare',
    price: 50,
    effect: { hunger: 15, happiness: 30, experience: 20 },
    emoji: '🍰',
  },
  {
    id: 'food_golden',
    name: 'Golden Feast',
    description: 'The ultimate meal fit for a legendary pet',
    type: 'food',
    rarity: 'legendary',
    price: 100,
    effect: { hunger: 100, happiness: 50, experience: 50 },
    emoji: '✨',
    unlockLevel: 5,
  },
  // Toy items
  {
    id: 'toy_ball',
    name: 'Bouncy Ball',
    description: 'A colorful ball for endless fun',
    type: 'toy',
    rarity: 'common',
    price: 30,
    effect: { happiness: 20, energy: -10, experience: 10 },
    emoji: '⚽',
  },
  {
    id: 'toy_rope',
    name: 'Rope Toy',
    description: 'Perfect for tug-of-war games',
    type: 'toy',
    rarity: 'common',
    price: 35,
    effect: { happiness: 25, energy: -15, experience: 12 },
    emoji: '🧶',
  },
  {
    id: 'toy_squeaky',
    name: 'Squeaky Toy',
    description: 'Makes fun sounds when played with',
    type: 'toy',
    rarity: 'uncommon',
    price: 50,
    effect: { happiness: 35, energy: -10, experience: 15 },
    emoji: '🦆',
  },
  {
    id: 'toy_laser',
    name: 'Laser Pointer',
    description: 'Chase the red dot! Endless entertainment',
    type: 'toy',
    rarity: 'rare',
    price: 80,
    effect: { happiness: 50, energy: -20, experience: 25 },
    emoji: '🔴',
    unlockLevel: 3,
  },
  {
    id: 'toy_magic',
    name: 'Magic Wand',
    description: 'A mystical toy that never gets boring',
    type: 'toy',
    rarity: 'legendary',
    price: 150,
    effect: { happiness: 80, experience: 40 },
    emoji: '🪄',
    unlockLevel: 8,
  },
  // Decoration items (for playground)
  {
    id: 'deco_bed',
    name: 'Cozy Bed',
    description: 'A comfortable bed for your pet to rest',
    type: 'decoration',
    rarity: 'common',
    price: 50,
    emoji: '🛏️',
  },
  {
    id: 'deco_house',
    name: 'Pet House',
    description: 'A cute little house for your pet',
    type: 'decoration',
    rarity: 'uncommon',
    price: 100,
    emoji: '🏠',
  },
  {
    id: 'deco_tree',
    name: 'Climbing Tree',
    description: 'Perfect for climbing and scratching',
    type: 'decoration',
    rarity: 'uncommon',
    price: 120,
    emoji: '🌳',
  },
  {
    id: 'deco_fountain',
    name: 'Water Fountain',
    description: 'A beautiful fountain for the playground',
    type: 'decoration',
    rarity: 'rare',
    price: 200,
    emoji: '⛲',
    unlockLevel: 4,
  },
  {
    id: 'deco_castle',
    name: 'Pet Castle',
    description: 'A magnificent castle for your royal pet',
    type: 'decoration',
    rarity: 'legendary',
    price: 500,
    emoji: '🏰',
    unlockLevel: 10,
  },
  // Accessories
  {
    id: 'acc_bow',
    name: 'Cute Bow',
    description: 'A pretty bow to accessorize your pet',
    type: 'accessory',
    rarity: 'common',
    price: 40,
    emoji: '🎀',
  },
  {
    id: 'acc_hat',
    name: 'Party Hat',
    description: 'Let your pet join the celebration!',
    type: 'accessory',
    rarity: 'uncommon',
    price: 60,
    emoji: '🎩',
  },
  {
    id: 'acc_glasses',
    name: 'Cool Sunglasses',
    description: 'The coolest pet on the block',
    type: 'accessory',
    rarity: 'rare',
    price: 100,
    emoji: '🕶️',
    unlockLevel: 3,
  },
  {
    id: 'acc_crown',
    name: 'Royal Crown',
    description: 'For the true king or queen of pets',
    type: 'accessory',
    rarity: 'legendary',
    price: 300,
    emoji: '👑',
    unlockLevel: 7,
  },
];

export const getShopItem = (itemId: string): ShopItem | undefined => {
  return defaultShopItems.find(item => item.id === itemId);
};
