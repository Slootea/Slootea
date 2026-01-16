import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Organization } from './organization.entity';

export enum UserOrganizationRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  RECRUITER = 'recruiter',
  VIEWER = 'viewer',
}

@Entity('user_organizations')
@Unique(['user_id', 'organization_id'])
export class UserOrganization {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  user_id: string;

  @Column()
  organization_id: string;

  @Column({
    type: 'text',
    default: UserOrganizationRole.RECRUITER,
  })
  role: UserOrganizationRole;

  @CreateDateColumn()
  joined_at: Date;

  @ManyToOne(() => Organization, org => org.userOrganizations, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;
}
