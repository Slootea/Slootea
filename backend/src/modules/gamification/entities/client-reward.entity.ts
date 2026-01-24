import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Client } from '../../clients/entities/client.entity';

@Entity('client_rewards')
export class ClientReward {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  clientId: string;

  @ManyToOne(() => Client, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'clientId' })
  client: Client;

  @Column()
  rewardType: 'spin_wheel' | 'level_up' | 'referral_bonus' | 'streak_bonus' | 'manual';

  @Column()
  rewardName: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column()
  valueType: 'points' | 'discount' | 'freebie';

  @Column({ type: 'int', default: 0 })
  value: number;

  @Column({ default: false })
  isRedeemed: boolean;

  @Column({ type: 'timestamp', nullable: true })
  redeemedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @Column()
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;
}
