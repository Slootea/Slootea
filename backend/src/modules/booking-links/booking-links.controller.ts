import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BookingLinksService } from './booking-links.service';
import {
  CreateBookingLinkDto,
  UpdateBookingLinkDto,
} from './dto/booking-link.dto';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';

@ApiTags('booking-links')
@Controller('booking-links')
@UseGuards(ClerkAuthGuard)
@ApiBearerAuth()
export class BookingLinksController {
  constructor(private readonly bookingLinksService: BookingLinksService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new booking link' })
  async create(
    @Request() req: any,
    @Body() createDto: CreateBookingLinkDto,
  ) {
    return this.bookingLinksService.create(req.user.dbUserId, createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all booking links for current user' })
  async findAll(@Request() req: any) {
    return this.bookingLinksService.findAllByUser(req.user.dbUserId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific booking link' })
  async findOne(@Request() req: any, @Param('id') id: string) {
    return this.bookingLinksService.findOne(id, req.user.dbUserId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a booking link' })
  async update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() updateDto: UpdateBookingLinkDto,
  ) {
    return this.bookingLinksService.update(id, req.user.dbUserId, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a booking link' })
  async remove(@Request() req: any, @Param('id') id: string) {
    return this.bookingLinksService.remove(id, req.user.dbUserId);
  }
}
