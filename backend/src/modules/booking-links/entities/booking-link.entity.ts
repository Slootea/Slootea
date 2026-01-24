import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { ServiceOption } from '../../service-options/entities/service-option.entity';
import { Appointment } from '../../appointments/entities/appointment.entity';

export enum BookingLinkType {
  ALL_OPTIONS = 'all_options',
  SPECIFIC_OPTION = 'specific_option',
  CAMPAIGN = 'campaign',
}

@Entity('booking_links')
export class BookingLink {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  slug: string;

  @Column({ nullable: true })
  name: string;

  @Column({
    type: 'enum',
    enum: BookingLinkType,
    default: BookingLinkType.ALL_OPTIONS,
  })
  type: BookingLinkType;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true, comment: 'Organization ID - booking links belong to organizations' })
  organizationId: string;

  @Column({ nullable: true })
  serviceOptionId: string;

  @ManyToOne(() => ServiceOption, (option) => option.bookingLinks, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'serviceOptionId' })
  serviceOption: ServiceOption;

  @OneToMany(() => Appointment, (appointment) => appointment.bookingLink)
  appointments: Appointment[];
}
