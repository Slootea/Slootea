import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BookingLink, BookingLinkType } from './entities/booking-link.entity';
import {
  CreateBookingLinkDto,
  UpdateBookingLinkDto,
} from './dto/booking-link.dto';
import { customAlphabet } from 'nanoid';

const generateSlug = customAlphabet(
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
  10,
);

@Injectable()
export class BookingLinksService {
  constructor(
    @InjectRepository(BookingLink)
    private readonly bookingLinkRepository: Repository<BookingLink>,
  ) {}

  async create(
    userId: string,
    createDto: CreateBookingLinkDto,
  ): Promise<BookingLink> {
    if (
      createDto.type === BookingLinkType.SPECIFIC_OPTION &&
      !createDto.serviceOptionId
    ) {
      throw new BadRequestException(
        'Service option ID is required for specific option links',
      );
    }

    const slug = generateSlug();
    const bookingLink = this.bookingLinkRepository.create({
      ...createDto,
      slug,
      userId,
      expiresAt: createDto.expiresAt ? new Date(createDto.expiresAt) : null,
    });
    return this.bookingLinkRepository.save(bookingLink);
  }

  async findAllByUser(userId: string): Promise<BookingLink[]> {
    return this.bookingLinkRepository.find({
      where: { userId },
      relations: ['serviceOption'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, userId: string): Promise<BookingLink> {
    const bookingLink = await this.bookingLinkRepository.findOne({
      where: { id, userId },
      relations: ['serviceOption'],
    });
    if (!bookingLink) {
      throw new NotFoundException('Booking link not found');
    }
    return bookingLink;
  }

  async findBySlug(slug: string): Promise<BookingLink> {
    const bookingLink = await this.bookingLinkRepository.findOne({
      where: { slug },
      relations: ['user', 'serviceOption', 'user.settings'],
    });
    if (!bookingLink) {
      throw new NotFoundException('Booking link not found');
    }
    if (!bookingLink.isActive) {
      throw new BadRequestException('This booking link is not active');
    }
    if (bookingLink.expiresAt && new Date() > bookingLink.expiresAt) {
      throw new BadRequestException('This booking link has expired');
    }
    return bookingLink;
  }

  async update(
    id: string,
    userId: string,
    updateDto: UpdateBookingLinkDto,
  ): Promise<BookingLink> {
    const bookingLink = await this.findOne(id, userId);
    Object.assign(bookingLink, {
      ...updateDto,
      expiresAt: updateDto.expiresAt ? new Date(updateDto.expiresAt) : bookingLink.expiresAt,
    });
    return this.bookingLinkRepository.save(bookingLink);
  }

  async remove(id: string, userId: string): Promise<void> {
    const bookingLink = await this.findOne(id, userId);
    await this.bookingLinkRepository.remove(bookingLink);
  }
}
