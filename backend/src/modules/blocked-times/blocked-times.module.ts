import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BlockedTime } from './entities/blocked-time.entity';
import { BlockedTimesService } from './blocked-times.service';
import { BlockedTimesController } from './blocked-times.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([BlockedTime]),
  ],
  controllers: [BlockedTimesController],
  providers: [BlockedTimesService],
  exports: [BlockedTimesService],
})
export class BlockedTimesModule {}
