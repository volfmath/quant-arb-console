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
}

function sum(values: number[]): number {
  return Number(values.reduce((total, value) => total + value, 0).toFixed(8));
}

