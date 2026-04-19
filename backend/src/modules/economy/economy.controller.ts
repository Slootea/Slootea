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
import { EconomyService } from './economy.service';
import { ParasutService } from './parasut.service';
import {
  CreateTransactionDto,
  UpdateTransactionDto,
  TransactionQueryDto,
  CreateCategoryDto,
  UpdateCategoryDto,
  AnalyticsQueryDto,
  ConnectParasutDto,
} from './dto/economy.dto';
import { TransactionType } from './entities/transaction.entity';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { OrgRolesGuard } from '../auth/guards/org-roles.guard';
import { OrgAdminOnly, OrgMemberOrAdmin } from '../auth/decorators/org-roles.decorator';

@ApiTags('economy')
@Controller('economy')
@UseGuards(ClerkAuthGuard, OrgRolesGuard)
@ApiBearerAuth()
@ApiHeader({ name: 'x-organization-id', required: true, description: 'Organization ID' })
export class EconomyController {
  constructor(
    private readonly economyService: EconomyService,
    private readonly parasutService: ParasutService,
  ) {}

  // ==================== Transactions ====================

  @Post('transactions')
  @OrgAdminOnly()
  @ApiOperation({ summary: 'Create a new transaction (income or expense)' })
  async createTransaction(@Request() req: any, @Body() dto: CreateTransactionDto) {
    const organizationId = req.organizationId;
    if (!organizationId) throw new BadRequestException('Organization context required');
    return this.economyService.createTransaction(organizationId, dto);
  }

  @Get('transactions')
  @OrgMemberOrAdmin()
  @ApiOperation({ summary: 'Get all transactions with pagination and filtering' })
  async findAllTransactions(@Request() req: any, @Query() query: TransactionQueryDto) {
    const organizationId = req.organizationId;
    if (!organizationId) throw new BadRequestException('Organization context required');
    return this.economyService.findAllTransactions(organizationId, query);
  }

  @Get('transactions/:id')
  @OrgMemberOrAdmin()
  @ApiOperation({ summary: 'Get a specific transaction' })
  @ApiParam({ name: 'id', description: 'Transaction ID' })
  async findOneTransaction(@Request() req: any, @Param('id') id: string) {
    const organizationId = req.organizationId;
    if (!organizationId) throw new BadRequestException('Organization context required');
    return this.economyService.findOneTransaction(organizationId, id);
  }

  @Put('transactions/:id')
  @OrgAdminOnly()
  @ApiOperation({ summary: 'Update a transaction' })
  @ApiParam({ name: 'id', description: 'Transaction ID' })
  async updateTransaction(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateTransactionDto,
  ) {
    const organizationId = req.organizationId;
    if (!organizationId) throw new BadRequestException('Organization context required');
    return this.economyService.updateTransaction(organizationId, id, dto);
  }

  @Delete('transactions/:id')
  @OrgAdminOnly()
  @ApiOperation({ summary: 'Delete a transaction' })
  @ApiParam({ name: 'id', description: 'Transaction ID' })
  async deleteTransaction(@Request() req: any, @Param('id') id: string) {
    const organizationId = req.organizationId;
    if (!organizationId) throw new BadRequestException('Organization context required');
    await this.economyService.deleteTransaction(organizationId, id);
    return { message: 'Transaction deleted successfully' };
  }

  // ==================== Categories ====================

  @Post('categories')
  @OrgAdminOnly()
  @ApiOperation({ summary: 'Create a transaction category' })
  async createCategory(@Request() req: any, @Body() dto: CreateCategoryDto) {
    const organizationId = req.organizationId;
    if (!organizationId) throw new BadRequestException('Organization context required');
    return this.economyService.createCategory(organizationId, dto);
  }

