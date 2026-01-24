import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Client } from './entities/client.entity';
import {
  CreateClientDto,
  UpdateClientDto,
  ClientQueryDto,
  PaginatedResult,
} from './dto/client.dto';

@Injectable()
export class ClientsService {
  constructor(
    @InjectRepository(Client)
    private readonly clientRepository: Repository<Client>,
  ) {}

  async create(organizationId: string, createDto: CreateClientDto): Promise<Client> {
    // Check if client with same phone already exists for this organization
    const existingClient = await this.clientRepository.findOne({
      where: { organizationId, phone: createDto.phone },
    });

    if (existingClient) {
      throw new ConflictException('A client with this phone number already exists');
    }

    const client = this.clientRepository.create({
      ...createDto,
      organizationId,
    });

    return this.clientRepository.save(client);
  }

  async findOrCreate(
    organizationId: string,
    phone: string,
    name: string,
    email?: string,
  ): Promise<Client> {
    // Try to find existing client by phone
    let client = await this.clientRepository.findOne({
      where: { organizationId, phone },
    });

    if (!client) {
      // Create new client
      client = this.clientRepository.create({
        organizationId,
        phone,
        name,
        email,
        totalAppointments: 0,
        completedAppointments: 0,
        cancelledAppointments: 0,
        noShowAppointments: 0,
      });
      client = await this.clientRepository.save(client);
    } else {
      // Update name/email if provided and different
      let needsUpdate = false;
      if (name && client.name !== name) {
        client.name = name;
        needsUpdate = true;
      }
      if (email && client.email !== email) {
        client.email = email;
        needsUpdate = true;
      }
      if (needsUpdate) {
        client = await this.clientRepository.save(client);
      }
    }

    return client;
  }

  async incrementAppointmentCount(
    clientId: string,
    organizationId: string,
  ): Promise<void> {
    await this.clientRepository.increment(
      { id: clientId, organizationId },
      'totalAppointments',
      1,
    );
    await this.clientRepository.update(
      { id: clientId, organizationId },
      { lastAppointmentAt: new Date() },
    );
  }

  async updateAppointmentStats(
    clientId: string,
    organizationId: string,
    status: 'completed' | 'cancelled' | 'no_show',
  ): Promise<void> {
    const field =
      status === 'completed'
        ? 'completedAppointments'
        : status === 'cancelled'
        ? 'cancelledAppointments'
        : 'noShowAppointments';

    await this.clientRepository.increment({ id: clientId, organizationId }, field, 1);
  }

  async findAllByOrganization(organizationId: string): Promise<Client[]> {
    return this.clientRepository.find({
      where: { organizationId },
      order: { createdAt: 'DESC' },
    });
  }

  async findAllByOrganizationPaginated(
    organizationId: string,
    query: ClientQueryDto,
  ): Promise<PaginatedResult<Client>> {
    const {
      page = 1,
      limit = 10,
      search,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = query;

    const queryBuilder = this.clientRepository
      .createQueryBuilder('client')
      .where('client.organizationId = :organizationId', { organizationId });

    // Search by name, email, or phone
    if (search) {
      queryBuilder.andWhere(
        '(LOWER(client.name) LIKE LOWER(:search) OR LOWER(client.email) LIKE LOWER(:search) OR client.phone LIKE :search)',
        { search: `%${search}%` },
      );
    }

    // Sorting
    const validSortFields = [
      'name',
      'email',
      'phone',
      'totalAppointments',
      'lastAppointmentAt',
      'createdAt',
    ];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    queryBuilder.orderBy(`client.${sortField}`, sortOrder);

    // Get total count
    const total = await queryBuilder.getCount();

    // Pagination
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const data = await queryBuilder.getMany();

    const totalPages = Math.ceil(total / limit);

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

  async findOne(id: string, organizationId: string): Promise<Client> {
    const client = await this.clientRepository.findOne({
      where: { id, organizationId },
    });

    if (!client) {
      throw new NotFoundException('Client not found');
    }

    return client;
  }

  async findByPhone(phone: string, organizationId: string): Promise<Client | null> {
    return this.clientRepository.findOne({
      where: { phone, organizationId },
    });
  }

  async update(
    id: string,
    organizationId: string,
    updateDto: UpdateClientDto,
  ): Promise<Client> {
    const client = await this.findOne(id, organizationId);
    Object.assign(client, updateDto);
    return this.clientRepository.save(client);
  }

  async remove(id: string, organizationId: string): Promise<void> {
    const client = await this.findOne(id, organizationId);
    await this.clientRepository.remove(client);
  }

  async getClientStats(organizationId: string): Promise<{
    totalClients: number;
    newClientsThisMonth: number;
    repeatClients: number;
  }> {
    const totalClients = await this.clientRepository.count({
      where: { organizationId },
    });

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const newClientsThisMonth = await this.clientRepository
      .createQueryBuilder('client')
      .where('client.organizationId = :organizationId', { organizationId })
      .andWhere('client.createdAt >= :startOfMonth', { startOfMonth })
      .getCount();

    const repeatClients = await this.clientRepository
      .createQueryBuilder('client')
      .where('client.organizationId = :organizationId', { organizationId })
      .andWhere('client.totalAppointments > 1')
      .getCount();

    return {
      totalClients,
      newClientsThisMonth,
      repeatClients,
    };
  }
}
