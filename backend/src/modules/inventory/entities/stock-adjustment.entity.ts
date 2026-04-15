import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { InventoryItem } from './inventory-item.entity';

export enum StockAdjustmentType {
  MANUAL = 'manual',
  APPOINTMENT = 'appointment',
  PURCHASE = 'purchase',
  CORRECTION = 'correction',
}

@Entity('stock_adjustments')
@Index(['inventoryItemId', 'createdAt'])
export class StockAdjustment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  inventoryItemId: string;

  @Column({
    type: 'enum',
    enum: StockAdjustmentType,
    default: StockAdjustmentType.MANUAL,
  })
  type: StockAdjustmentType;

  @Column({ type: 'decimal', precision: 10, scale: 2, comment: 'Positive for additions, negative for deductions' })
  quantity: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, comment: 'Stock level after adjustment' })
  stockAfter: number;

  @Column({ type: 'text', nullable: true })
  reason: string;

  @Column({ nullable: true, comment: 'Reference to appointment ID if type is appointment' })
  appointmentId: string;

  @Column({ nullable: true, comment: 'User who made the adjustment' })
  adjustedBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => InventoryItem, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'inventoryItemId' })
  inventoryItem: InventoryItem;
}
