import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { TransactionType } from './enums';

@Entity('transaction_categories')
@Index(['organizationId', 'name'])
@Index(['organizationId', 'type'])
export class TransactionCategory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ comment: 'Organization ID for multi-tenant isolation' })
  organizationId: string;

  @Column()
  name: string;

  @Column({
    type: 'enum',
    enum: TransactionType,
    enumName: 'transaction_categories_type_enum',
    comment: 'Whether this category is for income or expense',
  })
  type: TransactionType;

  @Column({ type: 'varchar', nullable: true })
  color: string | null;

  @Column({ type: 'varchar', nullable: true })
  icon: string | null;

  @Column({ nullable: true })
  parentId: string;

  @ManyToOne(() => TransactionCategory, (cat) => cat.children, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'parentId' })
  parent: TransactionCategory;

  @OneToMany(() => TransactionCategory, (cat) => cat.parent)
  children: TransactionCategory[];

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
