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
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiHeader } from '@nestjs/swagger';
import { ClientsService } from './clients.service';
import {
  CreateClientDto,
  UpdateClientDto,
  ClientQueryDto,
} from './dto/client.dto';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { OrgRolesGuard } from '../auth/guards/org-roles.guard';
import { OrgMemberOrAdmin } from '../auth/decorators/org-roles.decorator';
import { AppointmentsService } from '../appointments/appointments.service';

@ApiTags('clients')
@Controller('clients')
@UseGuards(ClerkAuthGuard, OrgRolesGuard)
@ApiBearerAuth()
@ApiHeader({ name: 'x-organization-id', required: true, description: 'Organization ID' })
export class ClientsController {
  constructor(
    private readonly clientsService: ClientsService,
    @Inject(forwardRef(() => AppointmentsService))
    private readonly appointmentsService: AppointmentsService,
  ) {}

  @Post()
  @OrgMemberOrAdmin()
  @ApiOperation({ summary: 'Create a new client for the organization' })
  async create(@Request() req: any, @Body() createDto: CreateClientDto) {
    const organizationId = req.organizationId;
    if (!organizationId) {
      throw new BadRequestException('Organization context required');
    }
    return this.clientsService.create(organizationId, createDto);
  }

  @Get()
  @OrgMemberOrAdmin()
  @ApiOperation({ summary: 'Get all clients with pagination and filtering' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, type: String })
  async findAll(@Request() req: any, @Query() query: ClientQueryDto) {
    const organizationId = req.organizationId;
    if (!organizationId) {
      throw new BadRequestException('Organization context required');
    }
    return this.clientsService.findAllByOrganizationPaginated(organizationId, query);
  }

  @Get('stats')
  @OrgMemberOrAdmin()
  @ApiOperation({ summary: 'Get client statistics' })
  async getStats(@Request() req: any) {
    const organizationId = req.organizationId;
    if (!organizationId) {
      throw new BadRequestException('Organization context required');
    }
    return this.clientsService.getClientStats(organizationId);
  }

  @Get(':id')
  @OrgMemberOrAdmin()
  @ApiOperation({ summary: 'Get a specific client' })
  async findOne(@Request() req: any, @Param('id') id: string) {
    const organizationId = req.organizationId;
    if (!organizationId) {
      throw new BadRequestException('Organization context required');
    }
    return this.clientsService.findOne(id, organizationId);
  }

  @Get(':id/appointments')
  @OrgMemberOrAdmin()
  @ApiOperation({ summary: 'Get appointment history for a client' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getClientAppointments(
    @Request() req: any,
    @Param('id') id: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const organizationId = req.organizationId;
    if (!organizationId) {
      throw new BadRequestException('Organization context required');
    }
    // First verify the client belongs to this organization
    const client = await this.clientsService.findOne(id, organizationId);
    
    // Get appointments for this client by phone number - use any user from org for now
    // In a full implementation, you might want to fetch appointments across all org users
    return this.appointmentsService.findAllByOrganizationPaginated(organizationId, {
      search: client.phone,
      page: page || 1,
      limit: limit || 10,
      sortOrder: 'DESC',
    });
  }

  @Put(':id')
  @OrgMemberOrAdmin()
  @ApiOperation({ summary: 'Update a client' })
  async update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() updateDto: UpdateClientDto,
  ) {
    const organizationId = req.organizationId;
    if (!organizationId) {
      throw new BadRequestException('Organization context required');
    }
    return this.clientsService.update(id, organizationId, updateDto);
  }

  @Delete(':id')
  @OrgMemberOrAdmin()
  @ApiOperation({ summary: 'Delete a client' })
  async remove(@Request() req: any, @Param('id') id: string) {
    const organizationId = req.organizationId;
    if (!organizationId) {
      throw new BadRequestException('Organization context required');
    }
    await this.clientsService.remove(id, organizationId);
    return { message: 'Client deleted successfully' };
  }
}
