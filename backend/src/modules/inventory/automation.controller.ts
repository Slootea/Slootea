import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
  ApiHeader,
  ApiParam,
} from '@nestjs/swagger';
import { AutomationService } from './automation.service';
import {
  CreateAutomationWorkflowDto,
  UpdateAutomationWorkflowDto,
  CreateAutomationNodeDto,
  UpdateAutomationNodeDto,
  SaveWorkflowCanvasDto,
  TriggerWorkflowDto,
} from './dto/automation.dto';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { OrgRolesGuard } from '../auth/guards/org-roles.guard';
import { OrgAdminOnly } from '../auth/decorators/org-roles.decorator';

@ApiTags('inventory-automation')
@Controller('inventory/automation')
@UseGuards(ClerkAuthGuard, OrgRolesGuard)
@ApiBearerAuth()
@ApiHeader({ name: 'x-organization-id', required: true, description: 'Organization ID' })
export class AutomationController {
  constructor(private readonly automationService: AutomationService) {}

  // ==================== Workflow CRUD ====================

  @Post('workflows')
  @OrgAdminOnly()
  @ApiOperation({ summary: 'Create a new automation workflow' })
  async createWorkflow(
    @Request() req: any,
    @Body() dto: CreateAutomationWorkflowDto,
  ) {
    const organizationId = req.organizationId;
    if (!organizationId) {
      throw new BadRequestException('Organization context required');
    }
    return this.automationService.createWorkflow(organizationId, dto);
  }

  @Get('workflows')
  @OrgAdminOnly()
  @ApiOperation({ summary: 'Get all automation workflows' })
  async findAllWorkflows(@Request() req: any) {
    const organizationId = req.organizationId;
    if (!organizationId) {
      throw new BadRequestException('Organization context required');
    }
    return this.automationService.findAllWorkflows(organizationId);
  }

  @Get('workflows/:id')
  @OrgAdminOnly()
  @ApiOperation({ summary: 'Get a specific automation workflow' })
  @ApiParam({ name: 'id', description: 'Workflow ID' })
  async findOneWorkflow(@Request() req: any, @Param('id') id: string) {
    const organizationId = req.organizationId;
    if (!organizationId) {
      throw new BadRequestException('Organization context required');
    }
    return this.automationService.findOneWorkflow(organizationId, id);
  }

  @Put('workflows/:id')
  @OrgAdminOnly()
  @ApiOperation({ summary: 'Update a workflow metadata' })
  @ApiParam({ name: 'id', description: 'Workflow ID' })
  async updateWorkflow(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateAutomationWorkflowDto,
  ) {
    const organizationId = req.organizationId;
    if (!organizationId) {
      throw new BadRequestException('Organization context required');
    }
    return this.automationService.updateWorkflow(organizationId, id, dto);
  }

  @Delete('workflows/:id')
  @OrgAdminOnly()
  @ApiOperation({ summary: 'Delete a workflow and all its nodes' })
  @ApiParam({ name: 'id', description: 'Workflow ID' })
  async deleteWorkflow(@Request() req: any, @Param('id') id: string) {
    const organizationId = req.organizationId;
    if (!organizationId) {
      throw new BadRequestException('Organization context required');
    }
    await this.automationService.deleteWorkflow(organizationId, id);
    return { success: true };
  }

  // ==================== Canvas Save ====================

  @Put('workflows/:id/canvas')
  @OrgAdminOnly()
  @ApiOperation({ summary: 'Save the entire workflow canvas (replaces all nodes)' })
  @ApiParam({ name: 'id', description: 'Workflow ID' })
  async saveWorkflowCanvas(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: SaveWorkflowCanvasDto,
  ) {
    const organizationId = req.organizationId;
    if (!organizationId) {
      throw new BadRequestException('Organization context required');
    }
    return this.automationService.saveWorkflowCanvas(organizationId, id, dto);
  }

  // ==================== Node Operations ====================

  @Post('workflows/:workflowId/nodes')
  @OrgAdminOnly()
  @ApiOperation({ summary: 'Add a node to a workflow' })
  @ApiParam({ name: 'workflowId', description: 'Workflow ID' })
  async addNode(
    @Request() req: any,
    @Param('workflowId') workflowId: string,
    @Body() dto: CreateAutomationNodeDto,
  ) {
    const organizationId = req.organizationId;
    if (!organizationId) {
      throw new BadRequestException('Organization context required');
    }
    return this.automationService.addNode(organizationId, workflowId, dto);
  }

  @Put('workflows/:workflowId/nodes/:nodeId')
  @OrgAdminOnly()
  @ApiOperation({ summary: 'Update a specific node' })
  @ApiParam({ name: 'workflowId', description: 'Workflow ID' })
  @ApiParam({ name: 'nodeId', description: 'Node ID' })
  async updateNode(
    @Request() req: any,
    @Param('workflowId') workflowId: string,
    @Param('nodeId') nodeId: string,
    @Body() dto: UpdateAutomationNodeDto,
  ) {
    const organizationId = req.organizationId;
    if (!organizationId) {
      throw new BadRequestException('Organization context required');
    }
    return this.automationService.updateNode(organizationId, workflowId, nodeId, dto);
  }

  @Delete('workflows/:workflowId/nodes/:nodeId')
  @OrgAdminOnly()
  @ApiOperation({ summary: 'Delete a node from a workflow' })
  @ApiParam({ name: 'workflowId', description: 'Workflow ID' })
  @ApiParam({ name: 'nodeId', description: 'Node ID' })
  async deleteNode(
    @Request() req: any,
    @Param('workflowId') workflowId: string,
    @Param('nodeId') nodeId: string,
  ) {
    const organizationId = req.organizationId;
    if (!organizationId) {
      throw new BadRequestException('Organization context required');
    }
    await this.automationService.deleteNode(organizationId, workflowId, nodeId);
    return { success: true };
  }

