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
import { Organization } from './organization.entity';

/**
 * Role values match Clerk's organization roles exactly.
 * org:admin - Full administrative access
 * org:member - Standard member access
 */
export enum UserOrganizationRole {
  ADMIN = 'org:admin',
  MEMBER = 'org:member',
}

@Entity('user_organizations')
@Unique(['userId', 'organizationId'])
export class UserOrganization {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'organization_id' })
  organizationId: string;

  @Column({
    type: 'text',
    default: UserOrganizationRole.MEMBER,
  })
  role: UserOrganizationRole;

  @CreateDateColumn({ name: 'joined_at' })
  joinedAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Organization, org => org.userOrganizations, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;
}