  @Get('categories')
  @OrgMemberOrAdmin()
  @ApiOperation({ summary: 'Get all transaction categories' })
  @ApiQuery({ name: 'type', required: false, enum: TransactionType })
  async findAllCategories(
    @Request() req: any,
    @Query('type') type?: TransactionType,
  ) {
    const organizationId = req.organizationId;
    if (!organizationId) throw new BadRequestException('Organization context required');
    return this.economyService.findAllCategories(organizationId, type);
  }

  @Put('categories/:id')
  @OrgAdminOnly()
  @ApiOperation({ summary: 'Update a transaction category' })
  @ApiParam({ name: 'id', description: 'Category ID' })
  async updateCategory(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    const organizationId = req.organizationId;
    if (!organizationId) throw new BadRequestException('Organization context required');
    return this.economyService.updateCategory(organizationId, id, dto);
  }

  @Delete('categories/:id')
  @OrgAdminOnly()
  @ApiOperation({ summary: 'Delete a transaction category' })
  @ApiParam({ name: 'id', description: 'Category ID' })
  async deleteCategory(@Request() req: any, @Param('id') id: string) {
    const organizationId = req.organizationId;
    if (!organizationId) throw new BadRequestException('Organization context required');
    await this.economyService.deleteCategory(organizationId, id);
    return { message: 'Category deleted successfully' };
  }

  // ==================== Analytics ====================

  @Get('analytics')
  @OrgMemberOrAdmin()
  @ApiOperation({ summary: 'Get financial analytics (income/expense trends, category breakdown)' })
  @ApiQuery({ name: 'startDate', required: true, type: String })
  @ApiQuery({ name: 'endDate', required: true, type: String })
  @ApiQuery({ name: 'groupBy', required: false, enum: ['day', 'week', 'month'] })
  async getAnalytics(@Request() req: any, @Query() query: AnalyticsQueryDto) {
    const organizationId = req.organizationId;
    if (!organizationId) throw new BadRequestException('Organization context required');
    return this.economyService.getAnalytics(organizationId, query);
  }

  @Get('summary')
  @OrgMemberOrAdmin()
  @ApiOperation({ summary: 'Get quick financial summary for a period' })
  @ApiQuery({ name: 'startDate', required: true, type: String })
  @ApiQuery({ name: 'endDate', required: true, type: String })
  async getSummary(
    @Request() req: any,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const organizationId = req.organizationId;
    if (!organizationId) throw new BadRequestException('Organization context required');
    return this.economyService.getSummary(organizationId, startDate, endDate);
  }

  // ==================== Parasut Integration ====================

  @Get('parasut/status')
  @OrgAdminOnly()
  @ApiOperation({ summary: 'Get Parasut integration status' })
  async getParasutStatus(@Request() req: any) {
    const organizationId = req.organizationId;
    if (!organizationId) throw new BadRequestException('Organization context required');
    return this.parasutService.getStatus(organizationId);
  }

  @Post('parasut/connect')
  @OrgAdminOnly()
  @ApiOperation({ summary: 'Connect Parasut integration' })
  async connectParasut(@Request() req: any, @Body() dto: ConnectParasutDto) {
    const organizationId = req.organizationId;
    if (!organizationId) throw new BadRequestException('Organization context required');
    return this.parasutService.connect(organizationId, dto);
  }

  @Post('parasut/disconnect')
  @OrgAdminOnly()
  @ApiOperation({ summary: 'Disconnect Parasut integration' })
  async disconnectParasut(@Request() req: any) {
    const organizationId = req.organizationId;
    if (!organizationId) throw new BadRequestException('Organization context required');
    await this.parasutService.disconnect(organizationId);
    return { message: 'Parasut disconnected successfully' };
  }

  @Post('parasut/sync')
  @OrgAdminOnly()
  @ApiOperation({ summary: 'Trigger manual sync from Parasut' })
  async syncParasut(@Request() req: any) {
    const organizationId = req.organizationId;
    if (!organizationId) throw new BadRequestException('Organization context required');
    return this.parasutService.syncTransactions(organizationId);
  }
}
