import {
  Controller,
  Get,
  Put,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { UpdateBusinessSettingsDto } from './dto/settings.dto';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';

@ApiTags('settings')
@Controller('settings')
@UseGuards(ClerkAuthGuard)
@ApiBearerAuth()
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Get business settings' })
  async getSettings(@Request() req: any) {
    return this.settingsService.findByUserId(req.user.dbUserId);
  }

  @Put()
  @ApiOperation({ summary: 'Update business settings' })
  async updateSettings(
    @Request() req: any,
    @Body() updateDto: UpdateBusinessSettingsDto,
  ) {
    return this.settingsService.update(req.user.dbUserId, updateDto);
  }
}
