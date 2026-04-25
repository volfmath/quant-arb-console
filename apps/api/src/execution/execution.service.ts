import { Injectable } from '@nestjs/common';
import type { ArbitrageTask } from '../tasks/tasks.service';

export type ExecutionResult = {
  status: 'running';
  actual_position_size: number;
  margin_used: number;
  long_qty: number;
  short_qty: number;
  started_at: string;
};

@Injectable()
export class ExecutionService {
  open(task: ArbitrageTask): ExecutionResult {
    const notional = task.target_position_size * task.leverage;
    const quantity = Number((notional / 60000).toFixed(8));

    return {
      status: 'running',
      actual_position_size: task.target_position_size,
      margin_used: Number((task.target_position_size / task.leverage).toFixed(8)),
      long_qty: quantity,
      short_qty: quantity,
      started_at: new Date().toISOString(),
    };
  }
}
