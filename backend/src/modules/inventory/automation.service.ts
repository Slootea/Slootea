import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { AutomationWorkflow } from './entities/automation-workflow.entity';
import { AutomationNode, AutomationNodeType } from './entities/automation-node.entity';
import {
  AutomationExecution,
  ExecutionStatus,
  NodeExecutionResult,
} from './entities/automation-execution.entity';
import { InventoryItem } from './entities/inventory-item.entity';
import {
  CreateAutomationWorkflowDto,
  UpdateAutomationWorkflowDto,
  CreateAutomationNodeDto,
  UpdateAutomationNodeDto,
  SaveWorkflowCanvasDto,
  TriggerWorkflowDto,
} from './dto/automation.dto';

@Injectable()
export class AutomationService {
  private readonly logger = new Logger(AutomationService.name);

  constructor(
    @InjectRepository(AutomationWorkflow)
    private readonly workflowRepository: Repository<AutomationWorkflow>,
    @InjectRepository(AutomationNode)
    private readonly nodeRepository: Repository<AutomationNode>,
    @InjectRepository(AutomationExecution)
    private readonly executionRepository: Repository<AutomationExecution>,
    @InjectRepository(InventoryItem)
    private readonly inventoryItemRepository: Repository<InventoryItem>,
  ) {}

  // ==================== Workflow CRUD ====================

  async createWorkflow(
    organizationId: string,
    dto: CreateAutomationWorkflowDto,
  ): Promise<AutomationWorkflow> {
    const workflow = this.workflowRepository.create({
      ...dto,
      organizationId,
      nodes: [],
    });

    const savedWorkflow = await this.workflowRepository.save(workflow);

    // Create initial nodes if provided
    if (dto.nodes && dto.nodes.length > 0) {
      const nodes = dto.nodes.map((nodeDto) =>
        this.nodeRepository.create({
          ...nodeDto,
          workflowId: savedWorkflow.id,
        }),
      );
      savedWorkflow.nodes = await this.nodeRepository.save(nodes);
    }

    return savedWorkflow;
  }