  // ==================== Workflow Execution ====================

  @Post('workflows/:id/trigger')
  @OrgAdminOnly()
  @ApiOperation({ summary: 'Manually trigger a workflow execution' })
  @ApiParam({ name: 'id', description: 'Workflow ID' })
  async triggerWorkflow(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: TriggerWorkflowDto,
  ) {
    const organizationId = req.organizationId;
    if (!organizationId) {
      throw new BadRequestException('Organization context required');
    }
    return this.automationService.triggerWorkflow(organizationId, id, dto);
  }

  // ==================== Execution History ====================

  @Get('executions')
  @OrgAdminOnly()
  @ApiOperation({ summary: 'Get execution history' })
  @ApiQuery({ name: 'workflowId', required: false, description: 'Filter by workflow ID' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Max results (default 50)' })
  async getExecutionHistory(
    @Request() req: any,
    @Query('workflowId') workflowId?: string,
    @Query('limit') limit?: number,
  ) {
    const organizationId = req.organizationId;
    if (!organizationId) {
      throw new BadRequestException('Organization context required');
    }
    return this.automationService.getExecutionHistory(
      organizationId,
      workflowId,
      limit ? parseInt(String(limit), 10) : undefined,
    );
  }

  @Get('executions/:id')
  @OrgAdminOnly()
  @ApiOperation({ summary: 'Get a specific execution details' })
  @ApiParam({ name: 'id', description: 'Execution ID' })
  async getExecution(@Request() req: any, @Param('id') id: string) {
    const organizationId = req.organizationId;
    if (!organizationId) {
      throw new BadRequestException('Organization context required');
    }
    return this.automationService.getExecution(organizationId, id);
  }

  // ==================== Node Types Reference ====================

  @Get('node-types')
  @OrgAdminOnly()
  @ApiOperation({ summary: 'Get available node types for the workflow builder' })
  getNodeTypes() {
    return {
      triggers: [
        {
          type: 'trigger_stock_critical',
          label: 'Stock Critical',
          description: 'Triggers when stock falls below minimum threshold',
          configSchema: {
            inventoryItemIds: { type: 'array', items: { type: 'string' }, description: 'Filter by specific items (empty = all)' },
            threshold: { type: 'number', description: 'Override threshold (optional)' },
          },
        },
        {
          type: 'trigger_stock_out',
          label: 'Stock Out',
          description: 'Triggers when stock reaches zero',
          configSchema: {
            inventoryItemIds: { type: 'array', items: { type: 'string' }, description: 'Filter by specific items (empty = all)' },
          },
        },
        {
          type: 'trigger_stock_adjusted',
          label: 'Stock Adjusted',
          description: 'Triggers when stock is adjusted',
          configSchema: {
            inventoryItemIds: { type: 'array', items: { type: 'string' }, description: 'Filter by specific items (empty = all)' },
            adjustmentTypes: { type: 'array', items: { type: 'string', enum: ['manual', 'purchase', 'correction', 'service_usage'] } },
          },
        },
        {
          type: 'trigger_manual',
          label: 'Manual Trigger',
          description: 'Manually triggered workflow',
          configSchema: {},
        },
      ],
      conditions: [
        {
          type: 'condition_stock_level',
          label: 'Stock Level Check',
          description: 'Check if stock level meets a condition',
          configSchema: {
            inventoryItemId: { type: 'string', required: true },
            operator: { type: 'string', enum: ['lt', 'lte', 'eq', 'gte', 'gt'], required: true },
            value: { type: 'number', required: true },
          },
        },
        {
          type: 'condition_item_category',
          label: 'Item Category Check',
          description: 'Check if item belongs to a category',
          configSchema: {
            category: { type: 'string', enum: ['consumable', 'retail'], required: true },
          },
        },
      ],
      actions: [
        {
          type: 'action_api_call',
          label: 'API Call',
          description: 'Make an HTTP request to an external API',
          configSchema: {
            url: { type: 'string', required: true, description: 'API endpoint URL' },
            method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'], required: true },
            headers: { type: 'object', description: 'Request headers' },
            body: { type: 'string', description: 'Request body (JSON string, use {{variable}} for interpolation)' },
            timeout: { type: 'number', description: 'Timeout in ms (default 30000)' },
          },
        },
        {
          type: 'action_webhook',
          label: 'Webhook',
          description: 'Send a webhook with event data',
          configSchema: {
            url: { type: 'string', required: true },
            secret: { type: 'string', description: 'HMAC secret for signature' },
          },
        },
        {
          type: 'action_notification',
          label: 'Send Notification',
          description: 'Send a notification via email/SMS/WhatsApp',
          configSchema: {
            channel: { type: 'string', enum: ['email', 'sms', 'whatsapp'], required: true },
            recipients: { type: 'array', items: { type: 'string' }, required: true },
            subject: { type: 'string', description: 'Email subject (for email channel)' },
            message: { type: 'string', required: true, description: 'Message content (use {{variable}} for interpolation)' },
          },
        },
        {
          type: 'action_adjust_stock',
          label: 'Adjust Stock',
          description: 'Automatically adjust stock level',
          configSchema: {
            inventoryItemId: { type: 'string', required: true },
            quantity: { type: 'number', required: true },
            type: { type: 'string', enum: ['manual', 'purchase', 'correction'], required: true },
            reason: { type: 'string' },
          },
        },
      ],
    };
  }
}
