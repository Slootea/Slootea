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

@Entity('referrals')
@Index(['userId', 'referralCode'], { unique: true })
export class Referral {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  referralCode: string;

  @Column()
  referrerId: string;

  @ManyToOne(() => Client, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'referrerId' })
  referrer: Client;

  @Column({ nullable: true })
  referredId: string;

  @ManyToOne(() => Client, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'referredId' })
  referred: Client;

  @Column({ default: 'pending' })
  status: 'pending' | 'completed' | 'expired';

  @Column({ type: 'int', default: 0 })
  pointsAwarded: number;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @Column()
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;
}
