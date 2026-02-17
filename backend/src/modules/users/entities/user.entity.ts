import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { ServiceOption } from '../../service-options/entities/service-option.entity';
import { Availability } from '../../availability/entities/availability.entity';
import { BlockedTime } from '../../blocked-times/entities/blocked-time.entity';
import { Appointment } from '../../appointments/entities/appointment.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  clerkId: string;

  @Column()
  email: string;

  @Column({ nullable: true })
  firstName: string;

  @Column({ nullable: true })
  lastName: string;

  @Column({ nullable: true })
  businessName: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  timezone: string;

  @Column({ nullable: true })
  organizationId: string;

  @Column({ nullable: true })
  organizationRole: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => ServiceOption, (option) => option.user)
  serviceOptions: ServiceOption[];

  @OneToMany(() => Availability, (availability) => availability.user)
  availabilities: Availability[];

  @OneToMany(() => BlockedTime, (blockedTime) => blockedTime.user)
  blockedTimes: BlockedTime[];

  @OneToMany(() => Appointment, (appointment) => appointment.user)
  appointments: Appointment[];
}
