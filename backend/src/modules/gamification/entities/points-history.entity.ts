import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Client } from '../../clients/entities/client.entity';

export type PointsTransactionType =
  | 'booking'
  | 'completed_appointment'
  | 'referral_sent'
  | 'referral_received'
  | 'streak_bonus'
  | 'spin_wheel'
  | 'redemption'
  | 'manual_adjustment'
  | 'expired';

@Entity('points_history')
@Index(['clientId', 'createdAt'])
export class PointsHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  clientId: string;

  @ManyToOne(() => Client, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'clientId' })
  client: Client;

  @Column()
  transactionType: PointsTransactionType;

  @Column({ type: 'int' })
  points: number; // positive for earned, negative for spent

  @Column({ type: 'int' })
  balanceAfter: number;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ nullable: true })
  relatedEntityId: string; // appointment id, referral id, etc.

  @CreateDateColumn()
  createdAt: Date;

  @Column()
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;
}
