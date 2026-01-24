import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { ClientPenaltyService } from './client-penalty.service';
import { CreatePenaltyDto, RemovePenaltyDto } from './dto/client-penalty.dto';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { OrgRolesGuard } from '../auth/guards/org-roles.guard';
import { OrgMemberOrAdmin } from '../auth/decorators/org-roles.decorator';

@ApiTags('client-penalties')
@Controller('client-penalties')
@UseGuards(ClerkAuthGuard, OrgRolesGuard)
@ApiBearerAuth()
@ApiHeader({ name: 'x-organization-id', required: true, description: 'Organization ID' })
export class ClientPenaltyController {
  constructor(private readonly penaltyService: ClientPenaltyService) {}

  @Post()
  @OrgMemberOrAdmin()
  @ApiOperation({ summary: 'Create a new penalty (ban or suspension) for a client' })
  async create(@Request() req: any, @Body() dto: CreatePenaltyDto) {
    const organizationId = req.organizationId;
    const userId = req.user?.id;
    
    if (!organizationId) {
      throw new BadRequestException('Organization context required');
    }

    return this.penaltyService.create(organizationId, dto, userId);
  }

  @Get()
  @OrgMemberOrAdmin()
  @ApiOperation({ summary: 'Get all active penalties for the organization' })
  async findActive(@Request() req: any) {
    const organizationId = req.organizationId;
    
    if (!organizationId) {
      throw new BadRequestException('Organization context required');
    }

    return this.penaltyService.findActiveByOrganization(organizationId);
  }

  @Get('all')
  @OrgMemberOrAdmin()
  @ApiOperation({ summary: 'Get all penalties (including removed/expired) for the organization' })
  async findAll(@Request() req: any) {
    const organizationId = req.organizationId;
    
    if (!organizationId) {
      throw new BadRequestException('Organization context required');
    }

    return this.penaltyService.findAllByOrganization(organizationId);
  }

  @Get('client/:clientId')
  @OrgMemberOrAdmin()
  @ApiOperation({ summary: 'Get all penalties for a specific client' })
  async findByClient(@Request() req: any, @Param('clientId') clientId: string) {
    const organizationId = req.organizationId;
    
    if (!organizationId) {
      throw new BadRequestException('Organization context required');
    }

    return this.penaltyService.findByClient(clientId, organizationId);
  }

  @Get('client/:clientId/active')
  @OrgMemberOrAdmin()
  @ApiOperation({ summary: 'Get active penalty for a specific client' })
  async getActivePenalty(@Request() req: any, @Param('clientId') clientId: string) {
    const organizationId = req.organizationId;
    
    if (!organizationId) {
      throw new BadRequestException('Organization context required');
    }

    const penalty = await this.penaltyService.getActivePenalty(clientId, organizationId);
    return penalty || null;
  }

  @Delete(':penaltyId')
  @OrgMemberOrAdmin()
  @ApiOperation({ summary: 'Remove a penalty from a client' })
  async remove(
    @Request() req: any,
    @Param('penaltyId') penaltyId: string,
    @Body() dto: RemovePenaltyDto,
  ) {
    const organizationId = req.organizationId;
    const userId = req.user?.id;
    
    if (!organizationId) {
      throw new BadRequestException('Organization context required');
    }

    return this.penaltyService.remove(penaltyId, organizationId, dto, userId);
  }
}
