import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const user = this.userRepository.create(createUserDto);
    return this.userRepository.save(user);
  }

  async findByClerkId(clerkId: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { clerkId } });
  }

  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async findOrCreate(createUserDto: CreateUserDto): Promise<User> {
    let user = await this.findByClerkId(createUserDto.clerkId);
    if (!user) {
      user = await this.create(createUserDto);
    }
    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findById(id);
    Object.assign(user, updateUserDto);
    return this.userRepository.save(user);
  }

  async updateByClerkId(clerkId: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findByClerkId(clerkId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    Object.assign(user, updateUserDto);
    return this.userRepository.save(user);
  }

  async upsertFromClerk(
    clerkId: string,
    email: string,
    fullName: string,
    imageUrl?: string,
    organizationId?: string,
    organizationRole?: string,
  ): Promise<User> {
    let user = await this.findByClerkId(clerkId);
    
    if (!user) {
      user = this.userRepository.create({
        clerkId,
        email,
        businessName: fullName,
        organizationId,
        organizationRole,
      });
    } else {
      user.email = email;
      if (fullName) user.businessName = fullName;
      // Update organization info if provided
      if (organizationId !== undefined) {
        user.organizationId = organizationId;
      }
      if (organizationRole !== undefined) {
        user.organizationRole = organizationRole;
      }
    }
    
    return this.userRepository.save(user);
  }

  async findByOrganization(organizationId: string): Promise<User[]> {
    return this.userRepository.find({
      where: { organizationId },
    });
  }
}
