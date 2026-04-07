import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { ExternalProviderServiceOption } from './external-provider-service-option.entity';
import { Availability } from '../../availability/entities/availability.entity';
import { BlockedTime } from '../../blocked-times/entities/blocked-time.entity';
import { Appointment } from '../../appointments/entities/appointment.entity';

/**
 * External Service Provider entity
 * Represents service providers who are NOT organization members (no Clerk account)
 * but can be assigned to services and receive appointments.
 * Managed entirely by org:admin.
 */
@Entity('external_providers')
@Index(['organizationId'])
export class ExternalProvider {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ comment: 'Organization this provider belongs to (Clerk org ID)' })
  organizationId: string;

  @Column({ comment: 'Display name of the provider' })
  name: string;

  @Column({ type: 'text', nullable: true, comment: 'Base64 encoded image' })
  imageBase64: string;

  @Column({ default: true, comment: 'Whether provider is available for bookings' })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => ExternalProviderServiceOption, (epso) => epso.externalProvider)
  serviceOptions: ExternalProviderServiceOption[];

  @OneToMany(() => Availability, (availability) => availability.externalProvider)
  availabilities: Availability[];

  @OneToMany(() => BlockedTime, (blockedTime) => blockedTime.externalProvider)
  blockedTimes: BlockedTime[];

  @OneToMany(() => Appointment, (appointment) => appointment.externalProvider)
  appointments: Appointment[];
}
