import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ServiceOption } from './entities/service-option.entity';
import {
  CreateServiceOptionDto,
  UpdateServiceOptionDto,
} from './dto/service-option.dto';

@Injectable()
export class ServiceOptionsService {
  constructor(
    @InjectRepository(ServiceOption)
    private readonly serviceOptionRepository: Repository<ServiceOption>,
  ) {}

  async create(
    userId: string,
    createDto: CreateServiceOptionDto,
  ): Promise<ServiceOption> {
    const serviceOption = this.serviceOptionRepository.create({
      ...createDto,
      userId: createDto.organizationId ? undefined : userId, // Personal service if no org
    });
    return this.serviceOptionRepository.save(serviceOption);
  }

  /**
   * Create organization-level service (admin only)
   */
  async createForOrganization(
    organizationId: string,
    createDto: CreateServiceOptionDto,
  ): Promise<ServiceOption> {
    const serviceOption = this.serviceOptionRepository.create({
      ...createDto,
      organizationId,
      userId: undefined, // Org-level service has no specific user
    });
    return this.serviceOptionRepository.save(serviceOption);
  }

  async findAllByUser(userId: string): Promise<ServiceOption[]> {
    return this.serviceOptionRepository.find({
      where: { userId },
      order: { sortOrder: 'ASC', createdAt: 'DESC' },
    });
  }

  /**
   * Find all services for an organization
   */
  async findAllByOrganization(organizationId: string): Promise<ServiceOption[]> {
    return this.serviceOptionRepository.find({
      where: { organizationId },
      order: { sortOrder: 'ASC', createdAt: 'DESC' },
    });
  }

  /**
   * Find active services for an organization
   */
  async findActiveByOrganization(organizationId: string): Promise<ServiceOption[]> {
    return this.serviceOptionRepository.find({
      where: { organizationId, isActive: true },
      order: { sortOrder: 'ASC', createdAt: 'DESC' },
    });
  }

  async findActiveByUser(userId: string): Promise<ServiceOption[]> {
    return this.serviceOptionRepository.find({
      where: { userId, isActive: true },
      order: { sortOrder: 'ASC', createdAt: 'DESC' },
    });
  }

  async findOne(id: string, userId: string): Promise<ServiceOption> {
    const serviceOption = await this.serviceOptionRepository.findOne({
      where: { id, userId },
    });
    if (!serviceOption) {
      throw new NotFoundException('Service option not found');
    }
    return serviceOption;
  }

  /**
   * Find a service by ID in an organization
   */
  async findOneInOrganization(id: string, organizationId: string): Promise<ServiceOption> {
    const serviceOption = await this.serviceOptionRepository.findOne({
      where: { id, organizationId },
    });
    if (!serviceOption) {
      throw new NotFoundException('Service option not found in this organization');
    }
    return serviceOption;
  }

  async findById(id: string): Promise<ServiceOption> {
    const serviceOption = await this.serviceOptionRepository.findOne({
      where: { id },
      relations: ['user'],
    });
    if (!serviceOption) {
      throw new NotFoundException('Service option not found');
    }
    return serviceOption;
  }

  async update(
    id: string,
    userId: string,
    updateDto: UpdateServiceOptionDto,
  ): Promise<ServiceOption> {
    const serviceOption = await this.findOne(id, userId);
    Object.assign(serviceOption, updateDto);
    return this.serviceOptionRepository.save(serviceOption);
  }

  /**
   * Update organization-level service (admin only)
   */
  async updateInOrganization(
    id: string,
    organizationId: string,
    updateDto: UpdateServiceOptionDto,
  ): Promise<ServiceOption> {
    const serviceOption = await this.findOneInOrganization(id, organizationId);
    Object.assign(serviceOption, updateDto);
    return this.serviceOptionRepository.save(serviceOption);
  }

  async remove(id: string, userId: string): Promise<void> {
    const serviceOption = await this.findOne(id, userId);
    await this.serviceOptionRepository.remove(serviceOption);
  }

  /**
   * Remove organization-level service (admin only)
   */
  async removeFromOrganization(id: string, organizationId: string): Promise<void> {
    const serviceOption = await this.findOneInOrganization(id, organizationId);
    await this.serviceOptionRepository.remove(serviceOption);
  }
}
