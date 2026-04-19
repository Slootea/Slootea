import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transaction } from './entities/transaction.entity';
import { TransactionCategory } from './entities/transaction-category.entity';
import { ParasutIntegration } from './entities/parasut-integration.entity';
import { EconomyService } from './economy.service';
import { ParasutService } from './parasut.service';
import { EconomyController } from './economy.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Transaction,
      TransactionCategory,
      ParasutIntegration,
    ]),
  ],
  controllers: [EconomyController],
  providers: [EconomyService, ParasutService],
  exports: [EconomyService, ParasutService],
})
export class EconomyModule {}
