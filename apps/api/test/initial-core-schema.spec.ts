import { describe, expect, it } from 'vitest';
import { InitialCoreSchema20260425000100 } from '../src/database/migrations/20260425000100-InitialCoreSchema';

describe('InitialCoreSchema migration', () => {
  it('declares every core table used by the MVP docs', async () => {
    const executed: string[] = [];
    const migration = new InitialCoreSchema20260425000100();
    const queryRunner = {
      query: async (sql: string) => {
        executed.push(sql);
      },
    };

    await migration.up(queryRunner as never);

    const joinedSql = executed.join('\n');
    const coreTables = [
      'exchanges',
      'exchange_accounts',
      'instruments',
      'funding_rates',
      'ticker_snapshots',
      'arbitrage_opportunities',
      'arbitrage_tasks',
      'orders',
      'fills',
      'positions',
      'account_balances',
      'pnl_snapshots',
      'strategies',
      'risk_rules',
      'alerts',
      'users',
      'audit_logs',
    ];

    for (const table of coreTables) {
      expect(joinedSql).toContain(`CREATE TABLE ${table}`);
    }
  });

  it('keeps execution idempotency indexes in the schema', async () => {
    const executed: string[] = [];
    const migration = new InitialCoreSchema20260425000100();
    const queryRunner = {
      query: async (sql: string) => {
        executed.push(sql);
      },
    };

    await migration.up(queryRunner as never);

    const joinedSql = executed.join('\n');
    expect(joinedSql).toContain('idx_orders_exchange_order_unique');
    expect(joinedSql).toContain('idx_fills_exchange_trade_unique');
  });
});

