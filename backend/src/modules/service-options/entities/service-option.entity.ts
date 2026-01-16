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

@Entity('service_options')
export class ServiceOption {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ nullable: true })
  imageUrl: string;

  @Column({ type: 'int', comment: 'Duration in minutes' })
  duration: number;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column()
  userId: string;

  @ManyToOne(() => User, (user) => user.serviceOptions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @OneToMany(() => Availability, (availability) => availability.serviceOption)
  availabilities: Availability[];

  @OneToMany(() => Appointment, (appointment) => appointment.serviceOption)
  appointments: Appointment[];

  @OneToMany(() => BookingLink, (link) => link.serviceOption)
  bookingLinks: BookingLink[];
}
