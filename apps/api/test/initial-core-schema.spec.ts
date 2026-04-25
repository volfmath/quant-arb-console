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

  it('rolls back tables before enums so PostgreSQL dependencies can be removed', async () => {
    const executed: string[] = [];
    const migration = new InitialCoreSchema20260425000100();
    const queryRunner = {
      query: async (sql: string) => {
        executed.push(sql);
      },
    };

    await migration.down(queryRunner as never);

    const firstTypeDropIndex = executed.findIndex((sql) => sql.startsWith('DROP TYPE'));
    let lastTableDropIndex = -1;
    for (let index = 0; index < executed.length; index += 1) {
      if (executed[index]?.startsWith('DROP TABLE')) {
        lastTableDropIndex = index;
      }
    }

    expect(firstTypeDropIndex).toBeGreaterThan(lastTableDropIndex);
    expect(executed).toContain('DROP TABLE IF EXISTS arbitrage_tasks');
    expect(executed).toContain('DROP TYPE IF EXISTS task_status');
  });

  it('keeps task lifecycle statuses aligned with the execution API', async () => {
    const executed: string[] = [];
    const migration = new InitialCoreSchema20260425000100();
    const queryRunner = {
      query: async (sql: string) => {
        executed.push(sql);
      },
    };

    await migration.up(queryRunner as never);

    const taskStatusSql = executed.find((sql) => sql.startsWith('CREATE TYPE task_status'));
    expect(taskStatusSql).toContain('paused');
    expect(taskStatusSql).toContain('canceled');
    expect(taskStatusSql).toContain('failed');
  });
});
