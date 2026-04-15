import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { ServiceInventoryUsage } from './service-inventory-usage.entity';

export enum InventoryCategory {
  CONSUMABLE = 'consumable',
  RETAIL = 'retail',
}

@Entity('inventory_items')
@Index(['organizationId', 'name'])
@Index(['organizationId', 'sku'], { unique: true, where: '"sku" IS NOT NULL' })
export class InventoryItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ comment: 'Organization ID for multi-tenant isolation' })
  organizationId: string;

  @Column()
  name: string;

  @Column({ type: 'varchar', nullable: true, comment: 'Stock Keeping Unit for tracking' })
  sku: string | null;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: InventoryCategory,
    default: InventoryCategory.CONSUMABLE,
  })
  category: InventoryCategory;

  @Column({ default: 'pcs', comment: 'Unit of measurement (ml, g, pcs, etc.)' })
  unit: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  currentStock: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, comment: 'Alert threshold for low stock' })
  minStockAlert: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, comment: 'Cost per unit for profitability tracking' })
  costPerUnit: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, comment: 'Retail price for sellable items' })
  retailPrice: number;

  @Column({ type: 'text', nullable: true, comment: 'Base64 encoded image data' })
  imageBase64: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => ServiceInventoryUsage, (usage) => usage.inventoryItem)
  serviceUsages: ServiceInventoryUsage[];
}
