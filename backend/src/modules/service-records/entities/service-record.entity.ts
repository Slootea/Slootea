import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Client } from '../../clients/entities/client.entity';
import { ServiceOption } from '../../service-options/entities/service-option.entity';

@Entity('service_records')
@Index(['organizationId', 'clientId', 'serviceDate'])
@Index(['organizationId', 'serviceDate'])
export class ServiceRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  organizationId: string;

  @Column('uuid')
  clientId: string;

  @ManyToOne(() => Client, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'clientId' })
  client: Client;

  @Column('uuid')
  serviceOptionId: string;

  @ManyToOne(() => ServiceOption, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'serviceOptionId' })
  serviceOption: ServiceOption;

  /**
   * Pure calendar date (YYYY-MM-DD). Stored as PostgreSQL DATE so that no
   * timezone conversion is ever applied. The frontend constructs and renders
   * this string using the organization's configured timezone — changing the
   * org timezone later cannot shift these values.
   */
  @Column({ type: 'date' })
  serviceDate: string;

  @Column({ type: 'text', nullable: true })
  note: string;

  /** dbUserId of the staff member who created the record (audit). */
  @Column({ nullable: true })
  createdByUserId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
