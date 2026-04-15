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
import { InventoryService } from './inventory.service';
import {
  CreateInventoryItemDto,
  UpdateInventoryItemDto,
  AdjustStockDto,
  InventoryQueryDto,
  UpdateServiceInventoryUsageDto,
} from './dto/inventory.dto';
import { InventoryCategory } from './entities/inventory-item.entity';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { OrgRolesGuard } from '../auth/guards/org-roles.guard';
import { OrgAdminOnly, OrgMemberOrAdmin } from '../auth/decorators/org-roles.decorator';

@ApiTags('inventory')
@Controller('inventory')
@UseGuards(ClerkAuthGuard, OrgRolesGuard)
@ApiBearerAuth()
@ApiHeader({ name: 'x-organization-id', required: true, description: 'Organization ID' })
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  // ==================== Inventory Item CRUD ====================

  @Post()
  @OrgAdminOnly()
  @ApiOperation({ summary: 'Create a new inventory item' })
  async create(@Request() req: any, @Body() createDto: CreateInventoryItemDto) {
    const organizationId = req.organizationId;
    if (!organizationId) {
      throw new BadRequestException('Organization context required');
    }
    return this.inventoryService.create(organizationId, createDto);
  }

  @Get()
  @OrgMemberOrAdmin()
  @ApiOperation({ summary: 'Get all inventory items with pagination and filtering' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'category', required: false, enum: ['consumable', 'retail'] })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'lowStock', required: false, type: Boolean })
  async findAll(@Request() req: any, @Query() query: InventoryQueryDto) {
    const organizationId = req.organizationId;
    if (!organizationId) {
      throw new BadRequestException('Organization context required');
    }
    return this.inventoryService.findAll(organizationId, query);
  }

  @Get('low-stock')
  @OrgMemberOrAdmin()
  @ApiOperation({ summary: 'Get items with low stock (below minimum threshold)' })
  async getLowStock(@Request() req: any) {
    const organizationId = req.organizationId;
    if (!organizationId) {
      throw new BadRequestException('Organization context required');
    }
    return this.inventoryService.getLowStockItems(organizationId);
  }

  @Get('reports/daily-usage')
  @OrgMemberOrAdmin()
  @ApiOperation({ summary: 'Get daily inventory usage report' })
  @ApiQuery({ name: 'startDate', required: true, type: String, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: true, type: String, description: 'End date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'itemId', required: false, type: String, description: 'Filter by inventory item ID' })
  @ApiQuery({ name: 'category', required: false, enum: InventoryCategory })
  async getDailyUsageReport(
    @Request() req: any,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('itemId') itemId?: string,
    @Query('category') category?: InventoryCategory,
  ) {
    const organizationId = req.organizationId;
    if (!organizationId) {
      throw new BadRequestException('Organization context required');
    }
    if (!startDate || !endDate) {
      throw new BadRequestException('startDate and endDate are required');
    }
    return this.inventoryService.getDailyUsageReport(
      organizationId,
      startDate,
      endDate,
      itemId,
      category,
    );
  }

  @Get(':id')
  @OrgMemberOrAdmin()
  @ApiOperation({ summary: 'Get a specific inventory item' })
  @ApiParam({ name: 'id', description: 'Inventory item ID' })
  async findOne(@Request() req: any, @Param('id') id: string) {
    const organizationId = req.organizationId;
    if (!organizationId) {
      throw new BadRequestException('Organization context required');
    }
    return this.inventoryService.findOne(organizationId, id);
  }

  @Put(':id')
  @OrgAdminOnly()
  @ApiOperation({ summary: 'Update an inventory item' })
  @ApiParam({ name: 'id', description: 'Inventory item ID' })
  async update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() updateDto: UpdateInventoryItemDto,
  ) {
    const organizationId = req.organizationId;
    if (!organizationId) {
      throw new BadRequestException('Organization context required');
    }
    return this.inventoryService.update(organizationId, id, updateDto);
  }

  @Delete(':id')
  @OrgAdminOnly()
  @ApiOperation({ summary: 'Delete an inventory item' })
  @ApiParam({ name: 'id', description: 'Inventory item ID' })
  async remove(@Request() req: any, @Param('id') id: string) {
    const organizationId = req.organizationId;
    if (!organizationId) {
      throw new BadRequestException('Organization context required');
    }
    await this.inventoryService.remove(organizationId, id);
    return { message: 'Inventory item deleted successfully' };
  }

  // ==================== Stock Management ====================

  @Post(':id/adjust')
  @OrgAdminOnly()
  @ApiOperation({ summary: 'Manually adjust stock for an inventory item' })
  @ApiParam({ name: 'id', description: 'Inventory item ID' })
  async adjustStock(
    @Request() req: any,
    @Param('id') id: string,
    @Body() adjustDto: AdjustStockDto,
  ) {
    const organizationId = req.organizationId;
    if (!organizationId) {
      throw new BadRequestException('Organization context required');
    }
    return this.inventoryService.adjustStock(
      organizationId,
      id,
      adjustDto,
      req.user?.dbUserId,
    );
  }

  @Get(':id/history')
  @OrgMemberOrAdmin()
  @ApiOperation({ summary: 'Get stock adjustment history for an item' })
  @ApiParam({ name: 'id', description: 'Inventory item ID' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Max records to return' })
  async getStockHistory(
    @Request() req: any,
    @Param('id') id: string,
    @Query('limit') limit?: number,
  ) {
    const organizationId = req.organizationId;
    if (!organizationId) {
      throw new BadRequestException('Organization context required');
    }
    return this.inventoryService.getStockHistory(organizationId, id, limit);
  }

  // ==================== Service Inventory Usage ====================

  @Get('service/:serviceOptionId/usage')
  @OrgMemberOrAdmin()
  @ApiOperation({ summary: 'Get inventory items used by a service' })
  @ApiParam({ name: 'serviceOptionId', description: 'Service Option ID' })
  async getServiceUsage(@Param('serviceOptionId') serviceOptionId: string) {
    return this.inventoryService.getServiceInventoryUsage(serviceOptionId);
  }

  @Put('service/:serviceOptionId/usage')
  @OrgAdminOnly()
  @ApiOperation({ summary: 'Update inventory items used by a service' })
  @ApiParam({ name: 'serviceOptionId', description: 'Service Option ID' })
  async updateServiceUsage(
    @Request() req: any,
    @Param('serviceOptionId') serviceOptionId: string,
    @Body() dto: UpdateServiceInventoryUsageDto,
  ) {
    const organizationId = req.organizationId;
    if (!organizationId) {
      throw new BadRequestException('Organization context required');
    }
    return this.inventoryService.updateServiceInventoryUsage(
      organizationId,
      serviceOptionId,
      dto.items,
    );
  }
}