  async findAllWorkflows(organizationId: string): Promise<AutomationWorkflow[]> {
    return this.workflowRepository.find({
      where: { organizationId },
      relations: ['nodes'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOneWorkflow(
    organizationId: string,
    id: string,
  ): Promise<AutomationWorkflow> {
    const workflow = await this.workflowRepository.findOne({
      where: { id, organizationId },
      relations: ['nodes'],
    });

    if (!workflow) {
      throw new NotFoundException(`Workflow with ID "${id}" not found`);
    }

    return workflow;
  }

  async updateWorkflow(
    organizationId: string,
    id: string,
    dto: UpdateAutomationWorkflowDto,
  ): Promise<AutomationWorkflow> {
    const workflow = await this.findOneWorkflow(organizationId, id);

    Object.assign(workflow, dto);

    return this.workflowRepository.save(workflow);
  }

  async deleteWorkflow(organizationId: string, id: string): Promise<void> {
    const workflow = await this.findOneWorkflow(organizationId, id);
    await this.workflowRepository.remove(workflow);
  }

  // ==================== Save Canvas (Full Update) ====================

  async saveWorkflowCanvas(
    organizationId: string,
    workflowId: string,
    dto: SaveWorkflowCanvasDto,
  ): Promise<AutomationWorkflow> {
    const workflow = await this.findOneWorkflow(organizationId, workflowId);

    // Update workflow metadata if provided
    if (dto.name) workflow.name = dto.name;
    if (dto.description !== undefined) workflow.description = dto.description;

    // Delete all existing nodes
    await this.nodeRepository.delete({ workflowId });

    // Create new nodes
    const nodeIdMap = new Map<string, string>(); // temp ID -> real ID
    const tempIds = dto.nodes.map((_, i) => `temp-${i}`);

    // First pass: create nodes without connections
    const createdNodes: AutomationNode[] = [];
    for (let i = 0; i < dto.nodes.length; i++) {
      const nodeDto = dto.nodes[i];
      const node = this.nodeRepository.create({
        type: nodeDto.type,
        label: nodeDto.label,
        config: nodeDto.config,
        position: nodeDto.position,
        workflowId,
        nextNodeIds: [],
      });
      const saved = await this.nodeRepository.save(node);
      nodeIdMap.set(tempIds[i], saved.id);
      createdNodes.push(saved);
    }

    // Second pass: update connections
    for (let i = 0; i < dto.nodes.length; i++) {
      const nodeDto = dto.nodes[i];
      if (nodeDto.nextNodeIds && nodeDto.nextNodeIds.length > 0) {
        // Map temp IDs to real IDs or keep as-is if already real UUIDs
        const realNextIds = nodeDto.nextNodeIds
          .map((nextId) => nodeIdMap.get(nextId) || nextId)
          .filter((id) => createdNodes.find((n) => n.id === id));

        if (realNextIds.length > 0) {
          createdNodes[i].nextNodeIds = realNextIds;
          await this.nodeRepository.save(createdNodes[i]);
        }
      }
    }

    await this.workflowRepository.save(workflow);

    return this.findOneWorkflow(organizationId, workflowId);
  }

  // ==================== Node Operations ====================

  async addNode(
    organizationId: string,
    workflowId: string,
    dto: CreateAutomationNodeDto,
  ): Promise<AutomationNode> {
    // Ensure workflow exists and belongs to org
    await this.findOneWorkflow(organizationId, workflowId);

    const node = this.nodeRepository.create({
      ...dto,
      workflowId,
    });

    return this.nodeRepository.save(node);
  }

  async updateNode(
    organizationId: string,
    workflowId: string,
    nodeId: string,
    dto: UpdateAutomationNodeDto,
  ): Promise<AutomationNode> {
    await this.findOneWorkflow(organizationId, workflowId);

    const node = await this.nodeRepository.findOne({
      where: { id: nodeId, workflowId },
    });

    if (!node) {
      throw new NotFoundException(`Node with ID "${nodeId}" not found`);
    }

    Object.assign(node, dto);

    return this.nodeRepository.save(node);
  }

  async deleteNode(
    organizationId: string,
    workflowId: string,
    nodeId: string,
  ): Promise<void> {
    await this.findOneWorkflow(organizationId, workflowId);

    const node = await this.nodeRepository.findOne({
      where: { id: nodeId, workflowId },
    });

    if (!node) {
      throw new NotFoundException(`Node with ID "${nodeId}" not found`);
    }

    // Remove this node from other nodes' nextNodeIds
    await this.nodeRepository
      .createQueryBuilder()
      .update()
      .set({
        nextNodeIds: () => `array_remove("nextNodeIds", '${nodeId}')`,
      })
      .where('workflowId = :workflowId', { workflowId })
      .execute();

    await this.nodeRepository.remove(node);
  }

  // ==================== Workflow Execution ====================

  async triggerWorkflow(
    organizationId: string,
    workflowId: string,
    dto: TriggerWorkflowDto,
  ): Promise<AutomationExecution> {
    const workflow = await this.findOneWorkflow(organizationId, workflowId);

    if (!workflow.isActive) {
      throw new BadRequestException('Workflow is not active');
    }

    // Create execution record
    const execution = this.executionRepository.create({
      organizationId,
      workflowId,
      status: ExecutionStatus.RUNNING,
      context: {
        triggeredBy: 'manual',
        triggerData: dto.triggerData,
      },
      nodeResults: [],
    });

    await this.executionRepository.save(execution);

    // Execute workflow asynchronously
    this.executeWorkflow(execution, workflow).catch((error) => {
      this.logger.error(`Workflow execution failed: ${error.message}`, error.stack);
    });

    return execution;
  }

  private async executeWorkflow(
    execution: AutomationExecution,
    workflow: AutomationWorkflow,
  ): Promise<void> {
    const nodeResults: NodeExecutionResult[] = [];
    const triggerNodes = workflow.nodes.filter((n) =>
      n.type.startsWith('trigger_'),
    );

    try {
      // Start from trigger nodes
      for (const triggerNode of triggerNodes) {
        await this.executeNode(
          triggerNode,
          workflow.nodes,
          execution,
          nodeResults,
        );
      }

      // Update execution status
      const hasErrors = nodeResults.some((r) => r.status === 'error');
      execution.status = hasErrors
        ? ExecutionStatus.PARTIAL
        : ExecutionStatus.COMPLETED;
      execution.nodeResults = nodeResults;
      execution.completedAt = new Date();
    } catch (error) {
      execution.status = ExecutionStatus.FAILED;
      execution.errorMessage = error.message;
      execution.nodeResults = nodeResults;
      execution.completedAt = new Date();
    }

    await this.executionRepository.save(execution);
  }

  private async executeNode(
    node: AutomationNode,
    allNodes: AutomationNode[],
    execution: AutomationExecution,
    results: NodeExecutionResult[],
    context: Record<string, unknown> = {},
  ): Promise<Record<string, unknown>> {
    const result: NodeExecutionResult = {
      nodeId: node.id,
      nodeType: node.type,
      status: 'success',
      startedAt: new Date().toISOString(),
      input: { ...context, ...execution.context.triggerData },
    };

    try {
      let output: Record<string, unknown> = {};

      switch (node.type) {
        case AutomationNodeType.TRIGGER_MANUAL:
          output = { triggered: true };
          break;

        case AutomationNodeType.TRIGGER_STOCK_CRITICAL:
        case AutomationNodeType.TRIGGER_STOCK_OUT:
        case AutomationNodeType.TRIGGER_STOCK_ADJUSTED:
          output = {
            triggered: true,
            ...execution.context.triggerData,
          };
          break;

        case AutomationNodeType.CONDITION_STOCK_LEVEL:
          output = await this.executeConditionStockLevel(node, execution);
          if (!output.conditionMet) {
            result.status = 'skipped';
          }
          break;

        case AutomationNodeType.ACTION_API_CALL:
          output = await this.executeApiCall(node, execution, context);
          break;

        case AutomationNodeType.ACTION_WEBHOOK:
          output = await this.executeWebhook(node, execution, context);
          break;

        case AutomationNodeType.ACTION_NOTIFICATION:
          output = { notificationSent: true, message: 'Notification would be sent' };
          break;

        default:
          output = { message: `Unknown node type: ${node.type}` };
      }

      result.output = output;
      result.completedAt = new Date().toISOString();
    } catch (error) {
      result.status = 'error';
      result.error = error.message;
      result.completedAt = new Date().toISOString();
    }

    results.push(result);

    // Execute next nodes if this node succeeded
    if (result.status === 'success' && node.nextNodeIds?.length > 0) {
      for (const nextId of node.nextNodeIds) {
        const nextNode = allNodes.find((n) => n.id === nextId);
        if (nextNode) {
          await this.executeNode(
            nextNode,
            allNodes,
            execution,
            results,
            { ...context, ...result.output },
          );
        }
      }
    }

    return result.output || {};
  }

  private async executeConditionStockLevel(
    node: AutomationNode,
    execution: AutomationExecution,
  ): Promise<Record<string, unknown>> {
    const config = node.config as {
      inventoryItemId: string;
      operator: 'lt' | 'lte' | 'eq' | 'gte' | 'gt';
      value: number;
    };

    const item = await this.inventoryItemRepository.findOne({
      where: { id: config.inventoryItemId },
    });

    if (!item) {
      return { conditionMet: false, error: 'Item not found' };
    }

    const currentStock = Number(item.currentStock);
    const targetValue = config.value;
    let conditionMet = false;

    switch (config.operator) {
      case 'lt':
        conditionMet = currentStock < targetValue;
        break;
      case 'lte':
        conditionMet = currentStock <= targetValue;
        break;
      case 'eq':
        conditionMet = currentStock === targetValue;
        break;
      case 'gte':
        conditionMet = currentStock >= targetValue;
        break;
      case 'gt':
        conditionMet = currentStock > targetValue;
        break;
    }

    return {
      conditionMet,
      currentStock,
      operator: config.operator,
      targetValue,
      itemName: item.name,
    };
  }

  private async executeApiCall(
    node: AutomationNode,
    execution: AutomationExecution,
    context: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const config = node.config as {
      url: string;
      method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
      headers?: Record<string, string>;
      body?: string;
      timeout?: number;
    };

    // Replace variables in URL and body
    let url = this.replaceVariables(config.url, { ...context, ...execution.context.triggerData });
    let body = config.body
      ? this.replaceVariables(config.body, { ...context, ...execution.context.triggerData })
      : undefined;

    try {
      const controller = new AbortController();
      const timeout = config.timeout || 30000;
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        method: config.method,
        headers: {
          'Content-Type': 'application/json',
          ...config.headers,
        },
        body: body && config.method !== 'GET' ? body : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      let responseData: unknown;
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        responseData = await response.json();
      } else {
        responseData = await response.text();
      }

      return {
        success: response.ok,
        statusCode: response.status,
        response: responseData,
      };
    } catch (error) {
      throw new Error(`API call failed: ${error.message}`);
    }
  }

  private async executeWebhook(
    node: AutomationNode,
    execution: AutomationExecution,
    context: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const config = node.config as {
      url: string;
      secret?: string;
    };

    const payload = {
      event: 'inventory.automation',
      workflowId: execution.workflowId,
      executionId: execution.id,
      timestamp: new Date().toISOString(),
      data: { ...context, ...execution.context.triggerData },
    };

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Add HMAC signature if secret is provided
      if (config.secret) {
        const crypto = await import('crypto');
        const signature = crypto
          .createHmac('sha256', config.secret)
          .update(JSON.stringify(payload))
          .digest('hex');
        headers['X-Webhook-Signature'] = signature;
      }

      const response = await fetch(config.url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      return {
        success: response.ok,
        statusCode: response.status,
      };
    } catch (error) {
      throw new Error(`Webhook failed: ${error.message}`);
    }
  }

  private replaceVariables(
    template: string,
    context: Record<string, unknown>,
  ): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return context[key] !== undefined ? String(context[key]) : match;
    });
  }

