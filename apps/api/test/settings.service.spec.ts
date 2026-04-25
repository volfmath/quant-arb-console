import { describe, expect, it } from 'vitest';
import { AuditService } from '../src/audit/audit.service';
import { SettingsService } from '../src/settings/settings.service';

describe('SettingsService', () => {
  it('manages exchanges and accounts in mock/testnet mode', () => {
    const audit = new AuditService();
    const service = new SettingsService(audit);

    const exchange = service.createExchange({ name: 'Bybit Mock', code: 'bybit', is_testnet: true });
    const account = service.createAccount({ exchange_code: exchange.code, name: 'bybit-test-account' });
    const deleted = service.deleteAccount(account.id);

    expect(service.listExchanges().total).toBe(3);
    expect(account.is_testnet).toBe(true);
    expect(deleted.status).toBe('deleted');
    expect(service.listAccounts().items.some((item) => item.id === account.id)).toBe(false);
    expect(audit.list().map((record) => record.action)).toEqual([
      'exchange:create',
      'account:create',
      'account:delete',
    ]);
  });

  it('manages users and role assignment', () => {
    const service = new SettingsService(new AuditService());

    const user = service.createUser({ username: 'viewer-1', role: 'viewer' });
    const renamed = service.updateUser(user.id, { username: 'risk-1' });
    const reassigned = service.updateUserRole(user.id, { role: 'risk_manager' });

    expect(renamed.username).toBe('risk-1');
    expect(reassigned.role).toBe('risk_manager');
    expect(service.listUsers().total).toBe(2);
  });

  it('exposes audit logs and system status', () => {
    const service = new SettingsService(new AuditService());

    service.createUser({ username: 'trader-1', role: 'trader' });

    expect(service.auditLogs().total).toBe(1);
    expect(service.systemStatus()).toMatchObject({
      api_connection: 'normal',
      strategy_service: 'normal',
    });
  });

  it('rejects invalid or duplicate settings resources', () => {
    const service = new SettingsService(new AuditService());

    expect(() => service.createExchange({ name: 'Binance', code: 'binance' })).toThrow(
      'Exchange code already exists',
    );
    expect(() => service.createAccount({ exchange_code: 'missing', name: 'missing-account' })).toThrow(
      'Exchange does not exist',
    );
    expect(() => service.createUser({ username: 'admin' })).toThrow('Username already exists');
  });
});
