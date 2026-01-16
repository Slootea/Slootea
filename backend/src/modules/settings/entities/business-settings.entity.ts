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

@Entity('business_settings')
export class BusinessSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'int',
    default: 24,
    comment: 'Hours before appointment when confirmation is required',
  })
  confirmationRequiredHours: number;

  @Column({
    type: 'int',
    default: 3,
    comment: 'Hours before appointment - confirmation deadline',
  })
  confirmationDeadlineHours: number;

  @Column({
    default: true,
    comment: 'Auto-cancel if not confirmed before deadline',
  })
  autoCancelUnconfirmed: boolean;

  @Column({
    type: 'int',
    default: 15,
    comment: 'Buffer time between appointments in minutes',
  })
  bufferTimeMinutes: number;

  @Column({
    type: 'int',
    default: 10,
    comment: 'Maximum appointments per day',
  })
  maxAppointmentsPerDay: number;

  @Column({
    type: 'int',
    default: 24,
    comment: 'Minimum hours in advance for booking',
  })
  minAdvanceBookingHours: number;

  @Column({
    type: 'int',
    default: 30,
    comment: 'Maximum days in advance for booking',
  })
  maxAdvanceBookingDays: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ unique: true })
  userId: string;

  @OneToOne(() => User, (user) => user.settings, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;
}
