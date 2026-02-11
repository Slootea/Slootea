import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  OrganizationMessageTemplate,
  MessageTemplateType,
  DEFAULT_MESSAGE_TEMPLATES,
} from './entities/organization-message-template.entity';
import {
  CreateMessageTemplateDto,
  UpdateMessageTemplateDto,
} from './dto/message-template.dto';

/**
 * Available placeholders for message templates
 */
export const MESSAGE_TEMPLATE_PLACEHOLDERS = [
  '{{clientName}}',
  '{{serviceName}}',
  '{{appointmentDate}}',
  '{{appointmentTime}}',
  '{{providerName}}',
  '{{organizationName}}',
  '{{appointmentLink}}',
  '{{confirmationLink}}',
];

/**
 * Data for rendering a message template
 */
export interface MessageTemplateData {
  clientName: string;
  serviceName: string;
  appointmentDate: string;
  appointmentTime: string;
  providerName?: string;
  organizationName?: string;
  appointmentLink?: string;
  confirmationLink?: string;
}

@Injectable()
export class MessageTemplateService {
  private readonly logger = new Logger(MessageTemplateService.name);

  constructor(
    @InjectRepository(OrganizationMessageTemplate)
    private readonly templateRepository: Repository<OrganizationMessageTemplate>,
  ) {}

