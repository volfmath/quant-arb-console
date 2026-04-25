import { Injectable } from '@nestjs/common';
import { TasksService } from '../tasks/tasks.service';

@Injectable()
export class DashboardService {
  constructor(private readonly tasksService: TasksService) {}

  assetSummary() {
    const tasks = this.tasksService.list().items;
    const todayPnl = sum(tasks.map((task) => task.net_pnl));

    return {
      total_equity: 100000,
      total_equity_cny: 720000,
      today_pnl: todayPnl,
      today_pnl_pct: Number(((todayPnl / 100000) * 100).toFixed(4)),
      total_pnl: todayPnl,
      total_pnl_pct: Number(((todayPnl / 100000) * 100).toFixed(4)),
      available_balance: 80000,
      available_pct: 80,
    };
  }

  strategySummary() {
    const tasks = this.tasksService.list().items;
    const runningTasks = tasks.filter((task) => task.status === 'running').length;

    return {
      active_strategies: runningTasks > 0 ? 1 : 0,
      total_strategies: 1,
      active_tasks: runningTasks,
      total_tasks: tasks.length,
    };
  }

  riskSummary() {
    const tasks = this.tasksService.list().items;
    const exposure = sum(tasks.map((task) => task.actual_position_size));

    return {
      risk_level: exposure > 50000 ? 'medium' : 'low',
      risk_distribution: { low: tasks.length, medium: 0, high: 0 },
      risk_exposure: exposure,
      leverage_usage_pct: tasks.length ? 38.45 : 0,
      active_alerts: 0,
    };
  }
}

function sum(values: number[]): number {
  return Number(values.reduce((total, value) => total + value, 0).toFixed(8));
}

