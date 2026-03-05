import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { SmsTemplate, SmsEventType } from './entities/sms-template.entity';

/**
 * Service to seed default SMS templates on application startup.
 * This ensures default templates exist even when using TypeORM synchronize mode.
 */
@Injectable()
export class SmsTemplateSeederService implements OnModuleInit {
  private readonly logger = new Logger(SmsTemplateSeederService.name);

  constructor(
    @InjectRepository(SmsTemplate)
    private readonly smsTemplateRepository: Repository<SmsTemplate>,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.seedDefaultTemplates();
  }

  private async seedDefaultTemplates(): Promise<void> {
    // Check if default templates already exist
    const existingDefaults = await this.smsTemplateRepository.count({
      where: { isDefault: true, organizationId: IsNull() },
    });

    if (existingDefaults > 0) {
      this.logger.debug(`Found ${existingDefaults} existing default SMS templates, skipping seed`);
      return;
    }

    this.logger.log('Seeding default SMS templates...');

    const defaultTemplates: Partial<SmsTemplate>[] = [
      // Turkish templates
      {
        organizationId: null,
        eventType: SmsEventType.APPOINTMENT_CREATED,
        language: 'tr',
        name: 'Randevu Oluşturuldu',
        content: '{{organizationName}} Randevu:\nMerhaba {{clientName}}, {{serviceName}} randevunuz {{appointmentDate}} tarihinde saat {{appointmentTime}} için oluşturuldu.',
        isActive: true,
        isDefault: true,
      },
      {
        organizationId: null,
        eventType: SmsEventType.APPOINTMENT_REMINDER,
        language: 'tr',
        name: 'Randevu Hatırlatma',
        content: '{{organizationName}} Hatırlatma:\n{{clientName}}, {{appointmentDate}} tarihinde saat {{appointmentTime}} için {{serviceName}} randevunuz bulunmaktadır. {{confirmationLink}}',
        isActive: true,
        isDefault: true,
      },
      {
        organizationId: null,
        eventType: SmsEventType.APPOINTMENT_CANCELED,
        language: 'tr',
        name: 'Randevu İptal',
        content: '{{organizationName}} İptal:\n{{clientName}}, {{appointmentDate}} tarihindeki {{serviceName}} randevunuz iptal edilmiştir.',
        isActive: true,
        isDefault: true,
      },
      {
        organizationId: null,
        eventType: SmsEventType.APPOINTMENT_RESCHEDULED,
        language: 'tr',
        name: 'Randevu Güncellendi',
        content: '{{organizationName}} Güncelleme:\n{{clientName}}, {{serviceName}} randevunuz {{appointmentDate}} tarihinde saat {{appointmentTime}} olarak güncellenmiştir.',
        isActive: true,
        isDefault: true,
      },
      // English templates
      {
        organizationId: null,
        eventType: SmsEventType.APPOINTMENT_CREATED,
        language: 'en',
        name: 'Appointment Created',
        content: '{{organizationName}} Appointment:\nHi {{clientName}}, your {{serviceName}} appointment is scheduled for {{appointmentDate}} at {{appointmentTime}}.',
        isActive: true,
        isDefault: true,
      },
      {
        organizationId: null,
        eventType: SmsEventType.APPOINTMENT_REMINDER,
        language: 'en',
        name: 'Appointment Reminder',
        content: '{{organizationName}} Reminder:\n{{clientName}}, you have a {{serviceName}} appointment on {{appointmentDate}} at {{appointmentTime}}. {{confirmationLink}}',
        isActive: true,
        isDefault: true,
      },
      {
        organizationId: null,
        eventType: SmsEventType.APPOINTMENT_CANCELED,
        language: 'en',
        name: 'Appointment Canceled',
        content: '{{organizationName}} Canceled:\n{{clientName}}, your {{serviceName}} appointment on {{appointmentDate}} has been canceled.',
        isActive: true,
        isDefault: true,
      },
      {
        organizationId: null,
        eventType: SmsEventType.APPOINTMENT_RESCHEDULED,
        language: 'en',
        name: 'Appointment Rescheduled',
        content: '{{organizationName}} Rescheduled:\n{{clientName}}, your {{serviceName}} appointment has been rescheduled to {{appointmentDate}} at {{appointmentTime}}.',
        isActive: true,
        isDefault: true,
      },
    ];

    try {
      for (const template of defaultTemplates) {
        const entity = this.smsTemplateRepository.create(template);
        await this.smsTemplateRepository.save(entity);
      }
      this.logger.log(`Successfully seeded ${defaultTemplates.length} default SMS templates`);
    } catch (error) {
      this.logger.error('Failed to seed default SMS templates', error);
    }
  }
}
