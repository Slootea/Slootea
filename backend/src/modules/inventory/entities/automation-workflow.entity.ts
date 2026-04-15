import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { AutomationNode } from './automation-node.entity';
import { AutomationExecution } from './automation-execution.entity';

@Entity('automation_workflows')
@Index(['organizationId', 'isActive'])
export class AutomationWorkflow {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ comment: 'Organization ID for multi-tenant isolation' })
  organizationId: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => AutomationNode, (node) => node.workflow, { cascade: true })
  nodes: AutomationNode[];

  @OneToMany(() => AutomationExecution, (execution) => execution.workflow)
  executions: AutomationExecution[];
}
