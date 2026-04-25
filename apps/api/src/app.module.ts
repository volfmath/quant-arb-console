import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ExchangeModule } from './exchanges/exchange.module';
import { ExecutionModule } from './execution/execution.module';
import { HealthController } from './health.controller';
import { OpportunitiesModule } from './opportunities/opportunities.module';
import { PermissionGuard } from './permissions/permission.guard';
import { RealtimeModule } from './realtime/realtime.module';
import { RiskModule } from './risk/risk.module';
import { TasksModule } from './tasks/tasks.module';

@Module({
  imports: [
    AuthModule,
    DashboardModule,
    ExchangeModule,
    ExecutionModule,
    RealtimeModule,
    OpportunitiesModule,
    RiskModule,
    TasksModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: PermissionGuard,
    },
  ],
})
export class AppModule {}
