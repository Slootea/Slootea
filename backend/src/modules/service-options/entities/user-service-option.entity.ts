import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { ServiceOption } from '../../service-options/entities/service-option.entity';

/**
 * Junction entity for User-ServiceOption many-to-many relationship
 * This allows organization members to select which services they provide
 */
@Entity('user_service_options')
@Unique(['userId', 'serviceOptionId'])
export class UserServiceOption {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  serviceOptionId: string;

  @Column({
    default: true,
    comment: 'Whether this user is actively providing this service',
  })
  isActive: boolean;

  @Column({
    type: 'int',
    nullable: true,
    comment: 'Custom duration override for this user (in minutes)',
  })
  customDuration?: number;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Custom description for how this user provides the service',
  })
  customDescription?: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => ServiceOption, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'serviceOptionId' })
  serviceOption: ServiceOption;
}
