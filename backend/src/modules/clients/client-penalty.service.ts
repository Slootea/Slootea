import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { ClientPenalty, PenaltyType, PenaltyStatus } from './entities/client-penalty.entity';
import { CreatePenaltyDto, RemovePenaltyDto } from './dto/client-penalty.dto';
import { ClientsService } from './clients.service';

@Injectable()
export class ClientPenaltyService {
  constructor(
    @InjectRepository(ClientPenalty)
    private readonly penaltyRepository: Repository<ClientPenalty>,
    private readonly clientsService: ClientsService,
  ) {}

  async create(
    organizationId: string,
    dto: CreatePenaltyDto,
    issuedBy: string,
  ): Promise<ClientPenalty> {
    // Verify client exists and belongs to organization
    const client = await this.clientsService.findOne(dto.clientId, organizationId);
    if (!client) {
      throw new NotFoundException('Client not found');
    }

    // Check if client already has an active penalty
    const existingPenalty = await this.getActivePenalty(dto.clientId, organizationId);
    if (existingPenalty) {
      throw new BadRequestException('Client already has an active penalty. Remove it first before adding a new one.');
    }

    // For bans, expiresAt should be null (permanent)
    // For suspensions, expiresAt is required
    if (dto.type === PenaltyType.SUSPENSION && !dto.expiresAt) {
      throw new BadRequestException('Suspension requires an expiration date');
    }

    const penalty = this.penaltyRepository.create({
      clientId: dto.clientId,
      organizationId,
      type: dto.type,
      reason: dto.reason,
      expiresAt: dto.type === PenaltyType.BAN ? null : new Date(dto.expiresAt!),
      issuedBy,
      status: PenaltyStatus.ACTIVE,
    });

    return this.penaltyRepository.save(penalty);
  }

  async remove(
    penaltyId: string,
    organizationId: string,
    dto: RemovePenaltyDto,
    removedBy: string,
  ): Promise<ClientPenalty> {
    const penalty = await this.penaltyRepository.findOne({
      where: { id: penaltyId, organizationId },
    });

    if (!penalty) {
      throw new NotFoundException('Penalty not found');
    }

    if (penalty.status !== PenaltyStatus.ACTIVE) {
      throw new BadRequestException('Penalty is not active');
    }

    penalty.status = PenaltyStatus.REMOVED;
    penalty.removedBy = removedBy;
    penalty.removedAt = new Date();
    penalty.removalReason = dto.removalReason || null;

    return this.penaltyRepository.save(penalty);
  }

  async getActivePenalty(
    clientId: string,
    organizationId: string,
  ): Promise<ClientPenalty | null> {
    // First, update any expired suspensions
    await this.updateExpiredPenalties(organizationId);

    return this.penaltyRepository.findOne({
      where: {
        clientId,
        organizationId,
        status: PenaltyStatus.ACTIVE,
      },
      relations: ['client'],
    });
  }

  async checkClientCanBook(
    clientId: string,
    organizationId: string,
  ): Promise<{ canBook: boolean; reason?: string; penalty?: ClientPenalty }> {
    const penalty = await this.getActivePenalty(clientId, organizationId);

    if (!penalty) {
      return { canBook: true };
    }

    if (penalty.type === PenaltyType.BAN) {
      return {
        canBook: false,
        reason: 'You have been banned from booking appointments. Please contact support.',
        penalty,
      };
    }

    if (penalty.type === PenaltyType.SUSPENSION && penalty.expiresAt) {
      const now = new Date();
      if (penalty.expiresAt > now) {
        return {
          canBook: false,
          reason: `You are suspended until ${penalty.expiresAt.toLocaleDateString()}. Please try again after this date.`,
          penalty,
        };
      }
    }

    return { canBook: true };
  }

  async checkClientCanBookByPhone(
    phone: string,
    organizationId: string,
  ): Promise<{ canBook: boolean; reason?: string; penalty?: ClientPenalty }> {
    const client = await this.clientsService.findByPhone(phone, organizationId);
    
    if (!client) {
      // New client, no penalty
      return { canBook: true };
    }

    return this.checkClientCanBook(client.id, organizationId);
  }

  async findAllByOrganization(organizationId: string): Promise<ClientPenalty[]> {
    // Update expired penalties first
    await this.updateExpiredPenalties(organizationId);

    return this.penaltyRepository.find({
      where: { organizationId },
      relations: ['client'],
      order: { createdAt: 'DESC' },
    });
  }

  async findActiveByOrganization(organizationId: string): Promise<ClientPenalty[]> {
    // Update expired penalties first
    await this.updateExpiredPenalties(organizationId);

    return this.penaltyRepository.find({
      where: { organizationId, status: PenaltyStatus.ACTIVE },
      relations: ['client'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByClient(
    clientId: string,
    organizationId: string,
  ): Promise<ClientPenalty[]> {
    await this.updateExpiredPenalties(organizationId);

    return this.penaltyRepository.find({
      where: { clientId, organizationId },
      order: { createdAt: 'DESC' },
    });
  }

  private async updateExpiredPenalties(organizationId: string): Promise<void> {
    const now = new Date();
    
    await this.penaltyRepository
      .createQueryBuilder()
      .update(ClientPenalty)
      .set({ status: PenaltyStatus.EXPIRED })
      .where('organizationId = :organizationId', { organizationId })
      .andWhere('status = :status', { status: PenaltyStatus.ACTIVE })
      .andWhere('type = :type', { type: PenaltyType.SUSPENSION })
      .andWhere('expiresAt IS NOT NULL')
      .andWhere('expiresAt <= :now', { now })
      .execute();
  }
}
