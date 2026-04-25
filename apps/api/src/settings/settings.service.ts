import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { getAppConfig } from '../config/app.config';
import type { UserRole } from '../permissions/role-permissions';

export type ExchangeRecord = {
  id: string;
  name: string;
  code: string;
  status: 'active' | 'disabled';
  is_testnet: boolean;
  created_at: string;
};

export type AccountRecord = {
  id: string;
  exchange_code: string;
  name: string;
  status: 'active' | 'disabled' | 'deleted';
  is_testnet: boolean;
  created_at: string;
  deleted_at?: string;
};

export type UserRecord = {
  id: string;
  username: string;
  role: UserRole;
  status: 'active' | 'disabled';
  created_at: string;
  updated_at: string;
};

export type CreateExchangeBody = {
  name?: string;
  code?: string;
  is_testnet?: boolean;
};

export type CreateAccountBody = {
  exchange_code?: string;
  name?: string;
  is_testnet?: boolean;
};

export type CreateUserBody = {
  username?: string;
  role?: UserRole;
};

export type UpdateUserBody = Partial<Pick<UserRecord, 'username' | 'status'>>;

export type UpdateUserRoleBody = {
  role?: UserRole;
};

@Injectable()
export class SettingsService {
  private readonly exchanges: ExchangeRecord[] = [
    {
      id: 'exchange-binance',
      name: 'Binance Mock',
      code: 'binance',
      status: 'active',
      is_testnet: true,
      created_at: new Date().toISOString(),
    },
    {
      id: 'exchange-okx',
      name: 'OKX Mock',
      code: 'okx',
      status: 'active',
      is_testnet: true,
      created_at: new Date().toISOString(),
    },
  ];

  private readonly accounts: AccountRecord[] = [
    {
      id: 'account-binance-mock',
      exchange_code: 'binance',
      name: 'binance-mock-account',
      status: 'active',
      is_testnet: true,
      created_at: new Date().toISOString(),
    },
  ];

  private readonly users: UserRecord[] = [
    {
      id: '00000000-0000-0000-0000-000000000001',
      username: 'admin',
      role: 'super_admin',
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  constructor(@Inject(AuditService) private readonly auditService: AuditService) {}

  listExchanges() {
    return { items: [...this.exchanges], total: this.exchanges.length, page: 1, size: this.exchanges.length };
  }

  createExchange(body: CreateExchangeBody): ExchangeRecord {
    const code = body.code?.trim().toLowerCase();
    if (!body.name?.trim() || !code) {
      throw new BadRequestException('Exchange name and code are required');
    }
    if (this.exchanges.some((exchange) => exchange.code === code)) {
      throw new BadRequestException('Exchange code already exists');
    }

    const exchange: ExchangeRecord = {
      id: crypto.randomUUID(),
      name: body.name.trim(),
      code,
      status: 'active',
      is_testnet: body.is_testnet ?? true,
      created_at: new Date().toISOString(),
    };
    this.exchanges.unshift(exchange);
    this.auditService.record({
      action: 'exchange:create',
      resourceType: 'exchange',
      resourceId: exchange.id,
      afterState: exchange,
    });

    return exchange;
  }

  listAccounts() {
    const items = this.accounts.filter((account) => account.status !== 'deleted');
    return { items, total: items.length, page: 1, size: items.length };
  }

  createAccount(body: CreateAccountBody): AccountRecord {
    if (!body.exchange_code?.trim() || !body.name?.trim()) {
      throw new BadRequestException('Account exchange and name are required');
    }
    const exchangeCode = body.exchange_code.trim().toLowerCase();
    if (!this.exchanges.some((exchange) => exchange.code === exchangeCode)) {
      throw new BadRequestException('Exchange does not exist');
    }

    const account: AccountRecord = {
      id: crypto.randomUUID(),
      exchange_code: exchangeCode,
      name: body.name.trim(),
      status: 'active',
      is_testnet: body.is_testnet ?? true,
      created_at: new Date().toISOString(),
    };
    this.accounts.unshift(account);
    this.auditService.record({
      action: 'account:create',
      resourceType: 'account',
      resourceId: account.id,
      afterState: account,
    });

    return account;
  }

  deleteAccount(id: string): AccountRecord {
    const account = this.findAccount(id);
    const beforeState = { ...account };
    account.status = 'deleted';
    account.deleted_at = new Date().toISOString();
    this.auditService.record({
      action: 'account:delete',
      resourceType: 'account',
      resourceId: account.id,
      beforeState,
      afterState: account,
    });

    return account;
  }

  listUsers() {
    return { items: [...this.users], total: this.users.length, page: 1, size: this.users.length };
  }

  createUser(body: CreateUserBody): UserRecord {
    if (!body.username?.trim()) {
      throw new BadRequestException('Username is required');
    }
    if (this.users.some((user) => user.username === body.username?.trim())) {
      throw new BadRequestException('Username already exists');
    }

    const now = new Date().toISOString();
    const user: UserRecord = {
      id: crypto.randomUUID(),
      username: body.username.trim(),
      role: body.role ?? 'viewer',
      status: 'active',
      created_at: now,
      updated_at: now,
    };
    this.users.unshift(user);
    this.auditService.record({
      action: 'user:create',
      resourceType: 'user',
      resourceId: user.id,
      afterState: user,
    });

    return user;
  }

  updateUser(id: string, body: UpdateUserBody): UserRecord {
    const user = this.findUser(id);
    const beforeState = { ...user };
    if (body.username !== undefined) {
      if (!body.username.trim()) {
        throw new BadRequestException('Username is required');
      }
      user.username = body.username.trim();
    }
    if (body.status !== undefined) {
      user.status = body.status;
    }
    user.updated_at = new Date().toISOString();
    this.auditService.record({
      action: 'user:update',
      resourceType: 'user',
      resourceId: user.id,
      beforeState,
      afterState: user,
    });

    return user;
  }

  updateUserRole(id: string, body: UpdateUserRoleBody): UserRecord {
    const user = this.findUser(id);
    const beforeState = { ...user };
    if (!body.role) {
      throw new BadRequestException('Role is required');
    }
    user.role = body.role;
    user.updated_at = new Date().toISOString();
    this.auditService.record({
      action: 'user:assign_role',
      resourceType: 'user',
      resourceId: user.id,
      beforeState,
      afterState: user,
    });

    return user;
  }

  auditLogs() {
    const items = this.auditService.list().slice().reverse();
    return { items, total: items.length, page: 1, size: items.length };
  }

  systemStatus() {
    return {
      api_connection: 'normal',
      trading_service: getAppConfig().exchangeMode === 'live' ? 'live-disabled-by-config-review' : 'normal',
      strategy_service: 'normal',
      exchange_mode: getAppConfig().exchangeMode,
      version: '0.1.0',
      updated_at: new Date().toISOString(),
    };
  }

  private findAccount(id: string): AccountRecord {
    const account = this.accounts.find((item) => item.id === id && item.status !== 'deleted');
    if (!account) {
      throw new NotFoundException('Account not found');
    }

    return account;
  }

  private findUser(id: string): UserRecord {
    const user = this.users.find((item) => item.id === id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }
}
