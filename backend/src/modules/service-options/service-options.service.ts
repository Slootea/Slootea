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
      userId,
    });
    return this.serviceOptionRepository.save(serviceOption);
  }

  async findAllByUser(userId: string): Promise<ServiceOption[]> {
    return this.serviceOptionRepository.find({
      where: { userId },
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

  async remove(id: string, userId: string): Promise<void> {
    const serviceOption = await this.findOne(id, userId);
    await this.serviceOptionRepository.remove(serviceOption);
  }
}
