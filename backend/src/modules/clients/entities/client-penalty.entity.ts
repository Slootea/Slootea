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
import { Client } from './client.entity';

export enum PenaltyType {
  BAN = 'ban',
  SUSPENSION = 'suspension',
}

export enum PenaltyStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  REMOVED = 'removed',
}

@Entity('client_penalties')
@Index(['clientId', 'organizationId'])
@Index(['organizationId', 'status'])
export class ClientPenalty {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  clientId: string;

  @ManyToOne(() => Client, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'clientId' })
  client: Client;

  @Column()
  organizationId: string;

  @Column({
    type: 'enum',
    enum: PenaltyType,
  })
  type: PenaltyType;

  @Column({
    type: 'enum',
    enum: PenaltyStatus,
    default: PenaltyStatus.ACTIVE,
  })
  status: PenaltyStatus;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date | null; // null for permanent ban

  @Column({ type: 'varchar', nullable: true })
  issuedBy: string | null; // User ID who issued the penalty

  @Column({ type: 'varchar', nullable: true })
  removedBy: string | null; // User ID who removed the penalty

  @Column({ type: 'timestamp', nullable: true })
  removedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  removalReason: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
