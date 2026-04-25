import { describe, expect, it } from 'vitest';
import { ExecutionService } from '../src/execution/execution.service';
import type { ArbitrageTask } from '../src/tasks/tasks.service';

describe('ExecutionService', () => {
  it('opens a mock hedged position without touching real exchanges', () => {
    const task: ArbitrageTask = {
      id: 'task-1',
      task_number: 1,
      status: 'pending',
      unified_symbol: 'BTC/USDT:USDT',
      long_exchange: 'binance',
      short_exchange: 'okx',
      leverage: 3,
      target_position_size: 200,
      actual_position_size: 0,
      margin_used: 0,
      long_qty: 0,
      short_qty: 0,
      funding_income: 0,
      trading_fee: 0,
      realized_pnl: 0,
      unrealized_pnl: 0,
      net_pnl: 0,
      created_at: new Date().toISOString(),
    };

    const result = new ExecutionService().open(task);

    expect(result.status).toBe('running');
    expect(result.actual_position_size).toBe(200);
    expect(result.long_qty).toBe(result.short_qty);
    expect(result.funding_income).toBeGreaterThan(result.trading_fee);
    expect(result.orders).toHaveLength(2);
    expect(result.positions).toHaveLength(2);
    expect(result.orders.map((order) => order.leg)).toEqual(['long', 'short']);
  });
});
