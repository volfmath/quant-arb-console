import { Body, Controller, Delete, Get, Inject, Param, Post, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RequirePermission } from '../permissions/require-permission.decorator';
import {
  CreateAccountBody,
  CreateExchangeBody,
  CreateUserBody,
  SettingsService,
  UpdateUserBody,
  UpdateUserRoleBody,
} from './settings.service';

@Controller('exchanges')
@UseGuards(JwtAuthGuard)
export class ExchangesController {
  constructor(@Inject(SettingsService) private readonly settingsService: SettingsService) {}

  @Get()
  @RequirePermission('exchange:manage')
  list() {
    return this.settingsService.listExchanges();
  }

  @Post()
  @RequirePermission('exchange:manage')
  create(@Body() body: CreateExchangeBody) {
    return this.settingsService.createExchange(body);
  }
}

@Controller('accounts')
@UseGuards(JwtAuthGuard)
export class AccountsController {
  constructor(@Inject(SettingsService) private readonly settingsService: SettingsService) {}

  @Get()
  @RequirePermission('account:manage')
  list() {
    return this.settingsService.listAccounts();
  }

  @Post()
  @RequirePermission('account:manage')
  create(@Body() body: CreateAccountBody) {
    return this.settingsService.createAccount(body);
  }

  @Delete(':id')
  @RequirePermission('account:manage')
  delete(@Param('id') id: string) {
    return this.settingsService.deleteAccount(id);
  }
}

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(@Inject(SettingsService) private readonly settingsService: SettingsService) {}

  @Get()
  @RequirePermission('user:manage')
  list() {
    return this.settingsService.listUsers();
  }

  @Post()
  @RequirePermission('user:manage')
  create(@Body() body: CreateUserBody) {
    return this.settingsService.createUser(body);
  }

  @Put(':id')
  @RequirePermission('user:manage')
  update(@Param('id') id: string, @Body() body: UpdateUserBody) {
    return this.settingsService.updateUser(id, body);
  }

  @Put(':id/role')
  @RequirePermission('user:assign_role')
  updateRole(@Param('id') id: string, @Body() body: UpdateUserRoleBody) {
    return this.settingsService.updateUserRole(id, body);
  }
}

@Controller('audit-logs')
@UseGuards(JwtAuthGuard)
export class AuditLogsController {
  constructor(@Inject(SettingsService) private readonly settingsService: SettingsService) {}

  @Get()
  @RequirePermission('audit:view')
  list() {
    return this.settingsService.auditLogs();
  }
}

@Controller('system')
@UseGuards(JwtAuthGuard)
export class SystemController {
  constructor(@Inject(SettingsService) private readonly settingsService: SettingsService) {}

  @Get('status')
  @RequirePermission('dashboard:view')
  status() {
    return this.settingsService.systemStatus();
  }
}
