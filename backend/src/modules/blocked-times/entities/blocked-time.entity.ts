import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Check,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { ExternalProvider } from '../../external-providers/entities/external-provider.entity';

// Transformer to ensure HH:mm format (strips seconds from PostgreSQL time type)
const timeTransformer = {
  from: (value: string | null): string | null => {
    if (!value) return value;
    // PostgreSQL returns time as HH:MM:SS, strip seconds
    const parts = value.split(':');
    return parts.length >= 2 ? `${parts[0]}:${parts[1]}` : value;
  },
  to: (value: string | null): string | null => value,
};

@Entity('blocked_times')
@Check(`"userId" IS NOT NULL OR "externalProviderId" IS NOT NULL`)
export class BlockedTime {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'time', nullable: true, transformer: timeTransformer })
  startTime: string;

  @Column({ type: 'time', nullable: true, transformer: timeTransformer })
  endTime: string;

  @Column({ default: false, comment: 'If true, blocks the entire day' })
  isFullDay: boolean;

  @Column({ nullable: true })
  reason: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  userId: string;

  @ManyToOne(() => User, (user) => user.blockedTimes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ nullable: true })
  externalProviderId: string;

  @ManyToOne(() => ExternalProvider, (ep) => ep.blockedTimes, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'externalProviderId' })
  externalProvider: ExternalProvider;
}
