import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  CreateDateColumn,
} from 'typeorm';
import { InventoryItem } from './inventory-item.entity';
import { ServiceOption } from '../../service-options/entities/service-option.entity';

@Entity('service_inventory_usage')
@Index(['serviceOptionId', 'inventoryItemId'], { unique: true })
export class ServiceInventoryUsage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  serviceOptionId: string;

  @Column()
  inventoryItemId: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, comment: 'Quantity consumed per appointment' })
  quantityUsed: number;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => ServiceOption, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'serviceOptionId' })
  serviceOption: ServiceOption;

  @ManyToOne(() => InventoryItem, (item) => item.serviceUsages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'inventoryItemId' })
  inventoryItem: InventoryItem;
}
