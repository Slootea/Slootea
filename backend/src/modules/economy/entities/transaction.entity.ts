import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { TransactionCategory } from './transaction-category.entity';
import { TransactionType, PaymentMethod, TransactionSource } from './enums';

export { TransactionType, PaymentMethod, TransactionSource };

@Entity('transactions')
@Index(['organizationId', 'date'])
@Index(['organizationId', 'type'])
@Index(['organizationId', 'categoryId'])
@Index(['organizationId', 'parasutId'], { unique: true, where: '"parasutId" IS NOT NULL' })
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ comment: 'Organization ID for multi-tenant isolation' })
  organizationId: string;

  @Column({
    type: 'enum',
    enum: TransactionType,
    enumName: 'transactions_type_enum',
  })
  type: TransactionType;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ default: 'TRY' })
  currency: string;

  @Column()
  description: string;

  @Column({ type: 'date' })
  date: string;

  @Column({
    type: 'enum',
    enum: PaymentMethod,
    enumName: 'transactions_paymentmethod_enum',
    default: PaymentMethod.CASH,
  })
  paymentMethod: PaymentMethod;

  @Column({ nullable: true })
  categoryId: string;

  @ManyToOne(() => TransactionCategory, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'categoryId' })
  category: TransactionCategory;

  @Column({
    type: 'enum',
    enum: TransactionSource,
    enumName: 'transactions_source_enum',
    default: TransactionSource.MANUAL,
  })
  source: TransactionSource;

  @Column({ type: 'varchar', nullable: true, comment: 'Parasut record ID for deduplication' })
  parasutId: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'varchar', nullable: true, comment: 'Invoice or receipt number' })
  referenceNumber: string | null;

  @Column({ type: 'varchar', nullable: true, comment: 'Contact/vendor/client name' })
  contactName: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
