import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { ParasutIntegration, ParasutSyncStatus } from './entities/parasut-integration.entity';
import { Transaction, TransactionType, TransactionSource, PaymentMethod } from './entities/transaction.entity';
import { ConnectParasutDto, ParasutStatusDto } from './dto/economy.dto';

@Injectable()
export class ParasutService {
  private readonly logger = new Logger(ParasutService.name);
  private readonly clientId: string;
  private readonly clientSecret: string;

  constructor(
    @InjectRepository(ParasutIntegration)
    private readonly integrationRepository: Repository<ParasutIntegration>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    private readonly configService: ConfigService,
  ) {
    this.clientId = this.configService.get<string>('PARASUT_CLIENT_ID', '');
    this.clientSecret = this.configService.get<string>('PARASUT_CLIENT_SECRET', '');
  }

  // ==================== Connection ====================

  async connect(organizationId: string, dto: ConnectParasutDto): Promise<ParasutStatusDto> {
    if (!this.clientId || !this.clientSecret) {
      throw new BadRequestException('Parasut integration is not configured. Contact your administrator.');
    }

    // Get OAuth token via resource owner password grant
    const tokenData = await this.getToken(dto.username, dto.password);

    // Check if already connected
    let integration = await this.integrationRepository.findOne({
      where: { organizationId },
    });

    if (integration) {
      integration.companyId = dto.companyId;
      integration.accessToken = tokenData.access_token;
      integration.refreshToken = tokenData.refresh_token;
      integration.tokenExpiresAt = new Date(Date.now() + tokenData.expires_in * 1000);
      integration.username = dto.username;
      integration.isActive = true;
      integration.syncStatus = ParasutSyncStatus.IDLE;
      integration.lastSyncError = null as any;
    } else {
      integration = this.integrationRepository.create({
        organizationId,
        companyId: dto.companyId,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        tokenExpiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
        username: dto.username,
        isActive: true,
      });
    }

    await this.integrationRepository.save(integration);
    return this.toStatusDto(integration);
  }

  async disconnect(organizationId: string): Promise<void> {
    const integration = await this.integrationRepository.findOne({
      where: { organizationId },
    });
    if (integration) {
      await this.integrationRepository.remove(integration);
    }
  }

  async getStatus(organizationId: string): Promise<ParasutStatusDto> {
    const integration = await this.integrationRepository.findOne({
      where: { organizationId },
    });

    if (!integration) {
      return { connected: false };
    }

    return this.toStatusDto(integration);
  }

  // ==================== Sync ====================

  async syncTransactions(organizationId: string): Promise<{ imported: number; skipped: number }> {
    const integration = await this.getActiveIntegration(organizationId);

    await this.integrationRepository.update(integration.id, {
      syncStatus: ParasutSyncStatus.SYNCING,
    });

    try {
      const client = await this.getAuthedClient(integration);
      let imported = 0;
      let skipped = 0;

      // Sync sales invoices (income)
      const salesResult = await this.syncSalesInvoices(client, integration, organizationId);
      imported += salesResult.imported;
      skipped += salesResult.skipped;

      // Sync purchase bills (expense)
      const purchaseResult = await this.syncPurchaseBills(client, integration, organizationId);
      imported += purchaseResult.imported;
      skipped += purchaseResult.skipped;

      await this.integrationRepository.update(integration.id, {
        syncStatus: ParasutSyncStatus.SUCCESS,
        lastSyncAt: new Date(),
        lastSyncError: null as any,
      });

      return { imported, skipped };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown sync error';
      this.logger.error(`Parasut sync failed for org ${organizationId}: ${errorMessage}`);

      await this.integrationRepository.update(integration.id, {
        syncStatus: ParasutSyncStatus.ERROR,
        lastSyncError: errorMessage,
      });

      throw new BadRequestException(`Sync failed: ${errorMessage}`);
    }
  }

  // ==================== Private Methods ====================

  private async getToken(
    username: string,
    password: string,
  ): Promise<{ access_token: string; refresh_token: string; expires_in: number }> {
    try {
      const response = await axios.post('https://api.parasut.com/oauth/token', {
        grant_type: 'password',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        username,
        password,
      });
      return response.data;
    } catch (error) {
      this.logger.error('Parasut OAuth failed', error);
      throw new BadRequestException('Failed to authenticate with Parasut. Check your credentials.');
    }
  }

  private async refreshTokenIfNeeded(integration: ParasutIntegration): Promise<ParasutIntegration> {
    // Refresh if token expires within 5 minutes
    if (new Date(integration.tokenExpiresAt).getTime() - Date.now() > 5 * 60 * 1000) {
      return integration;
    }

    try {
      const response = await axios.post('https://api.parasut.com/oauth/token', {
        grant_type: 'refresh_token',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: integration.refreshToken,
      });

      integration.accessToken = response.data.access_token;
      integration.refreshToken = response.data.refresh_token;
      integration.tokenExpiresAt = new Date(Date.now() + response.data.expires_in * 1000);
      await this.integrationRepository.save(integration);

      return integration;
    } catch (error) {
      this.logger.error('Parasut token refresh failed', error);
      throw new BadRequestException('Failed to refresh Parasut token. Please reconnect.');
    }
  }

