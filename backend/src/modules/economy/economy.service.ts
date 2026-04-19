import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction, TransactionType } from './entities/transaction.entity';
import { TransactionCategory } from './entities/transaction-category.entity';
import {
  CreateTransactionDto,
  UpdateTransactionDto,
  TransactionQueryDto,
  CreateCategoryDto,
  UpdateCategoryDto,
  AnalyticsQueryDto,
  PaginatedTransactionResponseDto,
  TransactionResponseDto,
  AnalyticsResponseDto,
  AnalyticsSummaryDto,
  CategoryBreakdownDto,
  TrendDataDto,
} from './dto/economy.dto';

@Injectable()
export class EconomyService {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    @InjectRepository(TransactionCategory)
    private readonly categoryRepository: Repository<TransactionCategory>,
  ) {}

  // ==================== Transaction CRUD ====================

  async createTransaction(
    organizationId: string,
    dto: CreateTransactionDto,
  ): Promise<Transaction> {
    const transaction = this.transactionRepository.create({
      ...dto,
      organizationId,
    });
    return this.transactionRepository.save(transaction);
  }

  async findAllTransactions(
    organizationId: string,
    query: TransactionQueryDto,
  ): Promise<PaginatedTransactionResponseDto> {
    const {
      page = 1,
      limit = 20,
      type,
      search,
      categoryId,
      startDate,
      endDate,
      paymentMethod,
      sortBy = 'date',
      sortOrder = 'DESC',
    } = query;
    const skip = (page - 1) * limit;

    const qb = this.transactionRepository
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.category', 'category')
      .where('t.organizationId = :organizationId', { organizationId });

    if (type) {
      qb.andWhere('t.type = :type', { type });
    }

    if (search) {
      qb.andWhere(
        '(LOWER(t.description) LIKE LOWER(:search) OR LOWER(t.notes) LIKE LOWER(:search) OR LOWER(t.contactName) LIKE LOWER(:search))',
        { search: `%${search}%` },
      );
    }

    if (categoryId) {
      qb.andWhere('t.categoryId = :categoryId', { categoryId });
    }

    if (startDate) {
      qb.andWhere('t.date >= :startDate', { startDate });
    }

    if (endDate) {
      qb.andWhere('t.date <= :endDate', { endDate });
    }

    if (paymentMethod) {
      qb.andWhere('t.paymentMethod = :paymentMethod', { paymentMethod });
    }

    const allowedSortFields = ['date', 'amount', 'createdAt', 'description'];
    const safeSort = allowedSortFields.includes(sortBy) ? sortBy : 'date';

    const [items, total] = await qb
      .orderBy(`t.${safeSort}`, sortOrder === 'ASC' ? 'ASC' : 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      items: items.map((t) => this.toTransactionResponse(t)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOneTransaction(organizationId: string, id: string): Promise<Transaction> {
    const transaction = await this.transactionRepository.findOne({
      where: { id, organizationId },
      relations: ['category'],
    });
    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }
    return transaction;
  }

  async updateTransaction(
    organizationId: string,
    id: string,
    dto: UpdateTransactionDto,
  ): Promise<Transaction> {
    const transaction = await this.findOneTransaction(organizationId, id);
    Object.assign(transaction, dto);
    return this.transactionRepository.save(transaction);
  }

  async deleteTransaction(organizationId: string, id: string): Promise<void> {
    const transaction = await this.findOneTransaction(organizationId, id);
    await this.transactionRepository.remove(transaction);
  }

  // ==================== Category CRUD ====================

  async createCategory(
    organizationId: string,
    dto: CreateCategoryDto,
  ): Promise<TransactionCategory> {
    const category = this.categoryRepository.create({
      ...dto,
      organizationId,
    });
    return this.categoryRepository.save(category);
  }

  async findAllCategories(
    organizationId: string,
    type?: TransactionType,
  ): Promise<TransactionCategory[]> {
    const where: Record<string, unknown> = { organizationId };
    if (type) where.type = type;
    return this.categoryRepository.find({
      where,
      relations: ['children'],
      order: { name: 'ASC' },
    });
  }

  async updateCategory(
    organizationId: string,
    id: string,
    dto: UpdateCategoryDto,
  ): Promise<TransactionCategory> {
    const category = await this.categoryRepository.findOne({
      where: { id, organizationId },
    });
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    Object.assign(category, dto);
    return this.categoryRepository.save(category);
  }

  async deleteCategory(organizationId: string, id: string): Promise<void> {
    const category = await this.categoryRepository.findOne({
      where: { id, organizationId },
    });
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    await this.categoryRepository.remove(category);
  }

  // ==================== Analytics ====================

  async getAnalytics(
    organizationId: string,
    query: AnalyticsQueryDto,
  ): Promise<AnalyticsResponseDto> {
    const { startDate, endDate, groupBy = 'month' } = query;

    // Summary
    const summary = await this.getSummary(organizationId, startDate, endDate);

    // Category breakdowns
    const incomeByCategory = await this.getCategoryBreakdown(
      organizationId,
      TransactionType.INCOME,
      startDate,
      endDate,
    );
    const expenseByCategory = await this.getCategoryBreakdown(
      organizationId,
      TransactionType.EXPENSE,
      startDate,
      endDate,
    );

    // Trends
    const trends = await this.getTrends(organizationId, startDate, endDate, groupBy);

    return { summary, incomeByCategory, expenseByCategory, trends };
  }

  async getSummary(
    organizationId: string,
    startDate: string,
    endDate: string,
  ): Promise<AnalyticsSummaryDto> {
    const result = await this.transactionRepository
      .createQueryBuilder('t')
      .select([
        `COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END), 0) AS "totalIncome"`,
        `COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END), 0) AS "totalExpense"`,
        `COUNT(*)::int AS "transactionCount"`,
      ])
      .where('t.organizationId = :organizationId', { organizationId })
      .andWhere('t.date >= :startDate', { startDate })
      .andWhere('t.date <= :endDate', { endDate })
      .getRawOne();

    const totalIncome = Number(result.totalIncome);
    const totalExpense = Number(result.totalExpense);

    return {
      totalIncome,
      totalExpense,
      netProfit: totalIncome - totalExpense,
      transactionCount: result.transactionCount,
    };
  }

  private async getCategoryBreakdown(
    organizationId: string,
    type: TransactionType,
    startDate: string,
    endDate: string,
  ): Promise<CategoryBreakdownDto[]> {
    const results = await this.transactionRepository
      .createQueryBuilder('t')
      .leftJoin('t.category', 'c')
      .select([
        'COALESCE("t"."categoryId"::text, \'uncategorized\') AS "categoryId"',
        'COALESCE(c.name, \'Uncategorized\') AS "categoryName"',
        'c.color AS "categoryColor"',
        'SUM(t.amount)::decimal AS "total"',
        'COUNT(*)::int AS "count"',
      ])
      .where('t.organizationId = :organizationId', { organizationId })
      .andWhere('t.type = :type', { type })
      .andWhere('t.date >= :startDate', { startDate })
      .andWhere('t.date <= :endDate', { endDate })
      .groupBy('t.categoryId')
      .addGroupBy('c.name')
      .addGroupBy('c.color')
      .orderBy('"total"', 'DESC')
      .getRawMany();

    const grandTotal = results.reduce((sum: number, r: { total: string }) => sum + Number(r.total), 0);

    return results.map((r: { categoryId: string; categoryName: string; categoryColor: string; total: string; count: number }) => ({
      categoryId: r.categoryId,
      categoryName: r.categoryName,
      categoryColor: r.categoryColor,
      total: Number(r.total),
      count: r.count,
      percentage: grandTotal > 0 ? Number(((Number(r.total) / grandTotal) * 100).toFixed(1)) : 0,
    }));
  }

  private async getTrends(
    organizationId: string,
    startDate: string,
    endDate: string,
    groupBy: 'day' | 'week' | 'month',
  ): Promise<TrendDataDto[]> {
    const dateFormat =
      groupBy === 'day'
        ? 'YYYY-MM-DD'
        : groupBy === 'week'
          ? 'IYYY-"W"IW'
          : 'YYYY-MM';

    const results = await this.transactionRepository
      .createQueryBuilder('t')
      .select([
        `TO_CHAR(t.date, '${dateFormat}') AS "period"`,
        `COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END), 0)::decimal AS "income"`,
        `COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END), 0)::decimal AS "expense"`,
      ])
      .where('t.organizationId = :organizationId', { organizationId })
      .andWhere('t.date >= :startDate', { startDate })
      .andWhere('t.date <= :endDate', { endDate })
      .groupBy(`TO_CHAR(t.date, '${dateFormat}')`)
      .orderBy(`"period"`, 'ASC')
      .getRawMany();

    return results.map((r: { period: string; income: string; expense: string }) => ({
      period: r.period,
      income: Number(r.income),
      expense: Number(r.expense),
      net: Number(r.income) - Number(r.expense),
    }));
  }

  // ==================== Helpers ====================

  private toTransactionResponse(t: Transaction): TransactionResponseDto {
    return {
      id: t.id,
      type: t.type,
      amount: Number(t.amount),
      currency: t.currency,
      description: t.description,
      date: t.date,
      paymentMethod: t.paymentMethod,
      categoryId: t.categoryId ?? undefined,
      categoryName: t.category?.name ?? undefined,
      categoryColor: t.category?.color ?? undefined,
      source: t.source,
      notes: t.notes ?? undefined,
      referenceNumber: t.referenceNumber ?? undefined,
      contactName: t.contactName ?? undefined,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    };
  }
}
