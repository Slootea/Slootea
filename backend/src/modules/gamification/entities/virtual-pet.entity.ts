import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Client } from '../../clients/entities/client.entity';

export type PetType = 'cat' | 'dog' | 'bunny' | 'hamster' | 'bird';
export type PetStage = 'egg' | 'baby' | 'teen' | 'adult' | 'elder';
export type PetMood = 'ecstatic' | 'happy' | 'content' | 'sad' | 'hungry' | 'sleepy';

@Entity('virtual_pets')
export class VirtualPet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'varchar', default: 'cat' })
  type: PetType;

  @Column({ type: 'varchar', default: 'egg' })
  stage: PetStage;

  @Column({ type: 'int', default: 0 })
  experience: number;

  @Column({ type: 'int', default: 100 })
  hunger: number; // 0-100, lower = more hungry

  @Column({ type: 'int', default: 100 })
  happiness: number; // 0-100

  @Column({ type: 'int', default: 100 })
  energy: number; // 0-100

  @Column({ type: 'int', default: 1 })
  level: number;

  @Column({ type: 'simple-json', nullable: true })
  accessories: string[]; // equipped accessory IDs

  @Column({ type: 'simple-json', nullable: true })
  playgroundItems: PlacedItem[]; // items placed in playground

  @Column({ type: 'timestamp', nullable: true })
  lastFedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastPlayedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastPettedAt: Date;

  @Column({ type: 'int', default: 0 })
  totalTimesPlayed: number;

  @Column({ type: 'int', default: 0 })
  totalTimesFed: number;

  @Column()
  clientId: string;

  @ManyToOne(() => Client, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'clientId' })
  client: Client;

  @Column()
  userId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

export interface PlacedItem {
  itemId: string;
  x: number; // position 0-100 (percentage)
  y: number; // position 0-100 (percentage)
  rotation?: number;
}

// Stage thresholds
export const stageThresholds: Record<PetStage, number> = {
  egg: 0,
  baby: 100,
  teen: 500,
  adult: 1500,
  elder: 5000,
};

// Experience needed per level
export const experiencePerLevel = (level: number) => level * 100;

// Calculate pet mood based on stats
export function calculateMood(pet: VirtualPet): PetMood {
  if (pet.hunger < 20) return 'hungry';
  if (pet.energy < 20) return 'sleepy';
  if (pet.happiness >= 90 && pet.hunger >= 80) return 'ecstatic';
  if (pet.happiness >= 70) return 'happy';
  if (pet.happiness >= 40) return 'content';
  return 'sad';
}

// Calculate stage from experience
export function calculateStage(experience: number): PetStage {
  if (experience >= stageThresholds.elder) return 'elder';
  if (experience >= stageThresholds.adult) return 'adult';
  if (experience >= stageThresholds.teen) return 'teen';
  if (experience >= stageThresholds.baby) return 'baby';
  return 'egg';
}