  // ==================== Execution History ====================

  async getExecutionHistory(
    organizationId: string,
    workflowId?: string,
    limit = 50,
  ): Promise<AutomationExecution[]> {
    const where: Record<string, unknown> = { organizationId };
    if (workflowId) {
      where.workflowId = workflowId;
    }

    return this.executionRepository.find({
      where,
      relations: ['workflow'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async getExecution(
    organizationId: string,
    executionId: string,
  ): Promise<AutomationExecution> {
    const execution = await this.executionRepository.findOne({
      where: { id: executionId, organizationId },
      relations: ['workflow'],
    });

    if (!execution) {
      throw new NotFoundException(`Execution with ID "${executionId}" not found`);
    }

    return execution;
  }

  // ==================== Auto-trigger from Stock Events ====================

  async checkAndTriggerAutomations(
    organizationId: string,
    event: 'stock_critical' | 'stock_out' | 'stock_adjusted',
    inventoryItem: InventoryItem,
    adjustmentData?: { type: string; quantity: number },
  ): Promise<void> {
    const workflows = await this.workflowRepository.find({
      where: { organizationId, isActive: true },
      relations: ['nodes'],
    });

    for (const workflow of workflows) {
      const triggerNodes = workflow.nodes.filter((n) => {
        if (event === 'stock_critical' && n.type === AutomationNodeType.TRIGGER_STOCK_CRITICAL) {
          const config = n.config as { inventoryItemIds?: string[] };
          return !config.inventoryItemIds?.length || config.inventoryItemIds.includes(inventoryItem.id);
        }
        if (event === 'stock_out' && n.type === AutomationNodeType.TRIGGER_STOCK_OUT) {
          const config = n.config as { inventoryItemIds?: string[] };
          return !config.inventoryItemIds?.length || config.inventoryItemIds.includes(inventoryItem.id);
        }
        if (event === 'stock_adjusted' && n.type === AutomationNodeType.TRIGGER_STOCK_ADJUSTED) {
          const config = n.config as { inventoryItemIds?: string[]; adjustmentTypes?: string[] };
          const itemMatch = !config.inventoryItemIds?.length || config.inventoryItemIds.includes(inventoryItem.id);
          const typeMatch = !config.adjustmentTypes?.length || config.adjustmentTypes.includes(adjustmentData?.type || '');
          return itemMatch && typeMatch;
        }
        return false;
      });

      if (triggerNodes.length > 0) {
        // Trigger this workflow
        const execution = this.executionRepository.create({
          organizationId,
          workflowId: workflow.id,
          status: ExecutionStatus.RUNNING,
          context: {
            triggeredBy: 'system',
            triggerData: {
              inventoryItemId: inventoryItem.id,
              inventoryItemName: inventoryItem.name,
              currentStock: Number(inventoryItem.currentStock),
              minStockAlert: Number(inventoryItem.minStockAlert),
              adjustmentType: adjustmentData?.type,
              adjustmentQuantity: adjustmentData?.quantity,
            },
          },
          nodeResults: [],
        });

        await this.executionRepository.save(execution);

        this.executeWorkflow(execution, workflow).catch((error) => {
          this.logger.error(`Auto-triggered workflow execution failed: ${error.message}`, error.stack);
        });
      }
    }
  }
}
