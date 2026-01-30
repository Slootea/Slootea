import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { BlockedTime } from './entities/blocked-time.entity';
import {
  CreateBlockedTimeDto,
  UpdateBlockedTimeDto,
} from './dto/blocked-time.dto';
import { UsersService } from '../users/users.service';

@Injectable()
export class BlockedTimesService {
  constructor(
    @InjectRepository(BlockedTime)
    private readonly blockedTimeRepository: Repository<BlockedTime>,
    private readonly usersService: UsersService,
  ) {}

  /**
   * Resolve a user ID that could be either a Clerk ID or a database UUID
   */
  private async resolveUserId(userIdOrClerkId: string): Promise<string> {
    // Check if it's a Clerk ID (starts with 'user_')
    if (userIdOrClerkId.startsWith('user_')) {
      const user = await this.usersService.findByClerkId(userIdOrClerkId);
      if (!user) {
        throw new NotFoundException(`User with Clerk ID ${userIdOrClerkId} not found`);
      }
      return user.id;
    }
    // Assume it's already a database UUID
    return userIdOrClerkId;
  }

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

  /**
   * Admin creates blocked time for a specific member
   */
  async createForMember(
    userIdOrClerkId: string,
    createDto: CreateBlockedTimeDto,
  ): Promise<BlockedTime> {
    const userId = await this.resolveUserId(userIdOrClerkId);
    const blockedTime = this.blockedTimeRepository.create({
      ...createDto,
      userId,
    });
    return this.blockedTimeRepository.save(blockedTime);
  }

  async findAllByUser(userIdOrClerkId: string): Promise<BlockedTime[]> {
    const userId = await this.resolveUserId(userIdOrClerkId);
    return this.blockedTimeRepository.find({
      where: { userId },
      order: { date: 'ASC', startTime: 'ASC' },
    });
  }

  async findByUserAndDateRange(
    userIdOrClerkId: string,
    startDate: string,
    endDate: string,
  ): Promise<BlockedTime[]> {
    const userId = await this.resolveUserId(userIdOrClerkId);
    return this.blockedTimeRepository.find({
      where: {
        userId,
        date: Between(startDate, endDate),
      },
      order: { date: 'ASC', startTime: 'ASC' },
    });
  }

  async findByUserAndDate(userIdOrClerkId: string, date: string): Promise<BlockedTime[]> {
    const userId = await this.resolveUserId(userIdOrClerkId);
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

  // Admin method - find and remove any blocked time without user check
  async removeAsAdmin(id: string): Promise<void> {
    const blockedTime = await this.blockedTimeRepository.findOne({
      where: { id },
    });
    if (!blockedTime) {
      throw new NotFoundException('Blocked time not found');
    }
    await this.blockedTimeRepository.remove(blockedTime);
  }
}
