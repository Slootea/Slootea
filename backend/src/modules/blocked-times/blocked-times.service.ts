import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { BlockedTime } from './entities/blocked-time.entity';
import {
  CreateBlockedTimeDto,
  UpdateBlockedTimeDto,
} from './dto/blocked-time.dto';

@Injectable()
export class BlockedTimesService {
  constructor(
    @InjectRepository(BlockedTime)
    private readonly blockedTimeRepository: Repository<BlockedTime>,
  ) {}

  async create(
    userId: string,
    createDto: CreateBlockedTimeDto,
  ): Promise<BlockedTime> {
    const blockedTime = this.blockedTimeRepository.create({
      ...createDto,
      userId,
    });
    return this.blockedTimeRepository.save(blockedTime);
  }

  async findAllByUser(userId: string): Promise<BlockedTime[]> {
    return this.blockedTimeRepository.find({
      where: { userId },
      order: { date: 'ASC', startTime: 'ASC' },
    });
  }

  async findByUserAndDateRange(
    userId: string,
    startDate: string,
    endDate: string,
  ): Promise<BlockedTime[]> {
    return this.blockedTimeRepository.find({
      where: {
        userId,
        date: Between(startDate, endDate),
      },
      order: { date: 'ASC', startTime: 'ASC' },
    });
  }

  async findByUserAndDate(userId: string, date: string): Promise<BlockedTime[]> {
    return this.blockedTimeRepository.find({
      where: { userId, date },
      order: { startTime: 'ASC' },
    });
  }

  async findOne(id: string, userId: string): Promise<BlockedTime> {
    const blockedTime = await this.blockedTimeRepository.findOne({
      where: { id, userId },
    });
    if (!blockedTime) {
      throw new NotFoundException('Blocked time not found');
    }
    return blockedTime;
  }

  async update(
    id: string,
    userId: string,
    updateDto: UpdateBlockedTimeDto,
  ): Promise<BlockedTime> {
    const blockedTime = await this.findOne(id, userId);
    Object.assign(blockedTime, updateDto);
    return this.blockedTimeRepository.save(blockedTime);
  }

  async remove(id: string, userId: string): Promise<void> {
    const blockedTime = await this.findOne(id, userId);
    await this.blockedTimeRepository.remove(blockedTime);
  }
}
