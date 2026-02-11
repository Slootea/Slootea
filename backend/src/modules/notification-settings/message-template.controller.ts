import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiHeader, ApiQuery } from '@nestjs/swagger';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { OrgRolesGuard } from '../auth/guards/org-roles.guard';
import { OrgAdminOnly } from '../auth/decorators/org-roles.decorator';
import { MessageTemplateService, MESSAGE_TEMPLATE_PLACEHOLDERS } from './message-template.service';
import {
  CreateMessageTemplateDto,
  UpdateMessageTemplateDto,
  MessageTemplateResponseDto,
  AllMessageTemplatesResponseDto,
  AllDefaultTemplatesResponseDto,
  DefaultTemplateDto,
} from './dto/message-template.dto';
import { MessageTemplateType } from './entities/organization-message-template.entity';

@ApiTags('message-templates')
@Controller('message-templates')
export class MessageTemplateController {
  constructor(private readonly messageTemplateService: MessageTemplateService) {}

  /**
   * Get default templates by language (public, no auth required)
   */
  @Get('defaults')
  @ApiOperation({ summary: 'Get default message templates by language' })
  @ApiQuery({ name: 'lang', required: false, description: 'Language code (default: en)' })
  @ApiResponse({ status: 200, type: AllDefaultTemplatesResponseDto })
  getDefaultTemplates(
    @Query('lang') lang: string = 'en',
  ): AllDefaultTemplatesResponseDto {
    const templates = this.messageTemplateService.getDefaultTemplates(lang);
    return {
      language: lang,
      templates: templates as unknown as Record<string, DefaultTemplateDto>,
    };
  }

  /**
   * Get a single default template by type and language (public, no auth required)
   */
  @Get('defaults/:templateType')
  @ApiOperation({ summary: 'Get a single default template by type and language' })
  @ApiParam({ name: 'templateType', enum: MessageTemplateType, description: 'Template type' })
  @ApiQuery({ name: 'lang', required: false, description: 'Language code (default: en)' })
  @ApiResponse({ status: 200, type: DefaultTemplateDto })
  getDefaultTemplateByType(
    @Param('templateType') templateType: MessageTemplateType,
    @Query('lang') lang: string = 'en',
  ): DefaultTemplateDto {
    return this.messageTemplateService.getDefaultTemplateByType(templateType, lang);
  }
}

@ApiTags('message-templates')
@ApiBearerAuth()
@Controller('organizations/:orgId/message-templates')
@UseGuards(ClerkAuthGuard, OrgRolesGuard)
@OrgAdminOnly()
export class OrganizationMessageTemplateController {
  constructor(private readonly messageTemplateService: MessageTemplateService) {}

  @Get()
  @ApiOperation({ summary: 'Get all message templates for an organization' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiHeader({ name: 'x-organization-id', description: 'Organization ID', required: true })
  @ApiResponse({ status: 200, type: AllMessageTemplatesResponseDto })
  async findAll(
    @Param('orgId') orgId: string,
    @Headers('x-organization-id') headerOrgId: string,
  ): Promise<AllMessageTemplatesResponseDto> {
    const organizationId = orgId || headerOrgId;
    const templates = await this.messageTemplateService.findAllByOrganization(organizationId);
    
    return {
      templates,
      availablePlaceholders: MESSAGE_TEMPLATE_PLACEHOLDERS,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific message template' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiHeader({ name: 'x-organization-id', description: 'Organization ID', required: true })
  @ApiResponse({ status: 200, type: MessageTemplateResponseDto })
  async findOne(
    @Param('orgId') orgId: string,
    @Headers('x-organization-id') headerOrgId: string,
    @Param('id') id: string,
  ): Promise<MessageTemplateResponseDto> {
    const organizationId = orgId || headerOrgId;
    return this.messageTemplateService.findOne(id, organizationId);
  }

  @Post()
  @ApiOperation({ summary: 'Create or update a message template (admin only)' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiHeader({ name: 'x-organization-id', description: 'Organization ID', required: true })
  @ApiResponse({ status: 201, type: MessageTemplateResponseDto })
  async createOrUpdate(
    @Param('orgId') orgId: string,
    @Headers('x-organization-id') headerOrgId: string,
    @Body() dto: CreateMessageTemplateDto,
  ): Promise<MessageTemplateResponseDto> {
    const organizationId = orgId || headerOrgId;
    return this.messageTemplateService.createOrUpdate(organizationId, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a message template (admin only)' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiHeader({ name: 'x-organization-id', description: 'Organization ID', required: true })
  @ApiResponse({ status: 200, type: MessageTemplateResponseDto })
  async update(
    @Param('orgId') orgId: string,
    @Headers('x-organization-id') headerOrgId: string,
    @Param('id') id: string,
    @Body() dto: UpdateMessageTemplateDto,
  ): Promise<MessageTemplateResponseDto> {
    const organizationId = orgId || headerOrgId;
    return this.messageTemplateService.update(id, organizationId, dto);
  }

  @Post('reset/:templateType')
  @ApiOperation({ summary: 'Reset a message template to default (admin only)' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiHeader({ name: 'x-organization-id', description: 'Organization ID', required: true })
  @ApiResponse({ status: 200, type: MessageTemplateResponseDto })
  async resetToDefault(
    @Param('orgId') orgId: string,
    @Headers('x-organization-id') headerOrgId: string,
    @Param('templateType') templateType: MessageTemplateType,
  ): Promise<MessageTemplateResponseDto> {
    const organizationId = orgId || headerOrgId;
    return this.messageTemplateService.resetToDefault(organizationId, templateType);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a custom message template (admin only)' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiHeader({ name: 'x-organization-id', description: 'Organization ID', required: true })
  @ApiResponse({ status: 200 })
  async delete(
    @Param('orgId') orgId: string,
    @Headers('x-organization-id') headerOrgId: string,
    @Param('id') id: string,
  ): Promise<{ message: string }> {
    const organizationId = orgId || headerOrgId;
    await this.messageTemplateService.delete(id, organizationId);
    return { message: 'Template deleted, reverted to default' };
  }
}
