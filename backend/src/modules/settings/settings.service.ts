import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BusinessSettings } from './entities/business-settings.entity';
import { UpdateBusinessSettingsDto } from './dto/settings.dto';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(BusinessSettings)
    private readonly settingsRepository: Repository<BusinessSettings>,
  ) {}

  async findByUserId(userId: string): Promise<BusinessSettings> {
    let settings = await this.settingsRepository.findOne({
      where: { userId },
    });

    if (!settings) {
      // Create default settings
      settings = this.settingsRepository.create({ userId });
      settings = await this.settingsRepository.save(settings);
    }

    return settings;
  }

  async update(
    userId: string,
    updateDto: UpdateBusinessSettingsDto,
  ): Promise<BusinessSettings> {
    let settings = await this.settingsRepository.findOne({
      where: { userId },
    });

    if (!settings) {
      settings = this.settingsRepository.create({ userId, ...updateDto });
    } else {
      Object.assign(settings, updateDto);
    }

    return this.settingsRepository.save(settings);
  }
}
