import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import {
  AccountsController,
  AuditLogsController,
  ExchangesController,
  SystemController,
  UsersController,
} from './settings.controller';
import { SettingsService } from './settings.service';

@Module({
  imports: [AuditModule, AuthModule],
  controllers: [ExchangesController, AccountsController, UsersController, AuditLogsController, SystemController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
