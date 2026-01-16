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
import { AvailabilityService } from './availability.service';
import {
  CreateAvailabilityDto,
  UpdateAvailabilityDto,
  BulkCreateAvailabilityDto,
} from './dto/availability.dto';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';

@ApiTags('availability')
@Controller('availability')
@UseGuards(ClerkAuthGuard)
@ApiBearerAuth()
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new availability slot' })
  async create(
    @Request() req: any,
    @Body() createDto: CreateAvailabilityDto,
  ) {
    return this.availabilityService.create(req.user.dbUserId, createDto);
  }

  @Post('bulk')
  @ApiOperation({ summary: 'Create multiple availability slots' })
  async createBulk(
    @Request() req: any,
    @Body() bulkDto: BulkCreateAvailabilityDto,
  ) {
    return this.availabilityService.createBulk(req.user.dbUserId, bulkDto.availabilities);
  }

  @Get()
  @ApiOperation({ summary: 'Get all availability slots for current user' })
  async findAll(@Request() req: any) {
    return this.availabilityService.findAllByUser(req.user.dbUserId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific availability slot' })
  async findOne(@Request() req: any, @Param('id') id: string) {
    return this.availabilityService.findOne(id, req.user.dbUserId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an availability slot' })
  async update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() updateDto: UpdateAvailabilityDto,
  ) {
    return this.availabilityService.update(id, req.user.dbUserId, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an availability slot' })
  async remove(@Request() req: any, @Param('id') id: string) {
    return this.availabilityService.remove(id, req.user.dbUserId);
  }

  @Delete()
  @ApiOperation({ summary: 'Delete all availability slots for current user' })
  async removeAll(@Request() req: any) {
    return this.availabilityService.removeAllByUser(req.user.dbUserId);
  }
}
