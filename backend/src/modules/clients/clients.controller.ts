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
  Inject,
  forwardRef,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ClientsService } from './clients.service';
import {
  CreateClientDto,
  UpdateClientDto,
  ClientQueryDto,
} from './dto/client.dto';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { AppointmentsService } from '../appointments/appointments.service';

@ApiTags('clients')
@Controller('clients')
@UseGuards(ClerkAuthGuard)
@ApiBearerAuth()
export class ClientsController {
  constructor(
    private readonly clientsService: ClientsService,
    @Inject(forwardRef(() => AppointmentsService))
    private readonly appointmentsService: AppointmentsService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new client' })
  async create(@Request() req: any, @Body() createDto: CreateClientDto) {
    return this.clientsService.create(req.user.dbUserId, createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all clients with pagination and filtering' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, type: String })
  async findAll(@Request() req: any, @Query() query: ClientQueryDto) {
    return this.clientsService.findAllByUserPaginated(req.user.dbUserId, query);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get client statistics' })
  async getStats(@Request() req: any) {
    return this.clientsService.getClientStats(req.user.dbUserId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific client' })
  async findOne(@Request() req: any, @Param('id') id: string) {
    return this.clientsService.findOne(id, req.user.dbUserId);
  }

  @Get(':id/appointments')
  @ApiOperation({ summary: 'Get appointment history for a client' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getClientAppointments(
    @Request() req: any,
    @Param('id') id: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    // First verify the client belongs to this user
    const client = await this.clientsService.findOne(id, req.user.dbUserId);
    
    // Get appointments for this client by phone number
    return this.appointmentsService.findAllByUserPaginated(req.user.dbUserId, {
      search: client.phone,
      page: page || 1,
      limit: limit || 10,
      sortOrder: 'DESC',
    });
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a client' })
  async update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() updateDto: UpdateClientDto,
  ) {
    return this.clientsService.update(id, req.user.dbUserId, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a client' })
  async remove(@Request() req: any, @Param('id') id: string) {
    await this.clientsService.remove(id, req.user.dbUserId);
    return { message: 'Client deleted successfully' };
  }
}
