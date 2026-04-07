import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { ExternalProvider } from './external-provider.entity';
import { ServiceOption } from '../../service-options/entities/service-option.entity';

/**
 * Junction entity for ExternalProvider-ServiceOption many-to-many relationship
 * This allows external providers to be assigned to specific services
 * Mirrors UserServiceOption structure for consistency
 */
@Entity('external_provider_service_options')
@Unique(['externalProviderId', 'serviceOptionId'])
export class ExternalProviderServiceOption {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  externalProviderId: string;

  @Column()
  serviceOptionId: string;

  @Column({
    default: true,
    comment: 'Whether this provider is actively providing this service',
  })
  isActive: boolean;

  @Column({
    type: 'int',
    nullable: true,
    comment: 'Custom duration override for this provider (in minutes)',
  })
  customDuration?: number;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Custom description for how this provider provides the service',
  })
  customDescription?: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => ExternalProvider, (ep) => ep.serviceOptions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'externalProviderId' })
  externalProvider: ExternalProvider;

  @ManyToOne(() => ServiceOption, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'serviceOptionId' })
  serviceOption: ServiceOption;
}
