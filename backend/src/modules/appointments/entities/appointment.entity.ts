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
import { ServiceOption } from '../../service-options/entities/service-option.entity';
import { BookingLink } from '../../booking-links/entities/booking-link.entity';
import { Client } from '../../clients/entities/client.entity';
import { ExternalProvider } from '../../external-providers/entities/external-provider.entity';

export enum AppointmentStatus {
  PENDING_CONFIRMATION = 'pending_confirmation',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
  NO_SHOW = 'no_show',
}

@Entity('appointments')
@Index(['organizationId', 'startTime'])
@Index(['organizationId', 'userId', 'startTime'])
export class Appointment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Organization that this appointment belongs to.
   * Required for multi-tenant data isolation.
   */
  @Column({ nullable: true })
  organizationId: string;

  @Column({ type: 'timestamp' })
  startTime: Date;

  @Column({ type: 'timestamp' })
  endTime: Date;

  @Column()
  clientName: string;

  @Column({ nullable: true })
  clientEmail: string;

  @Column({ nullable: true })
  clientPhone: string;

  @Column({
    type: 'enum',
    enum: AppointmentStatus,
    default: AppointmentStatus.PENDING_CONFIRMATION,
  })
  status: AppointmentStatus;

  @Column({ unique: true })
  confirmationToken: string;

  @Column({ type: 'timestamp', nullable: true })
  confirmedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  reminderSentAt: Date;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  userId: string;

  @ManyToOne(() => User, (user) => user.appointments, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ nullable: true, comment: 'External provider ID (if appointment is with external provider)' })
  externalProviderId: string;

  @ManyToOne(() => ExternalProvider, (ep) => ep.appointments, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'externalProviderId' })
  externalProvider: ExternalProvider;

  @Column()
  serviceOptionId: string;

  @ManyToOne(() => ServiceOption, (option) => option.appointments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'serviceOptionId' })
  serviceOption: ServiceOption;

  @Column({ nullable: true })
  bookingLinkId: string;

  @ManyToOne(() => BookingLink, (link) => link.appointments, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'bookingLinkId' })
  bookingLink: BookingLink;

  @Column({ nullable: true })
  clientId: string;

  @ManyToOne(() => Client, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'clientId' })
  client: Client;
}
