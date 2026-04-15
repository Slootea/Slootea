import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { AutomationWorkflow } from './automation-workflow.entity';

export enum ExecutionStatus {
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  PARTIAL = 'partial',  // Some nodes failed
}

export interface NodeExecutionResult {
  nodeId: string;
  nodeType: string;
  status: 'success' | 'error' | 'skipped';
  startedAt: string;
  completedAt?: string;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
}

export interface ExecutionContext {
  triggeredBy: 'system' | 'manual';
  triggerData?: {
    inventoryItemId?: string;
    inventoryItemName?: string;
    currentStock?: number;
    minStockAlert?: number;
    adjustmentType?: string;
    adjustmentQuantity?: number;
  };
}

@Entity('automation_executions')
@Index(['organizationId', 'createdAt'])
@Index(['workflowId', 'createdAt'])
export class AutomationExecution {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ comment: 'Organization ID for multi-tenant isolation' })
  organizationId: string;

  @Column({ type: 'uuid' })
  workflowId: string;

  @ManyToOne(() => AutomationWorkflow, (workflow) => workflow.executions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'workflowId' })
  workflow: AutomationWorkflow;

  @Column({
    type: 'enum',
    enum: ExecutionStatus,
    default: ExecutionStatus.RUNNING,
  })
  status: ExecutionStatus;

  @Column({ type: 'jsonb', default: {} })
  context: ExecutionContext;

  @Column({ type: 'jsonb', default: [] })
  nodeResults: NodeExecutionResult[];

  @Column({ nullable: true })
  errorMessage: string;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;
}
