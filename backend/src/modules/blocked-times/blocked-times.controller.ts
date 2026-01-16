import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BlockedTimesService } from './blocked-times.service';
import {
  CreateBlockedTimeDto,
  UpdateBlockedTimeDto,
} from './dto/blocked-time.dto';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';

@ApiTags('blocked-times')
@Controller('blocked-times')
@UseGuards(ClerkAuthGuard)
@ApiBearerAuth()
export class BlockedTimesController {
  constructor(private readonly blockedTimesService: BlockedTimesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new blocked time' })
  async create(
    @Request() req: any,
    @Body() createDto: CreateBlockedTimeDto,
  ) {
    return this.blockedTimesService.create(req.user.dbUserId, createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all blocked times for current user' })
  async findAll(
    @Request() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    if (startDate && endDate) {
      return this.blockedTimesService.findByUserAndDateRange(
        req.user.dbUserId,
        startDate,
        endDate,
      );
    }
    return this.blockedTimesService.findAllByUser(req.user.dbUserId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific blocked time' })
  async findOne(@Request() req: any, @Param('id') id: string) {
    return this.blockedTimesService.findOne(id, req.user.dbUserId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a blocked time' })
  async update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() updateDto: UpdateBlockedTimeDto,
  ) {
    return this.blockedTimesService.update(id, req.user.dbUserId, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a blocked time' })
  async remove(@Request() req: any, @Param('id') id: string) {
    return this.blockedTimesService.remove(id, req.user.dbUserId);
  }
}
