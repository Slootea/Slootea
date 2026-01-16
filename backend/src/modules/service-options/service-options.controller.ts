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
import { ServiceOptionsService } from './service-options.service';
import {
  CreateServiceOptionDto,
  UpdateServiceOptionDto,
} from './dto/service-option.dto';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';

@ApiTags('service-options')
@Controller('service-options')
@UseGuards(ClerkAuthGuard)
@ApiBearerAuth()
export class ServiceOptionsController {
  constructor(private readonly serviceOptionsService: ServiceOptionsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new service option' })
  async create(
    @Request() req: any,
    @Body() createDto: CreateServiceOptionDto,
  ) {
    return this.serviceOptionsService.create(req.user.dbUserId, createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all service options for current user' })
  async findAll(@Request() req: any) {
    return this.serviceOptionsService.findAllByUser(req.user.dbUserId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific service option' })
  async findOne(@Request() req: any, @Param('id') id: string) {
    return this.serviceOptionsService.findOne(id, req.user.dbUserId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a service option' })
  async update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() updateDto: UpdateServiceOptionDto,
  ) {
    return this.serviceOptionsService.update(id, req.user.dbUserId, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a service option' })
  async remove(@Request() req: any, @Param('id') id: string) {
    return this.serviceOptionsService.remove(id, req.user.dbUserId);
  }
}
