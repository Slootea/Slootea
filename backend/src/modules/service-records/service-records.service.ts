import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { ServiceRecord } from './entities/service-record.entity';
import { Client } from '../clients/entities/client.entity';
import { ServiceOption } from '../service-options/entities/service-option.entity';
import {
  CreateServiceRecordDto,
  UpdateServiceRecordDto,
  ServiceRecordQueryDto,
  SyncServiceRecordsDto,
  PaginatedResult,
} from './dto/service-record.dto';

@Injectable()
export class ServiceRecordsService {
  constructor(
    @InjectRepository(ServiceRecord)
    private readonly recordRepo: Repository<ServiceRecord>,
    @InjectRepository(Client)
    private readonly clientRepo: Repository<Client>,
    @InjectRepository(ServiceOption)
    private readonly serviceOptionRepo: Repository<ServiceOption>,
    private readonly dataSource: DataSource,
  ) {}

  // ---- helpers ----

  private async assertClient(clientId: string, organizationId: string): Promise<void> {
    const client = await this.clientRepo.findOne({
      where: { id: clientId, organizationId },
    });
    if (!client) {
      throw new NotFoundException('Client not found in this organization');
    }
  }

  private async assertServiceOption(
    serviceOptionId: string,
    organizationId: string,
  ): Promise<void> {
    const opt = await this.serviceOptionRepo.findOne({
      where: { id: serviceOptionId },
    });
    if (!opt) {
      throw new NotFoundException('Service option not found');
    }
    // Allow if it belongs to this organization, or it is a personal/global option
    // (no organizationId set). Reject if it explicitly belongs to another org.
    if (opt.organizationId && opt.organizationId !== organizationId) {
      throw new BadRequestException('Service option does not belong to this organization');
    }
  }

  // ---- CRUD ----

  async create(
    organizationId: string,
    createdByUserId: string | undefined,
    dto: CreateServiceRecordDto,
  ): Promise<ServiceRecord> {
    await this.assertClient(dto.clientId, organizationId);
    await this.assertServiceOption(dto.serviceOptionId, organizationId);

    const record = this.recordRepo.create({
      organizationId,
      clientId: dto.clientId,
      serviceOptionId: dto.serviceOptionId,
      serviceDate: dto.serviceDate,
      note: dto.note,
      createdByUserId,
    });
    const saved = await this.recordRepo.save(record);
    return this.findOne(saved.id, organizationId);
  }

