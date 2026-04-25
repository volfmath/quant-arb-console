import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ExchangeModule } from '../exchanges/exchange.module';
import { OpportunitiesController } from './opportunities.controller';
import { OpportunitiesService } from './opportunities.service';

@Module({
  imports: [AuthModule, ExchangeModule],
  controllers: [OpportunitiesController],
  providers: [OpportunitiesService],
  exports: [OpportunitiesService],
})
export class OpportunitiesModule {}