  /**
   * Get all message templates for an organization
   * Returns default templates for types that don't have a custom template
   */
  async findAllByOrganization(organizationId: string): Promise<OrganizationMessageTemplate[]> {
    const customTemplates = await this.templateRepository.find({
      where: { organizationId },
      order: { templateType: 'ASC' },
    });

    // Create a map of custom templates
    const customTemplateMap = new Map<MessageTemplateType, OrganizationMessageTemplate>();
    for (const template of customTemplates) {
      customTemplateMap.set(template.templateType, template);
    }

    // Return custom templates + defaults for missing types
    const result: OrganizationMessageTemplate[] = [];

    for (const templateType of Object.values(MessageTemplateType)) {
      const customTemplate = customTemplateMap.get(templateType);
      if (customTemplate) {
        result.push(customTemplate);
      } else {
        // Return a virtual default template (not saved to DB yet)
        const defaultTemplate = DEFAULT_MESSAGE_TEMPLATES[templateType];
        result.push({
          id: `default-${templateType}`,
          organizationId,
          templateType,
          emailSubject: defaultTemplate.emailSubject,
          messageContent: defaultTemplate.messageContent,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as OrganizationMessageTemplate);
      }
    }

    return result;
  }

  /**
   * Get a specific message template
   */
  async findOne(id: string, organizationId: string): Promise<OrganizationMessageTemplate> {
    const template = await this.templateRepository.findOne({
      where: { id, organizationId },
    });

    if (!template) {
      throw new NotFoundException('Message template not found');
    }

    return template;
  }

  /**
   * Get a message template by type for an organization
   * Returns the custom template if it exists, otherwise returns the default
   */
  async findByType(
    organizationId: string,
    templateType: MessageTemplateType,
  ): Promise<{ emailSubject: string; messageContent: string; isActive: boolean }> {
    const customTemplate = await this.templateRepository.findOne({
      where: { organizationId, templateType },
    });

    if (customTemplate) {
      return {
        emailSubject: customTemplate.emailSubject || DEFAULT_MESSAGE_TEMPLATES[templateType].emailSubject,
        messageContent: customTemplate.messageContent,
        isActive: customTemplate.isActive,
      };
    }

    // Return default template
    return {
      ...DEFAULT_MESSAGE_TEMPLATES[templateType],
      isActive: true,
    };
  }

  /**
   * Create or update a message template
   */
  async createOrUpdate(
    organizationId: string,
    dto: CreateMessageTemplateDto,
  ): Promise<OrganizationMessageTemplate> {
    // Check if template already exists for this type
    let template = await this.templateRepository.findOne({
      where: { organizationId, templateType: dto.templateType },
    });

    if (template) {
      // Update existing template
      template.emailSubject = dto.emailSubject ?? template.emailSubject;
      template.messageContent = dto.messageContent;
      template.isActive = dto.isActive ?? template.isActive;
    } else {
      // Create new template
      const defaultTemplate = DEFAULT_MESSAGE_TEMPLATES[dto.templateType];
      template = this.templateRepository.create({
        organizationId,
        templateType: dto.templateType,
        emailSubject: dto.emailSubject ?? defaultTemplate.emailSubject,
        messageContent: dto.messageContent,
        isActive: dto.isActive ?? true,
      });
    }

    return this.templateRepository.save(template);
  }

  /**
   * Update a message template
   */
  async update(
    id: string,
    organizationId: string,
    dto: UpdateMessageTemplateDto,
  ): Promise<OrganizationMessageTemplate> {
    const template = await this.findOne(id, organizationId);

    if (dto.emailSubject !== undefined) {
      template.emailSubject = dto.emailSubject;
    }
    if (dto.messageContent !== undefined) {
      template.messageContent = dto.messageContent;
    }
    if (dto.isActive !== undefined) {
      template.isActive = dto.isActive;
    }

    return this.templateRepository.save(template);
  }

  /**
   * Reset a message template to default
   */
  async resetToDefault(
    organizationId: string,
    templateType: MessageTemplateType,
  ): Promise<OrganizationMessageTemplate> {
    const template = await this.templateRepository.findOne({
      where: { organizationId, templateType },
    });

    if (!template) {
      // No custom template exists, nothing to reset
      throw new NotFoundException('No custom template exists for this type');
    }

    // Reset to default values
    const defaultTemplate = DEFAULT_MESSAGE_TEMPLATES[templateType];
    template.emailSubject = defaultTemplate.emailSubject;
    template.messageContent = defaultTemplate.messageContent;
    template.isActive = true;

    return this.templateRepository.save(template);
  }

  /**
   * Delete a custom message template (reverts to default)
   */
  async delete(id: string, organizationId: string): Promise<void> {
    const template = await this.findOne(id, organizationId);
    await this.templateRepository.remove(template);
  }

  /**
   * Render a message template with data
   */
  renderTemplate(template: string, data: MessageTemplateData): string {
    let rendered = template;

    rendered = rendered.replace(/\{\{clientName\}\}/g, data.clientName || '');
    rendered = rendered.replace(/\{\{serviceName\}\}/g, data.serviceName || '');
    rendered = rendered.replace(/\{\{appointmentDate\}\}/g, data.appointmentDate || '');
    rendered = rendered.replace(/\{\{appointmentTime\}\}/g, data.appointmentTime || '');
    
    // Handle optional provider name - remove the line if not provided
    if (data.providerName) {
      rendered = rendered.replace(/\{\{providerName\}\}/g, `👤 Provider: ${data.providerName}`);
    } else {
      rendered = rendered.replace(/\{\{providerName\}\}\n?/g, '');
    }
    
    rendered = rendered.replace(/\{\{organizationName\}\}/g, data.organizationName || '');
    rendered = rendered.replace(/\{\{appointmentLink\}\}/g, data.appointmentLink || '');
    rendered = rendered.replace(/\{\{confirmationLink\}\}/g, data.confirmationLink || '');

    return rendered.trim();
  }

  /**
   * Get rendered message for a specific event type
   */
  async getRenderedMessage(
    organizationId: string,
    templateType: MessageTemplateType,
    data: MessageTemplateData,
  ): Promise<{ subject: string; body: string } | null> {
    const template = await this.findByType(organizationId, templateType);

    if (!template.isActive) {
      return null;
    }

    return {
      subject: this.renderTemplate(template.emailSubject, data),
      body: this.renderTemplate(template.messageContent, data),
    };
  }

  /**
   * Get available placeholders
   */
  getAvailablePlaceholders(): string[] {
    return MESSAGE_TEMPLATE_PLACEHOLDERS;
  }
}
