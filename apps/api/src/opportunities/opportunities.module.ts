import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ExchangeModule } from '../exchanges/exchange.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { OpportunitiesController } from './opportunities.controller';
import { OpportunitiesService } from './opportunities.service';

@Module({
  imports: [AuthModule, ExchangeModule, RealtimeModule],
  controllers: [OpportunitiesController],
  providers: [OpportunitiesService],
  exports: [OpportunitiesService],
})
export class OpportunitiesModule {}
