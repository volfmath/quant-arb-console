import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { ExchangeModule } from './exchanges/exchange.module';
import { HealthController } from './health.controller';
import { OpportunitiesModule } from './opportunities/opportunities.module';
import { PermissionGuard } from './permissions/permission.guard';
import { RealtimeModule } from './realtime/realtime.module';

@Module({
  imports: [AuthModule, ExchangeModule, RealtimeModule, OpportunitiesModule],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: PermissionGuard,
    },
  ],
})
export class AppModule {}
