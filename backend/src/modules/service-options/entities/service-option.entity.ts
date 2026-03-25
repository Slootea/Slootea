import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Availability } from '../../availability/entities/availability.entity';
import { Appointment } from '../../appointments/entities/appointment.entity';
import { BookingLink } from '../../booking-links/entities/booking-link.entity';
import { UserServiceOption } from './user-service-option.entity';

@Entity('service_options')
export class ServiceOption {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'text', nullable: true, comment: 'Base64 encoded image data' })
  imageBase64: string;

  @Column({ type: 'int', comment: 'Duration in minutes' })
  duration: number;

  @Column({ default: false, comment: 'Whether to display price on booking page' })
  showPrice: boolean;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, comment: 'Service price (0 = free)' })
  price: number;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @Column({ nullable: true, comment: 'Organization ID - if set, this is an org-level service' })
  organizationId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  userId: string;

  @ManyToOne(() => User, (user) => user.serviceOptions, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'userId' })
  user: User;

  @OneToMany(() => Availability, (availability) => availability.serviceOption)
  availabilities: Availability[];

  @OneToMany(() => Appointment, (appointment) => appointment.serviceOption)
  appointments: Appointment[];

  @OneToMany(() => BookingLink, (link) => link.serviceOption)
  bookingLinks: BookingLink[];

  @OneToMany(() => UserServiceOption, (uso) => uso.serviceOption)
  userServiceOptions: UserServiceOption[];
}
