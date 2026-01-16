import {
  Entity,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { UserOrganization } from './user-organization.entity';

@Entity('organizations')
export class Organization {
  @Column({ primary: true })
  id: string; // Clerk organization ID (string, not UUID)

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ nullable: true })
  industry: string;

  @Column({ nullable: true })
  size: number;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  location: string;

  @Column({ nullable: true })
  website: string;

  @Column({ type: 'text', nullable: true })
  logo_url: string;

  @Column({ nullable: true })
  email: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToMany(() => UserOrganization, userOrg => userOrg.organization)
  userOrganizations: UserOrganization[];
}
