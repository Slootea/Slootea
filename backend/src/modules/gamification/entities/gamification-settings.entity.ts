import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('gamification_settings')
export class GamificationSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ default: false })
  enabled: boolean;

  // Points configuration
  @Column({ type: 'int', default: 100 })
  pointsPerBooking: number;

  @Column({ type: 'int', default: 50 })
  pointsPerCompletedAppointment: number;

  @Column({ type: 'int', default: 200 })
  pointsPerReferral: number;

  @Column({ type: 'int', default: 100 })
  pointsForReferred: number; // Points for the person being referred

  @Column({ type: 'int', default: 25 })
  streakBonusPoints: number; // Bonus per consecutive appointment

  // Level thresholds
  @Column({ type: 'int', default: 0 })
  bronzeThreshold: number;

  @Column({ type: 'int', default: 500 })
  silverThreshold: number;

  @Column({ type: 'int', default: 1500 })
  goldThreshold: number;

  @Column({ type: 'int', default: 5000 })
  platinumThreshold: number;

  // Rewards configuration
  @Column({ type: 'int', default: 0 })
  bronzeDiscount: number; // percentage

  @Column({ type: 'int', default: 5 })
  silverDiscount: number;

  @Column({ type: 'int', default: 10 })
  goldDiscount: number;

  @Column({ type: 'int', default: 15 })
  platinumDiscount: number;

  // Spin wheel configuration
  @Column({ default: true })
  spinWheelEnabled: boolean;

  @Column({ type: 'simple-json', nullable: true })
  spinWheelPrizes: SpinWheelPrize[];

  // Referral configuration
  @Column({ default: true })
  referralsEnabled: boolean;

  @Column({ type: 'int', default: 0, comment: 'Max referrals per client, 0 = unlimited' })
  maxReferralsPerClient: number;

  // Virtual pet configuration
  @Column({ default: false })
  virtualPetEnabled: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ unique: true })
  userId: string;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;
}

export interface SpinWheelPrize {
  id: string;
  name: string;
  type: 'points' | 'discount' | 'freebie' | 'nothing';
  value: number; // points amount, discount %, or 0 for freebie
  description?: string;
  probability: number; // 0-100, total should be 100
  color: string;
}

export const defaultSpinWheelPrizes: SpinWheelPrize[] = [
  { id: '1', name: '50 Points', type: 'points', value: 50, probability: 30, color: '#3B82F6' },
  { id: '2', name: '100 Points', type: 'points', value: 100, probability: 20, color: '#10B981' },
  { id: '3', name: '5% Off', type: 'discount', value: 5, probability: 15, color: '#F59E0B' },
  { id: '4', name: '200 Points', type: 'points', value: 200, probability: 10, color: '#8B5CF6' },
  { id: '5', name: '10% Off', type: 'discount', value: 10, probability: 5, color: '#EC4899' },
  { id: '6', name: 'Try Again', type: 'nothing', value: 0, probability: 20, color: '#6B7280' },
];
