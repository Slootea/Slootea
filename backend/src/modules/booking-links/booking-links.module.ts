import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookingLink } from './entities/booking-link.entity';
import { BookingLinksService } from './booking-links.service';
import { BookingLinksController } from './booking-links.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([BookingLink]),
  ],
  controllers: [BookingLinksController],
  providers: [BookingLinksService],
  exports: [BookingLinksService],
})
export class BookingLinksModule {}