  async findAll(
    organizationId: string,
    query: ServiceRecordQueryDto,
  ): Promise<PaginatedResult<ServiceRecord>> {
    const {
      page = 1,
      limit = 50,
      clientId,
      from,
      to,
      sortBy = 'serviceDate',
      sortOrder = 'DESC',
    } = query;

    const qb = this.recordRepo
      .createQueryBuilder('rec')
      .leftJoinAndSelect('rec.serviceOption', 'serviceOption')
      .leftJoinAndSelect('rec.client', 'client')
      .where('rec.organizationId = :organizationId', { organizationId });

    if (clientId) qb.andWhere('rec.clientId = :clientId', { clientId });
    if (from) qb.andWhere('rec.serviceDate >= :from', { from });
    if (to) qb.andWhere('rec.serviceDate <= :to', { to });

    const validSorts = ['serviceDate', 'createdAt', 'updatedAt'];
    const sortField = validSorts.includes(sortBy) ? sortBy : 'serviceDate';
    qb.orderBy(`rec.${sortField}`, sortOrder).addOrderBy('rec.createdAt', 'DESC');

    const total = await qb.getCount();
    qb.skip((page - 1) * limit).take(limit);
    const data = await qb.getMany();

    const totalPages = Math.ceil(total / limit) || 1;
    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  async findAllForClient(
    organizationId: string,
    clientId: string,
  ): Promise<ServiceRecord[]> {
    await this.assertClient(clientId, organizationId);
    return this.recordRepo.find({
      where: { organizationId, clientId },
      relations: ['serviceOption'],
      order: { serviceDate: 'DESC', createdAt: 'DESC' },
    });
  }

  async findOne(id: string, organizationId: string): Promise<ServiceRecord> {
    const record = await this.recordRepo.findOne({
      where: { id, organizationId },
      relations: ['serviceOption', 'client'],
    });
    if (!record) throw new NotFoundException('Service record not found');
    return record;
  }

  async update(
    id: string,
    organizationId: string,
    dto: UpdateServiceRecordDto,
  ): Promise<ServiceRecord> {
    const record = await this.findOne(id, organizationId);

    if (dto.serviceOptionId && dto.serviceOptionId !== record.serviceOptionId) {
      await this.assertServiceOption(dto.serviceOptionId, organizationId);
      record.serviceOptionId = dto.serviceOptionId;
    }
    if (dto.serviceDate !== undefined) record.serviceDate = dto.serviceDate;
    if (dto.note !== undefined) record.note = dto.note;

    await this.recordRepo.save(record);
    return this.findOne(id, organizationId);
  }

  async remove(id: string, organizationId: string): Promise<void> {
    const record = await this.findOne(id, organizationId);
    await this.recordRepo.remove(record);
  }

  // ---- Bulk transactional sync ----

  async sync(
    organizationId: string,
    createdByUserId: string | undefined,
    dto: SyncServiceRecordsDto,
  ): Promise<ServiceRecord[]> {
    const { clientId, create = [], update = [], deleteIds = [] } = dto;

    await this.assertClient(clientId, organizationId);

    // Pre-validate all referenced service options
    const optionIds = new Set<string>();
    for (const c of create) optionIds.add(c.serviceOptionId);
    for (const u of update) if (u.serviceOptionId) optionIds.add(u.serviceOptionId);
    if (optionIds.size > 0) {
      const opts = await this.serviceOptionRepo.findBy({ id: In([...optionIds]) });
      const byId = new Map(opts.map(o => [o.id, o]));
      for (const id of optionIds) {
        const opt = byId.get(id);
        if (!opt) throw new NotFoundException(`Service option ${id} not found`);
        if (opt.organizationId && opt.organizationId !== organizationId) {
          throw new BadRequestException(
            `Service option ${id} does not belong to this organization`,
          );
        }
      }
    }

    await this.dataSource.transaction(async manager => {
      const repo = manager.getRepository(ServiceRecord);

      // Deletes — must belong to org + client
      if (deleteIds.length > 0) {
        const existing = await repo.find({
          where: { id: In(deleteIds), organizationId, clientId },
        });
        if (existing.length !== deleteIds.length) {
          throw new BadRequestException(
            'One or more records to delete were not found in this client',
          );
        }
        await repo.remove(existing);
      }

      // Updates — must belong to org + client
      if (update.length > 0) {
        const ids = update.map(u => u.id);
        const existing = await repo.find({
          where: { id: In(ids), organizationId, clientId },
        });
        if (existing.length !== ids.length) {
          throw new BadRequestException(
            'One or more records to update were not found in this client',
          );
        }
        const byId = new Map(existing.map(r => [r.id, r]));
        for (const u of update) {
          const r = byId.get(u.id)!;
          if (u.serviceOptionId !== undefined) r.serviceOptionId = u.serviceOptionId;
          if (u.serviceDate !== undefined) r.serviceDate = u.serviceDate;
          if (u.note !== undefined) r.note = u.note;
        }
        await repo.save(existing);
      }

      // Creates
      if (create.length > 0) {
        const newRecords = create.map(c =>
          repo.create({
            organizationId,
            clientId,
            serviceOptionId: c.serviceOptionId,
            serviceDate: c.serviceDate,
            note: c.note,
            createdByUserId,
          }),
        );
        await repo.save(newRecords);
      }
    });

    return this.findAllForClient(organizationId, clientId);
  }
}
