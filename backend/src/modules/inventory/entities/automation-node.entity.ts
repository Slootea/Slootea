import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { AutomationWorkflow } from './automation-workflow.entity';

export enum AutomationNodeType {
  // Triggers
  TRIGGER_STOCK_CRITICAL = 'trigger_stock_critical',
  TRIGGER_STOCK_OUT = 'trigger_stock_out',
  TRIGGER_STOCK_ADJUSTED = 'trigger_stock_adjusted',
  TRIGGER_MANUAL = 'trigger_manual',
  
  // Conditions
  CONDITION_STOCK_LEVEL = 'condition_stock_level',
  CONDITION_ITEM_CATEGORY = 'condition_item_category',
  
  // Actions
  ACTION_API_CALL = 'action_api_call',
  ACTION_WEBHOOK = 'action_webhook',
  ACTION_NOTIFICATION = 'action_notification',
  ACTION_ADJUST_STOCK = 'action_adjust_stock',
}

export interface NodePosition {
  x: number;
  y: number;
}

export interface TriggerStockCriticalConfig {
  inventoryItemIds?: string[];  // Empty = all items
  threshold?: number;  // Override item's minStockAlert
}

export interface TriggerStockOutConfig {
  inventoryItemIds?: string[];
}

export interface TriggerStockAdjustedConfig {
  inventoryItemIds?: string[];
  adjustmentTypes?: ('manual' | 'purchase' | 'correction' | 'service_usage')[];
}

export interface ConditionStockLevelConfig {
  inventoryItemId: string;
  operator: 'lt' | 'lte' | 'eq' | 'gte' | 'gt';
  value: number;
}

export interface ConditionItemCategoryConfig {
  category: 'consumable' | 'retail';
}

export interface ActionApiCallConfig {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: string;  // JSON string, can include {{variables}}
  timeout?: number;  // ms
}

export interface ActionWebhookConfig {
  url: string;
  secret?: string;  // For HMAC signature
}

export interface ActionNotificationConfig {
  channel: 'email' | 'sms' | 'whatsapp';
  recipients: string[];  // Email addresses or phone numbers
  subject?: string;  // For email
  message: string;  // Can include {{variables}}
}

export interface ActionAdjustStockConfig {
  inventoryItemId: string;
  quantity: number;
  type: 'manual' | 'purchase' | 'correction';
  reason?: string;
}

export type NodeConfig =
  | TriggerStockCriticalConfig
  | TriggerStockOutConfig
  | TriggerStockAdjustedConfig
  | ConditionStockLevelConfig
  | ConditionItemCategoryConfig
  | ActionApiCallConfig
  | ActionWebhookConfig
  | ActionNotificationConfig
  | ActionAdjustStockConfig
  | Record<string, never>;  // Empty config for manual trigger

@Entity('automation_nodes')
export class AutomationNode {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  workflowId: string;

  @ManyToOne(() => AutomationWorkflow, (workflow) => workflow.nodes, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'workflowId' })
  workflow: AutomationWorkflow;

  @Column({
    type: 'enum',
    enum: AutomationNodeType,
  })
  type: AutomationNodeType;

  @Column({ nullable: true, comment: 'Display label for the node' })
  label: string;

  @Column({ type: 'jsonb', default: {} })
  config: NodeConfig;

  @Column({ type: 'jsonb', comment: 'Visual position on canvas' })
  position: NodePosition;

  @Column({ type: 'uuid', nullable: true, array: true, default: [], comment: 'IDs of nodes this connects to' })
  nextNodeIds: string[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
