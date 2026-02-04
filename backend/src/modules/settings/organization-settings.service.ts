import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrganizationSettings } from './entities/organization-settings.entity';
import { UpdateOrganizationSettingsDto } from './dto/organization-settings.dto';

@Injectable()
export class OrganizationSettingsService {
  constructor(
    @InjectRepository(OrganizationSettings)
    private readonly settingsRepository: Repository<OrganizationSettings>,
  ) {}

  /**
   * Get organization settings, creating defaults if none exist
   */
  async findByOrganizationId(organizationId: string): Promise<OrganizationSettings> {
    let settings = await this.settingsRepository.findOne({
      where: { organizationId },
    });

    if (!settings) {
      // Create default settings
      settings = this.settingsRepository.create({ organizationId });
      settings = await this.settingsRepository.save(settings);
    }

    return settings;
  }

  /**
   * Update organization settings (admin only - enforced at controller level)
   */
  async update(
    organizationId: string,
    updateDto: UpdateOrganizationSettingsDto,
  ): Promise<OrganizationSettings> {
    let settings = await this.settingsRepository.findOne({
      where: { organizationId },
    });

    if (!settings) {
      settings = this.settingsRepository.create({ organizationId, ...updateDto });
    } else {
      Object.assign(settings, updateDto);
    }

    return this.settingsRepository.save(settings);
  }

  /**
   * Check if provider selection is enabled for an organization
   */
  async isProviderSelectionEnabled(organizationId: string): Promise<boolean> {
    const settings = await this.findByOrganizationId(organizationId);
    return settings.allowProviderSelection;
  }

  /**
   * Get public-facing organization settings (for booking page)
   */
  async getPublicSettings(organizationId: string): Promise<Partial<OrganizationSettings>> {
    const settings = await this.findByOrganizationId(organizationId);
    
    return {
      allowProviderSelection: settings.allowProviderSelection,
      providerSelectionMode: settings.providerSelectionMode,
      showProviderNames: settings.showProviderNames,
      showProviderPhotos: settings.showProviderPhotos,
      welcomeMessage: settings.welcomeMessage,
      bookingInstructions: settings.bookingInstructions,
      cancellationPolicy: settings.cancellationPolicy,
      minAdvanceBookingHours: settings.minAdvanceBookingHours,
      maxAdvanceBookingDays: settings.maxAdvanceBookingDays,
      timezone: settings.timezone,
    };
  }
}
