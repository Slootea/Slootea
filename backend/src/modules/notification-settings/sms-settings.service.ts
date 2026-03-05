import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import {
  OrganizationSmsSettings,
} from './entities/organization-sms-settings.entity';
import {
  OrganizationNotificationParameters,
} from './entities/organization-notification-parameters.entity';
import {
  SmsTemplate,
  SmsEventType,
} from './entities/sms-template.entity';
import {
  UpdateSmsSettingsDto,
  ConnectSmsDto,
  SmsNotificationSettingsResponseDto,
  CreateSmsTemplateDto,
  UpdateSmsTemplateDto,
  SmsTemplateResponseDto,
} from './dto/sms-notification-settings.dto';

@Injectable()
export class SmsSettingsService {
  private readonly logger = new Logger(SmsSettingsService.name);

  constructor(
    @InjectRepository(OrganizationSmsSettings)
    private readonly smsSettingsRepository: Repository<OrganizationSmsSettings>,
    @InjectRepository(OrganizationNotificationParameters)
    private readonly notificationParamsRepository: Repository<OrganizationNotificationParameters>,
    @InjectRepository(SmsTemplate)
    private readonly smsTemplateRepository: Repository<SmsTemplate>,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Get or create SMS settings for an organization
   */
  private async getOrCreateSmsSettings(organizationId: string): Promise<OrganizationSmsSettings> {
    let settings = await this.smsSettingsRepository.findOne({
      where: { organizationId },
    });

    if (!settings) {
      settings = this.smsSettingsRepository.create({
        organizationId,
        enabled: false,
        useGlobalCredentials: true,
      });
      settings = await this.smsSettingsRepository.save(settings);
    }

    return settings;
  }

  /**
   * Get or create notification parameters for an organization
   */
  private async getOrCreateNotificationParams(organizationId: string): Promise<OrganizationNotificationParameters> {
    let params = await this.notificationParamsRepository.findOne({
      where: { organizationId },
    });

    if (!params) {
      params = this.notificationParamsRepository.create({
        organizationId,
        appointmentCreated: true,
        appointmentReminder: true,
        appointmentCanceled: true,
        appointmentRescheduled: true,
      });
      params = await this.notificationParamsRepository.save(params);
    }

    return params;
  }

  /**
   * Check if global Verimor credentials are configured
   */
  private hasGlobalCredentials(): boolean {
    const username = this.configService.get<string>('VERIMOR_USERNAME');
    const password = this.configService.get<string>('VERIMOR_PASSWORD');
    return !!(username && password);
  }

  /**
   * Get complete SMS notification settings for an organization
   */
  async getSmsSettings(organizationId: string): Promise<SmsNotificationSettingsResponseDto> {
    const [smsSettings, notificationParams] = await Promise.all([
      this.getOrCreateSmsSettings(organizationId),
      this.getOrCreateNotificationParams(organizationId),
    ]);

    // Check if configured (has custom credentials or using global)
    const hasCustomCredentials = !!(smsSettings.username && smsSettings.password);
    const isConfigured = hasCustomCredentials || (smsSettings.useGlobalCredentials && this.hasGlobalCredentials());

    return {
      enabled: smsSettings.enabled,
      isConfigured,
      useGlobalCredentials: smsSettings.useGlobalCredentials,
      sourceAddr: smsSettings.sourceAddr || undefined,
      templateLanguage: smsSettings.templateLanguage || 'tr',
      parameters: {
        appointmentCreated: notificationParams.appointmentCreated,
        appointmentReminder: notificationParams.appointmentReminder,
        appointmentCanceled: notificationParams.appointmentCanceled,
        appointmentRescheduled: notificationParams.appointmentRescheduled,
      },
    };
  }

  /**
   * Update SMS enabled status and notification parameters
   */
  async updateSmsSettings(
    organizationId: string,
    dto: UpdateSmsSettingsDto,
  ): Promise<SmsNotificationSettingsResponseDto> {
    // Update SMS settings
    let smsSettings = await this.getOrCreateSmsSettings(organizationId);
    smsSettings.enabled = dto.enabled;
    if (dto.useGlobalCredentials !== undefined) {
      smsSettings.useGlobalCredentials = dto.useGlobalCredentials;
    }
    if (dto.templateLanguage) {
      smsSettings.templateLanguage = dto.templateLanguage;
    }
    await this.smsSettingsRepository.save(smsSettings);

    // Update notification parameters
    let notificationParams = await this.getOrCreateNotificationParams(organizationId);
    if (dto.parameters) {
      if (dto.parameters.appointmentCreated !== undefined) {
        notificationParams.appointmentCreated = dto.parameters.appointmentCreated;
      }
      if (dto.parameters.appointmentReminder !== undefined) {
        notificationParams.appointmentReminder = dto.parameters.appointmentReminder;
      }
      if (dto.parameters.appointmentCanceled !== undefined) {
        notificationParams.appointmentCanceled = dto.parameters.appointmentCanceled;
      }
      if (dto.parameters.appointmentRescheduled !== undefined) {
        notificationParams.appointmentRescheduled = dto.parameters.appointmentRescheduled;
      }
      await this.notificationParamsRepository.save(notificationParams);
    }

    return this.getSmsSettings(organizationId);
  }

  /**
   * Connect custom Verimor credentials
   */
  async connectSms(
    organizationId: string,
    dto: ConnectSmsDto,
  ): Promise<SmsNotificationSettingsResponseDto> {
    let settings = await this.getOrCreateSmsSettings(organizationId);

    settings.username = dto.username;
    settings.password = dto.password;
    settings.sourceAddr = dto.sourceAddr || null;
    settings.useGlobalCredentials = false;

    await this.smsSettingsRepository.save(settings);

    this.logger.log(`Custom Verimor credentials connected for organization ${organizationId}`);

    return this.getSmsSettings(organizationId);
  }

  /**
   * Disconnect custom Verimor credentials (revert to global)
   */
  async disconnectSms(organizationId: string): Promise<SmsNotificationSettingsResponseDto> {
    let settings = await this.smsSettingsRepository.findOne({
      where: { organizationId },
    });

    if (settings) {
      settings.username = null;
      settings.password = null;
      settings.sourceAddr = null;
      settings.useGlobalCredentials = true;
      await this.smsSettingsRepository.save(settings);
    }

    this.logger.log(`Custom Verimor credentials disconnected for organization ${organizationId}`);

    return this.getSmsSettings(organizationId);
  }

  /**
   * Check if SMS is enabled and configured for an organization
   */
  async isSmsReady(organizationId: string): Promise<boolean> {
    const settings = await this.smsSettingsRepository.findOne({
      where: { organizationId },
    });

    if (!settings?.enabled) {
      return false;
    }

    const hasCustomCredentials = !!(settings.username && settings.password);
    return hasCustomCredentials || (settings.useGlobalCredentials && this.hasGlobalCredentials());
  }

  // ==================== SMS Templates ====================

  /**
   * Get all SMS templates for an organization (including default templates)
   */
  async getTemplates(organizationId: string): Promise<SmsTemplateResponseDto[]> {
    // Get organization-specific templates
    const orgTemplates = await this.smsTemplateRepository.find({
      where: { organizationId },
      order: { eventType: 'ASC', language: 'ASC' },
    });

    // Get default templates
    const defaultTemplates = await this.smsTemplateRepository.find({
      where: { organizationId: IsNull(), isDefault: true },
      order: { eventType: 'ASC', language: 'ASC' },
    });

    // Merge templates, preferring organization-specific over defaults
    const templateMap = new Map<string, SmsTemplate>();

    // Add defaults first
    for (const template of defaultTemplates) {
      const key = `${template.eventType}-${template.language}`;
      templateMap.set(key, template);
    }

    // Override with organization templates
    for (const template of orgTemplates) {
      const key = `${template.eventType}-${template.language}`;
      templateMap.set(key, template);
    }

    return Array.from(templateMap.values()).map(t => ({
      id: t.id,
      organizationId: t.organizationId || undefined,
      eventType: t.eventType,
      language: t.language,
      name: t.name,
      content: t.content,
      isActive: t.isActive,
      isDefault: t.isDefault,
    }));
  }

  /**
   * Get a specific SMS template
   */
  async getTemplate(templateId: string): Promise<SmsTemplateResponseDto> {
    const template = await this.smsTemplateRepository.findOne({
      where: { id: templateId },
    });

    if (!template) {
      throw new NotFoundException('SMS template not found');
    }

    return {
      id: template.id,
      organizationId: template.organizationId || undefined,
      eventType: template.eventType,
      language: template.language,
      name: template.name,
      content: template.content,
      isActive: template.isActive,
      isDefault: template.isDefault,
    };
  }

  /**
   * Create a new SMS template for an organization
   */
  async createTemplate(
    organizationId: string,
    dto: CreateSmsTemplateDto,
  ): Promise<SmsTemplateResponseDto> {
    // Check if template already exists for this org/event/language
    const existing = await this.smsTemplateRepository.findOne({
      where: {
        organizationId,
        eventType: dto.eventType,
        language: dto.language,
      },
    });

    if (existing) {
      // Update existing template
      existing.name = dto.name;
      existing.content = dto.content;
      existing.isActive = true;
      await this.smsTemplateRepository.save(existing);
      return this.getTemplate(existing.id);
    }

    // Create new template
    const template = this.smsTemplateRepository.create({
      organizationId,
      eventType: dto.eventType,
      language: dto.language,
      name: dto.name,
      content: dto.content,
      isActive: true,
      isDefault: false,
    });

    await this.smsTemplateRepository.save(template);

    return this.getTemplate(template.id);
  }

  /**
   * Update an SMS template
   */
  async updateTemplate(
    organizationId: string,
    templateId: string,
    dto: UpdateSmsTemplateDto,
  ): Promise<SmsTemplateResponseDto> {
    const template = await this.smsTemplateRepository.findOne({
      where: { id: templateId },
    });

    if (!template) {
      throw new NotFoundException('SMS template not found');
    }

    // If it's a default template, create an organization-specific copy
    if (template.isDefault && !template.organizationId) {
      const newTemplate = this.smsTemplateRepository.create({
        organizationId,
        eventType: template.eventType,
        language: template.language,
        name: dto.name || template.name,
        content: dto.content || template.content,
        isActive: dto.isActive !== undefined ? dto.isActive : template.isActive,
        isDefault: false,
      });

      await this.smsTemplateRepository.save(newTemplate);
      return this.getTemplate(newTemplate.id);
    }

    // Verify ownership
    if (template.organizationId !== organizationId) {
      throw new NotFoundException('SMS template not found');
    }

    // Update the template
    if (dto.name !== undefined) template.name = dto.name;
    if (dto.content !== undefined) template.content = dto.content;
    if (dto.isActive !== undefined) template.isActive = dto.isActive;

    await this.smsTemplateRepository.save(template);

    return this.getTemplate(template.id);
  }

  /**
   * Delete an SMS template
   */
  async deleteTemplate(organizationId: string, templateId: string): Promise<void> {
    const template = await this.smsTemplateRepository.findOne({
      where: { id: templateId },
    });

    if (!template) {
      throw new NotFoundException('SMS template not found');
    }

    // Cannot delete default templates
    if (template.isDefault) {
      throw new NotFoundException('Cannot delete default templates');
    }

    // Verify ownership
    if (template.organizationId !== organizationId) {
      throw new NotFoundException('SMS template not found');
    }

    await this.smsTemplateRepository.remove(template);
  }

  /**
   * Reset an organization template to default
   */
  async resetTemplateToDefault(
    organizationId: string,
    eventType: SmsEventType,
    language: string,
  ): Promise<SmsTemplateResponseDto | null> {
    // Find and delete organization-specific template
    const orgTemplate = await this.smsTemplateRepository.findOne({
      where: {
        organizationId,
        eventType,
        language,
      },
    });

    if (orgTemplate) {
      await this.smsTemplateRepository.remove(orgTemplate);
    }

    // Return the default template
    const defaultTemplate = await this.smsTemplateRepository.findOne({
      where: {
        organizationId: IsNull(),
        eventType,
        language,
        isDefault: true,
      },
    });

    if (!defaultTemplate) {
      return null;
    }

    return {
      id: defaultTemplate.id,
      organizationId: undefined,
      eventType: defaultTemplate.eventType,
      language: defaultTemplate.language,
      name: defaultTemplate.name,
      content: defaultTemplate.content,
      isActive: defaultTemplate.isActive,
      isDefault: defaultTemplate.isDefault,
    };
  }
}
