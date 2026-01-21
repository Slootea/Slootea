import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export type ClientLevel = 'bronze' | 'silver' | 'gold' | 'platinum';

@Entity('clients')
@Index(['userId', 'phone'], { unique: true })
export class Client {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  email: string;

  @Column()
  phone: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ default: 0 })
  totalAppointments: number;

  @Column({ default: 0 })
  completedAppointments: number;

  @Column({ default: 0 })
  cancelledAppointments: number;

  @Column({ default: 0 })
  noShowAppointments: number;

  @Column({ type: 'timestamp', nullable: true })
  lastAppointmentAt: Date;

  // Gamification fields
  @Column({ type: 'int', default: 0 })
  totalPoints: number;

  @Column({ type: 'int', default: 0 })
  availablePoints: number;

  @Column({ default: 'bronze' })
  level: ClientLevel;

  @Column({ type: 'int', default: 0 })
  currentStreak: number;

  @Column({ type: 'int', default: 0 })
  longestStreak: number;

  @Column({ type: 'int', default: 0 })
  totalReferrals: number;

  @Column({ type: 'int', default: 0 })
  successfulReferrals: number;

  @Column({ nullable: true })
  referralCode: string;

  @Column({ nullable: true })
  referredBy: string; // referral code used when signing up

  @Column({ type: 'int', default: 0 })
  spinWheelSpins: number;

  @Column({ type: 'timestamp', nullable: true })
  lastSpinAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column()
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;
}
