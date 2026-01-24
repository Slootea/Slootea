import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  UseGuards,
  Headers,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { OrganizationSettingsService } from './organization-settings.service';
import { UpdateOrganizationSettingsDto } from './dto/organization-settings.dto';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { OrgRolesGuard } from '../auth/guards/org-roles.guard';
import { OrgAdminOnly } from '../auth/decorators/org-roles.decorator';
import { CurrentOrganization } from '../auth/decorators/current-organization.decorator';

@ApiTags('organization-settings')
@Controller('organization-settings')
@UseGuards(ClerkAuthGuard)
@ApiBearerAuth()
export class OrganizationSettingsController {
  constructor(
    private readonly organizationSettingsService: OrganizationSettingsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get organization settings' })
  @ApiHeader({ name: 'x-organization-id', description: 'Organization ID', required: true })
  async getSettings(@Headers('x-organization-id') organizationId: string) {
    return this.organizationSettingsService.findByOrganizationId(organizationId);
  }

  @Put()
  @UseGuards(OrgRolesGuard)
  @OrgAdminOnly()
  @ApiOperation({ summary: 'Update organization settings (Admin only)' })
  @ApiHeader({ name: 'x-organization-id', description: 'Organization ID', required: true })
  async updateSettings(
    @Headers('x-organization-id') organizationId: string,
    @Body() updateDto: UpdateOrganizationSettingsDto,
  ) {
    return this.organizationSettingsService.update(organizationId, updateDto);
  }

  @Get('public/:organizationId')
  @ApiOperation({ summary: 'Get public organization settings for booking page' })
  async getPublicSettings(@Param('organizationId') organizationId: string) {
    return this.organizationSettingsService.getPublicSettings(organizationId);
  }
}
