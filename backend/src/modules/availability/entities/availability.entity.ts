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
import { ServiceOption } from '../../service-options/entities/service-option.entity';
import { ExternalProvider } from '../../external-providers/entities/external-provider.entity';

export enum DayOfWeek {
  MONDAY = 0,
  TUESDAY = 1,
  WEDNESDAY = 2,
  THURSDAY = 3,
  FRIDAY = 4,
  SATURDAY = 5,
  SUNDAY = 6,
}

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

@Entity('availabilities')
@Check(`"userId" IS NOT NULL OR "externalProviderId" IS NOT NULL`)
export class Availability {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: DayOfWeek,
  })
  dayOfWeek: DayOfWeek;

  @Column({ type: 'time', transformer: timeTransformer })
  startTime: string;

  @Column({ type: 'time', transformer: timeTransformer })
  endTime: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  userId: string;

  @ManyToOne(() => User, (user) => user.availabilities, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ nullable: true })
  externalProviderId: string;

  @ManyToOne(() => ExternalProvider, (ep) => ep.availabilities, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'externalProviderId' })
  externalProvider: ExternalProvider;

  @Column({ nullable: true })
  serviceOptionId: string;

  @ManyToOne(() => ServiceOption, (option) => option.availabilities, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  @JoinColumn({ name: 'serviceOptionId' })
  serviceOption: ServiceOption;
}
