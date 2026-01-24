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

  // ==================== Organization Booking Links ====================
  // Booking links now belong to organizations only

  /**
   * Create organization booking link (admin only)
   */
  async create(
    organizationId: string,
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
      organizationId,
      expiresAt: createDto.expiresAt ? new Date(createDto.expiresAt) : null,
    });
    return this.bookingLinkRepository.save(bookingLink);
  }

  /**
   * Get all booking links for an organization (visible to all members)
   */
  async findAll(organizationId: string): Promise<BookingLink[]> {
    return this.bookingLinkRepository.find({
      where: { organizationId },
      relations: ['serviceOption'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get a specific organization booking link
   */
  async findOne(id: string, organizationId: string): Promise<BookingLink> {
    const bookingLink = await this.bookingLinkRepository.findOne({
      where: { id, organizationId },
      relations: ['serviceOption'],
    });
    if (!bookingLink) {
      throw new NotFoundException('Booking link not found in this organization');
    }
    return bookingLink;
  }

  /**
   * Find booking link by slug (for public booking page)
   */
  async findBySlug(slug: string): Promise<BookingLink> {
    const bookingLink = await this.bookingLinkRepository.findOne({
      where: { slug },
      relations: ['serviceOption'],
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

  /**
   * Update organization booking link (admin only)
   */
  async update(
    id: string,
    organizationId: string,
    updateDto: UpdateBookingLinkDto,
  ): Promise<BookingLink> {
    const bookingLink = await this.findOne(id, organizationId);
    Object.assign(bookingLink, {
      ...updateDto,
      expiresAt: updateDto.expiresAt ? new Date(updateDto.expiresAt) : bookingLink.expiresAt,
    });
    return this.bookingLinkRepository.save(bookingLink);
  }

  /**
   * Remove organization booking link (admin only)
   */
  async remove(id: string, organizationId: string): Promise<void> {
    const bookingLink = await this.findOne(id, organizationId);
    await this.bookingLinkRepository.remove(bookingLink);
  }
}
