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
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { ServiceRecordsService } from './service-records.service';
import {
  CreateServiceRecordDto,
  UpdateServiceRecordDto,
  ServiceRecordQueryDto,
  SyncServiceRecordsDto,
} from './dto/service-record.dto';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { OrgRolesGuard } from '../auth/guards/org-roles.guard';
import { OrgMemberOrAdmin } from '../auth/decorators/org-roles.decorator';

@ApiTags('service-records')
@Controller('service-records')
@UseGuards(ClerkAuthGuard, OrgRolesGuard)
@ApiBearerAuth()
@ApiHeader({ name: 'x-organization-id', required: true, description: 'Organization ID' })
export class ServiceRecordsController {
  constructor(private readonly recordsService: ServiceRecordsService) {}

  private orgId(req: any): string {
    const id = req.organizationId;
    if (!id) throw new BadRequestException('Organization context required');
    return id;
  }

  @Post()
  @OrgMemberOrAdmin()
  @ApiOperation({ summary: 'Create a service record' })
  async create(@Request() req: any, @Body() dto: CreateServiceRecordDto) {
    return this.recordsService.create(this.orgId(req), req.user?.dbUserId, dto);
  }

  @Get()
  @OrgMemberOrAdmin()
  @ApiOperation({ summary: 'List service records (paginated)' })
  async findAll(@Request() req: any, @Query() query: ServiceRecordQueryDto) {
    return this.recordsService.findAll(this.orgId(req), query);
  }

  @Post('sync')
  @OrgMemberOrAdmin()
  @ApiOperation({
    summary:
      'Bulk transactional sync (create/update/delete) for one client — all-or-nothing',
  })
  async sync(@Request() req: any, @Body() dto: SyncServiceRecordsDto) {
    return this.recordsService.sync(this.orgId(req), req.user?.dbUserId, dto);
  }

  @Get(':id')
  @OrgMemberOrAdmin()
  @ApiOperation({ summary: 'Get a single service record' })
  async findOne(@Request() req: any, @Param('id') id: string) {
    return this.recordsService.findOne(id, this.orgId(req));
  }

  @Put(':id')
  @OrgMemberOrAdmin()
  @ApiOperation({ summary: 'Update a service record' })
  async update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateServiceRecordDto,
  ) {
    return this.recordsService.update(id, this.orgId(req), dto);
  }

  @Delete(':id')
  @OrgMemberOrAdmin()
  @ApiOperation({ summary: 'Delete a service record' })
  async remove(@Request() req: any, @Param('id') id: string) {
    await this.recordsService.remove(id, this.orgId(req));
    return { message: 'Service record deleted successfully' };
  }
}
