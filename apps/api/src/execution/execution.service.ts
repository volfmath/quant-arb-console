import { Injectable } from '@nestjs/common';
import type { ArbitrageTask } from '../tasks/tasks.service';

export type ExecutionResult = {
  status: 'running';
  actual_position_size: number;
  margin_used: number;
  long_qty: number;
  short_qty: number;
  funding_income: number;
  trading_fee: number;
  started_at: string;
  orders: ExecutedOrder[];
  positions: OpenPosition[];
};

export type ExecutedOrder = {
  id: string;
  task_id: string;
  exchange: string;
  unified_symbol: string;
  side: 'buy' | 'sell';
  position_side: 'long' | 'short';
  order_type: 'market';
  qty: number;
  avg_fill_price: number;
  status: 'filled';
  leg: 'long' | 'short';
  is_close: boolean;
  filled_at: string;
};

export type OpenPosition = {
  id: string;
  task_id: string;
  exchange: string;
  unified_symbol: string;
  side: 'long' | 'short';
  qty: number;
  avg_entry_price: number;
  leverage: number;
  margin: number;
  unrealized_pnl: number;
  is_open: true;
  opened_at: string;
};

@Injectable()
export class ExecutionService {
  open(task: ArbitrageTask): ExecutionResult {
    const notional = task.target_position_size * task.leverage;
    const quantity = Number((notional / 60000).toFixed(8));
    const openedAt = new Date().toISOString();

    return {
      status: 'running',
      actual_position_size: task.target_position_size,
      margin_used: Number((task.target_position_size / task.leverage).toFixed(8)),
      long_qty: quantity,
      short_qty: quantity,
      funding_income: Number((task.target_position_size * 0.0012).toFixed(8)),
      trading_fee: Number((task.target_position_size * 0.0004).toFixed(8)),
      started_at: openedAt,
      orders: [
        buildOrder(task, 'long', 'buy', quantity, openedAt),
        buildOrder(task, 'short', 'sell', quantity, openedAt),
      ],
      positions: [
        buildPosition(task, 'long', quantity, openedAt),
        buildPosition(task, 'short', quantity, openedAt),
      ],
    };
  }
}

function buildOrder(
  task: ArbitrageTask,
  leg: 'long' | 'short',
  side: 'buy' | 'sell',
  qty: number,
  filledAt: string,
): ExecutedOrder {
  return {
    id: crypto.randomUUID(),
    task_id: task.id,
    exchange: leg === 'long' ? task.long_exchange : task.short_exchange,
    unified_symbol: task.unified_symbol,
    side,
    position_side: leg,
    order_type: 'market',
    qty,
    avg_fill_price: 60000,
    status: 'filled',
    leg,
    is_close: false,
    filled_at: filledAt,
  };
}

function buildPosition(task: ArbitrageTask, side: 'long' | 'short', qty: number, openedAt: string): OpenPosition {
  return {
    id: crypto.randomUUID(),
    task_id: task.id,
    exchange: side === 'long' ? task.long_exchange : task.short_exchange,
    unified_symbol: task.unified_symbol,
    side,
    qty,
    avg_entry_price: 60000,
    leverage: task.leverage,
    margin: Number((task.target_position_size / task.leverage / 2).toFixed(8)),
    unrealized_pnl: 0,
    is_open: true,
    opened_at: openedAt,
  };
}
