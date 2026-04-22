import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { InventoryItem, InventoryCategory } from './entities/inventory-item.entity';
import { ServiceInventoryUsage } from './entities/service-inventory-usage.entity';
import { StockAdjustment, StockAdjustmentType } from './entities/stock-adjustment.entity';
import { OrganizationSettings } from '../settings/entities/organization-settings.entity';
import {
  CreateInventoryItemDto,
  UpdateInventoryItemDto,
  AdjustStockDto,
  InventoryQueryDto,
  ServiceInventoryUsageDto,
  InventoryItemResponseDto,
  PaginatedInventoryResponseDto,
  LowStockSummaryDto,
} from './dto/inventory.dto';
import {
  formatISODateInTimezone,
  createUTCFromLocalTime,
} from '../../common/utils/timezone.util';

const DEFAULT_TIMEZONE = 'UTC';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(InventoryItem)
    private readonly inventoryItemRepository: Repository<InventoryItem>,
    @InjectRepository(ServiceInventoryUsage)
    private readonly serviceUsageRepository: Repository<ServiceInventoryUsage>,
    @InjectRepository(StockAdjustment)
    private readonly stockAdjustmentRepository: Repository<StockAdjustment>,
    @InjectRepository(OrganizationSettings)
    private readonly organizationSettingsRepository: Repository<OrganizationSettings>,
  ) {}

  /**
   * Get the timezone for an organization, defaulting to UTC if not set
   */
  private async getOrganizationTimezone(organizationId: string): Promise<string> {
    const settings = await this.organizationSettingsRepository.findOne({
      where: { organizationId },
    });
    return settings?.timezone || DEFAULT_TIMEZONE;
  }

  // ==================== Inventory Item CRUD ====================

  async create(organizationId: string, dto: CreateInventoryItemDto): Promise<InventoryItem> {
    // Normalize empty SKU to null (unique constraint only excludes NULL, not empty strings)
    const sku = dto.sku?.trim() || null;

    // Check for duplicate SKU within organization
    if (sku) {
      const existing = await this.inventoryItemRepository.findOne({
        where: { organizationId, sku },
      });
      if (existing) {
        throw new ConflictException(`An item with SKU "${sku}" already exists`);
      }
    }

    const item = this.inventoryItemRepository.create({
      ...dto,
      sku,
      organizationId,
    });

    return this.inventoryItemRepository.save(item);
  }

  async findAll(
    organizationId: string,
    query: InventoryQueryDto,
  ): Promise<PaginatedInventoryResponseDto> {
    const { page = 1, limit = 20, search, category, isActive, lowStock } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.inventoryItemRepository
      .createQueryBuilder('item')
      .where('item.organizationId = :organizationId', { organizationId });

    if (search) {
      queryBuilder.andWhere(
        '(LOWER(item.name) LIKE LOWER(:search) OR LOWER(item.sku) LIKE LOWER(:search))',
        { search: `%${search}%` },
      );
    }

    if (category) {
      queryBuilder.andWhere('item.category = :category', { category });
    }

    if (typeof isActive === 'boolean') {
      queryBuilder.andWhere('item.isActive = :isActive', { isActive });
    }

    if (lowStock) {
      queryBuilder.andWhere('item.currentStock <= item.minStockAlert');
    }

    const [items, total] = await queryBuilder
      .orderBy('item.name', 'ASC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      items: items.map(this.toResponseDto),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(organizationId: string, id: string): Promise<InventoryItem> {
    const item = await this.inventoryItemRepository.findOne({
      where: { id, organizationId },
    });

    if (!item) {
      throw new NotFoundException(`Inventory item not found`);
    }

    return item;
  }

  async update(
    organizationId: string,
    id: string,
    dto: UpdateInventoryItemDto,
    updatedBy?: string,
  ): Promise<InventoryItem> {
    const item = await this.findOne(organizationId, id);

    // Normalize empty SKU to null (unique constraint only excludes NULL, not empty strings)
    const sku = dto.sku !== undefined ? (dto.sku?.trim() || null) : item.sku;

    // Check for duplicate SKU if updating
    if (sku && sku !== item.sku) {
      const existing = await this.inventoryItemRepository.findOne({
        where: { organizationId, sku },
      });
      if (existing) {
        throw new ConflictException(`An item with SKU "${sku}" already exists`);
      }
    }

    // Handle currentStock change separately to record an audit trail
    const { currentStock: newStockRaw, ...rest } = dto;
    Object.assign(item, { ...rest, sku });

    if (newStockRaw !== undefined && newStockRaw !== null) {
      const newStock = Number(newStockRaw);
      const oldStock = Number(item.currentStock);
      const delta = newStock - oldStock;
      if (delta !== 0) {
        const adjustment = this.stockAdjustmentRepository.create({
          inventoryItemId: id,
          type: StockAdjustmentType.MANUAL,
          quantity: delta,
          stockAfter: newStock,
          reason: 'Manual edit',
          adjustedBy: updatedBy,
        });
        await this.stockAdjustmentRepository.save(adjustment);
        item.currentStock = newStock;
      }
    }

    return this.inventoryItemRepository.save(item);
  }

  async remove(organizationId: string, id: string): Promise<void> {
    const item = await this.findOne(organizationId, id);
    await this.inventoryItemRepository.remove(item);
  }

  // ==================== Stock Management ====================

  async adjustStock(
    organizationId: string,
    itemId: string,
    dto: AdjustStockDto,
    adjustedBy?: string,
  ): Promise<InventoryItem> {
    const item = await this.findOne(organizationId, itemId);

    const newStock = Number(item.currentStock) + dto.quantity;
    if (newStock < 0) {
      throw new BadRequestException(
        `Insufficient stock. Current: ${item.currentStock}, Adjustment: ${dto.quantity}`,
      );
    }

    // Record the adjustment
    const adjustment = this.stockAdjustmentRepository.create({
      inventoryItemId: itemId,
      type: dto.type || StockAdjustmentType.MANUAL,
      quantity: dto.quantity,
      stockAfter: newStock,
      reason: dto.reason,
      adjustedBy,
    });
    await this.stockAdjustmentRepository.save(adjustment);

    // Update the stock
    item.currentStock = newStock;
    return this.inventoryItemRepository.save(item);
  }

  async getLowStockItems(organizationId: string): Promise<LowStockSummaryDto> {
    const items = await this.inventoryItemRepository.find({
      where: { organizationId, isActive: true },
    });

    const lowStockItems = items.filter(
      (item) => Number(item.currentStock) <= Number(item.minStockAlert),
    );

    return {
      totalLowStockItems: lowStockItems.length,
      items: lowStockItems.map(this.toResponseDto),
    };
  }

  async getStockHistory(
    organizationId: string,
    itemId: string,
    limit = 50,
  ): Promise<StockAdjustment[]> {
    // Verify the item belongs to the organization
    await this.findOne(organizationId, itemId);

    return this.stockAdjustmentRepository.find({
      where: { inventoryItemId: itemId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async getRecentActivity(
    organizationId: string,
    page = 1,
    limit = 20,
  ): Promise<{
    items: Array<StockAdjustment & { itemName: string; unit: string }>;
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20));
    const skip = (safePage - 1) * safeLimit;

    const [rows, total] = await this.stockAdjustmentRepository
      .createQueryBuilder('adj')
      .innerJoinAndSelect('adj.inventoryItem', 'item')
      .where('item.organizationId = :organizationId', { organizationId })
      .orderBy('adj.createdAt', 'DESC')
      .skip(skip)
      .take(safeLimit)
      .getManyAndCount();

    const items = rows.map((adj) => ({
      ...adj,
      quantity: Number(adj.quantity),
      stockAfter: Number(adj.stockAfter),
      itemName: adj.inventoryItem?.name ?? 'Unknown Item',
      unit: adj.inventoryItem?.unit ?? '',
      inventoryItem: undefined as any,
    }));

    return {
      items,
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit) || 1,
    };
  }

  // ==================== Service Inventory Usage ====================

  async getServiceInventoryUsage(serviceOptionId: string): Promise<ServiceInventoryUsage[]> {
    return this.serviceUsageRepository.find({
      where: { serviceOptionId },
      relations: ['inventoryItem'],
    });
  }

  async updateServiceInventoryUsage(
    organizationId: string,
    serviceOptionId: string,
    items: ServiceInventoryUsageDto[],
  ): Promise<ServiceInventoryUsage[]> {
    // Verify all inventory items belong to the organization
    for (const item of items) {
      await this.findOne(organizationId, item.inventoryItemId);
    }

    // Delete existing usages
    await this.serviceUsageRepository.delete({ serviceOptionId });

    // Create new usages
    const usages = items.map((item) =>
      this.serviceUsageRepository.create({
        serviceOptionId,
        inventoryItemId: item.inventoryItemId,
        quantityUsed: item.quantityUsed,
      }),
    );

    return this.serviceUsageRepository.save(usages);
  }

  // ==================== Appointment Integration ====================

  /**
   * Deduct inventory when an appointment is completed.
   * Called from AppointmentsService when status changes to 'completed'.
   */
  async deductInventoryForAppointment(
    organizationId: string,
    appointmentId: string,
    serviceOptionId: string,
    adjustedBy?: string,
  ): Promise<void> {
    const usages = await this.serviceUsageRepository.find({
      where: { serviceOptionId },
    });

    for (const usage of usages) {
      try {
        await this.adjustStock(
          organizationId,
          usage.inventoryItemId,
          {
            quantity: -usage.quantityUsed,
            type: StockAdjustmentType.APPOINTMENT,
            reason: `Appointment ${appointmentId}`,
          },
          adjustedBy,
        );
      } catch (error) {
        // Log but don't fail the appointment if inventory deduction fails
        console.error(
          `Failed to deduct inventory for item ${usage.inventoryItemId}: ${error.message}`,
        );
      }
    }
  }

  // ==================== Reports ====================

  async getDailyUsageReport(
    organizationId: string,
    startDate: string,
    endDate: string,
    itemId?: string,
    category?: InventoryCategory,
  ): Promise<{
    items: Array<{
      itemId: string;
      itemName: string;
      unit: string;
      dailyData: Array<{ date: string; used: number; added: number; netChange: number }>;
      totalUsed: number;
      totalAdded: number;
    }>;
    startDate: string;
    endDate: string;
  }> {
    // Get organization timezone
    const timezone = await this.getOrganizationTimezone(organizationId);

    // Build query for inventory items
    const itemsQuery = this.inventoryItemRepository
      .createQueryBuilder('item')
      .where('item.organizationId = :organizationId', { organizationId })
      .andWhere('item.isActive = true');

    if (itemId) {
      itemsQuery.andWhere('item.id = :itemId', { itemId });
    }

    if (category) {
      itemsQuery.andWhere('item.category = :category', { category });
    }

    const inventoryItems = await itemsQuery.getMany();

    if (inventoryItems.length === 0) {
      return { items: [], startDate, endDate };
    }

    const itemIds = inventoryItems.map((i) => i.id);

    // Convert local date range to UTC boundaries
    // startDate at 00:00 local time -> UTC
    // endDate at 23:59:59.999 local time -> UTC
    const startUTC = createUTCFromLocalTime(startDate, '00:00', timezone);
    const endUTC = createUTCFromLocalTime(endDate, '23:59', timezone);
    // Add a bit to ensure we capture all adjustments in the last minute
    endUTC.setSeconds(59, 999);

    // Get all adjustments within the date range (using UTC boundaries)
    const adjustments = await this.stockAdjustmentRepository
      .createQueryBuilder('adj')
      .where('adj.inventoryItemId IN (:...itemIds)', { itemIds })
      .andWhere('adj.createdAt >= :startUTC', { startUTC })
      .andWhere('adj.createdAt <= :endUTC', { endUTC })
      .orderBy('adj.createdAt', 'ASC')
      .getMany();

    // Generate all dates in the range (local dates)
    const dates: string[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(d.toISOString().split('T')[0]);
    }

    // Group adjustments by item and date (using organization timezone)
    const result = inventoryItems.map((item) => {
      const itemAdjustments = adjustments.filter((a) => a.inventoryItemId === item.id);

      const dailyData = dates.map((date) => {
        // Filter adjustments that fall on this date in the organization's timezone
        const dayAdjustments = itemAdjustments.filter(
          (a) => formatISODateInTimezone(a.createdAt, timezone) === date,
        );

        const used = dayAdjustments
          .filter((a) => Number(a.quantity) < 0)
          .reduce((sum, a) => sum + Math.abs(Number(a.quantity)), 0);

        const added = dayAdjustments
          .filter((a) => Number(a.quantity) > 0)
          .reduce((sum, a) => sum + Number(a.quantity), 0);

        return {
          date,
          used: Number(used.toFixed(2)),
          added: Number(added.toFixed(2)),
          netChange: Number((added - used).toFixed(2)),
        };
      });

      const totalUsed = dailyData.reduce((sum, d) => sum + d.used, 0);
      const totalAdded = dailyData.reduce((sum, d) => sum + d.added, 0);

      return {
        itemId: item.id,
        itemName: item.name,
        unit: item.unit,
        dailyData,
        totalUsed: Number(totalUsed.toFixed(2)),
        totalAdded: Number(totalAdded.toFixed(2)),
      };
    });

    return { items: result, startDate, endDate };
  }

  // ==================== Helpers ====================

  private toResponseDto(item: InventoryItem): InventoryItemResponseDto {
    return {
      id: item.id,
      name: item.name,
      sku: item.sku ?? undefined,
      description: item.description,
      category: item.category,
      unit: item.unit,
      currentStock: Number(item.currentStock),
      minStockAlert: Number(item.minStockAlert),
      costPerUnit: item.costPerUnit ? Number(item.costPerUnit) : undefined,
      retailPrice: item.retailPrice ? Number(item.retailPrice) : undefined,
      imageBase64: item.imageBase64,
      isActive: item.isActive,
      isLowStock: Number(item.currentStock) <= Number(item.minStockAlert),
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }
}
