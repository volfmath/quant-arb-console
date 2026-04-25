import { Inject, Injectable } from '@nestjs/common';
import { TasksService } from '../tasks/tasks.service';

@Injectable()
export class PnlService {
  constructor(@Inject(TasksService) private readonly tasksService: TasksService) {}

  summary() {
    const tasks = this.tasksService.list().items;
    const realizedPnl = sum(tasks.map((task) => task.realized_pnl));
    const unrealizedPnl = sum(tasks.map((task) => task.unrealized_pnl));
    const fundingIncome = sum(tasks.map((task) => task.funding_income));
    const feeCost = sum(tasks.map((task) => task.trading_fee));
    const netPnl = sum(tasks.map((task) => task.net_pnl));

    return {
      total_pnl: netPnl,
      realized_pnl: realizedPnl,
      unrealized_pnl: unrealizedPnl,
      funding_income: fundingIncome,
      fee_cost: feeCost,
      net_pnl: netPnl,
    };
  }

  trend() {
    const tasks = this.tasksService.list().items;
    return {
      points: tasks
        .slice()
        .reverse()
        .map((task) => ({
          time: task.started_at ?? task.created_at,
          total: task.net_pnl,
          funding: task.funding_income,
          fee: task.trading_fee,
        })),
    };
  }

  details() {
    const tasks = this.tasksService.list().items;
    return {
      items: tasks.map((task) => ({
        task_id: task.id,
        task_number: task.task_number,
        unified_symbol: task.unified_symbol,
        long_exchange: task.long_exchange,
        short_exchange: task.short_exchange,
        realized_pnl: task.realized_pnl,
        unrealized_pnl: task.unrealized_pnl,
        funding_income: task.funding_income,
        fee_cost: task.trading_fee,
        net_pnl: task.net_pnl,
        snapshot_at: task.started_at ?? task.created_at,
      })),
      total: tasks.length,
    };
  }

  byStrategy() {
    const rows = new Map<string, { strategy_id: string; tasks: number; funding_income: number; fee_cost: number; net_pnl: number }>();
    for (const task of this.tasksService.list().items) {
      const strategyId = task.strategy_id ?? 'manual';
      const row =
        rows.get(strategyId) ??
        rows
          .set(strategyId, {
            strategy_id: strategyId,
            tasks: 0,
            funding_income: 0,
            fee_cost: 0,
            net_pnl: 0,
          })
          .get(strategyId)!;
      row.tasks += 1;
      row.funding_income = round(row.funding_income + task.funding_income);
      row.fee_cost = round(row.fee_cost + task.trading_fee);
      row.net_pnl = round(row.net_pnl + task.net_pnl);
    }

    return { items: [...rows.values()], total: rows.size };
  }

  byExchange() {
    const rows = new Map<string, { exchange: string; legs: number; funding_income: number; fee_cost: number; net_pnl: number }>();
    for (const task of this.tasksService.list().items) {
      for (const exchange of [task.long_exchange, task.short_exchange]) {
        const row =
          rows.get(exchange) ??
          rows
            .set(exchange, {
              exchange,
              legs: 0,
              funding_income: 0,
              fee_cost: 0,
              net_pnl: 0,
            })
            .get(exchange)!;
        row.legs += 1;
        row.funding_income = round(row.funding_income + task.funding_income / 2);
        row.fee_cost = round(row.fee_cost + task.trading_fee / 2);
        row.net_pnl = round(row.net_pnl + task.net_pnl / 2);
      }
    }

    return { items: [...rows.values()], total: rows.size };
  }

  exportCsv(): string {
    const rows = this.details().items;
    const header = [
      'task_id',
      'task_number',
      'unified_symbol',
      'long_exchange',
      'short_exchange',
      'realized_pnl',
      'unrealized_pnl',
      'funding_income',
      'fee_cost',
      'net_pnl',
      'snapshot_at',
    ];
    const body = rows.map((row) => header.map((key) => csvCell(row[key as keyof typeof row])).join(','));
    return [header.join(','), ...body].join('\n');
  }
}

function sum(values: number[]): number {
  return round(values.reduce((total, value) => total + value, 0));
}

function round(value: number): number {
  return Number(value.toFixed(8));
}

function csvCell(value: unknown): string {
  const text = String(value ?? '');
  if (text.includes(',') || text.includes('"') || text.includes('\n')) {
    return `"${text.replaceAll('"', '""')}"`;
  }

  return text;
}