  private async getActiveIntegration(organizationId: string): Promise<ParasutIntegration> {
    const integration = await this.integrationRepository.findOne({
      where: { organizationId, isActive: true },
    });
    if (!integration) {
      throw new NotFoundException('Parasut integration not found. Please connect first.');
    }
    return integration;
  }

  private async getAuthedClient(integration: ParasutIntegration): Promise<AxiosInstance> {
    const refreshed = await this.refreshTokenIfNeeded(integration);
    return axios.create({
      baseURL: `https://api.parasut.com/v4/${refreshed.companyId}`,
      headers: {
        Authorization: `Bearer ${refreshed.accessToken}`,
        'Content-Type': 'application/json',
      },
    });
  }

  private async syncSalesInvoices(
    client: AxiosInstance,
    integration: ParasutIntegration,
    organizationId: string,
  ): Promise<{ imported: number; skipped: number }> {
    let imported = 0;
    let skipped = 0;
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      try {
        const response = await client.get('/sales_invoices', {
          params: { 'page[number]': page, 'page[size]': 25 },
        });

        const invoices = response.data.data || [];
        if (invoices.length === 0) {
          hasMore = false;
          break;
        }

        for (const invoice of invoices) {
          const parasutId = `sales_${invoice.id}`;
          const existing = await this.transactionRepository.findOne({
            where: { organizationId, parasutId },
          });

          if (existing) {
            skipped++;
            continue;
          }

          const attrs = invoice.attributes || {};
          await this.transactionRepository.save(
            this.transactionRepository.create({
              organizationId,
              type: TransactionType.INCOME,
              amount: Number(attrs.net_total || attrs.gross_total || 0),
              currency: attrs.currency || 'TRY',
              description: attrs.description || `Sales Invoice #${attrs.invoice_no || invoice.id}`,
              date: attrs.issue_date || new Date().toISOString().split('T')[0],
              paymentMethod: PaymentMethod.OTHER,
              source: TransactionSource.PARASUT,
              parasutId,
              referenceNumber: attrs.invoice_no || null,
              contactName: null,
            }),
          );
          imported++;
        }

        page++;
        // Rate limit: 10 requests per 10 seconds
        await this.sleep(1100);
      } catch (error) {
        this.logger.warn(`Failed to fetch sales page ${page}: ${error}`);
        hasMore = false;
      }
    }

    return { imported, skipped };
  }

  private async syncPurchaseBills(
    client: AxiosInstance,
    integration: ParasutIntegration,
    organizationId: string,
  ): Promise<{ imported: number; skipped: number }> {
    let imported = 0;
    let skipped = 0;
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      try {
        const response = await client.get('/purchase_bills', {
          params: { 'page[number]': page, 'page[size]': 25, 'filter[item_type]': 'purchase_bill' },
        });

        const bills = response.data.data || [];
        if (bills.length === 0) {
          hasMore = false;
          break;
        }

        for (const bill of bills) {
          const parasutId = `purchase_${bill.id}`;
          const existing = await this.transactionRepository.findOne({
            where: { organizationId, parasutId },
          });

          if (existing) {
            skipped++;
            continue;
          }

          const attrs = bill.attributes || {};
          await this.transactionRepository.save(
            this.transactionRepository.create({
              organizationId,
              type: TransactionType.EXPENSE,
              amount: Number(attrs.net_total || attrs.gross_total || 0),
              currency: attrs.currency || 'TRY',
              description: attrs.description || `Purchase Bill #${attrs.invoice_no || bill.id}`,
              date: attrs.issue_date || new Date().toISOString().split('T')[0],
              paymentMethod: PaymentMethod.OTHER,
              source: TransactionSource.PARASUT,
              parasutId,
              referenceNumber: attrs.invoice_no || null,
              contactName: null,
            }),
          );
          imported++;
        }

        page++;
        await this.sleep(1100);
      } catch (error) {
        this.logger.warn(`Failed to fetch purchase bills page ${page}: ${error}`);
        hasMore = false;
      }
    }

    return { imported, skipped };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private toStatusDto(integration: ParasutIntegration): ParasutStatusDto {
    return {
      connected: integration.isActive,
      companyId: integration.companyId,
      syncStatus: integration.syncStatus,
      lastSyncAt: integration.lastSyncAt,
      lastSyncError: integration.lastSyncError ?? undefined,
      username: integration.username ?? undefined,
    };
  }
}
