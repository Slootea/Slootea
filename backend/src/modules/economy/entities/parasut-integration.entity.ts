import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { ParasutSyncStatus } from './enums';

export { ParasutSyncStatus };

@Entity('parasut_integrations')
@Index(['organizationId'], { unique: true })
export class ParasutIntegration {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ comment: 'Organization ID for multi-tenant isolation' })
  organizationId: string;

  @Column({ type: 'varchar' })
  companyId: string;

  @Column({ type: 'text' })
  accessToken: string;

  @Column({ type: 'text' })
  refreshToken: string;

  @Column({ type: 'varchar', nullable: true })
  username: string;

  @Column({ type: 'timestamp' })
  tokenExpiresAt: Date;

  @Column({
    type: 'enum',
    enum: ParasutSyncStatus,
    enumName: 'parasut_integrations_syncstatus_enum',
    default: ParasutSyncStatus.IDLE,
  })
  syncStatus: ParasutSyncStatus;

  @Column({ type: 'timestamp', nullable: true })
  lastSyncAt: Date;

  @Column({ type: 'text', nullable: true })
  lastSyncError: string | null;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
