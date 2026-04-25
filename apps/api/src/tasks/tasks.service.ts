import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { ExecutionService } from '../execution/execution.service';
import { RiskService } from '../risk/risk.service';

export type CreateTaskBody = {
  opportunity_id?: string;
  strategy_id?: string;
  unified_symbol?: string;
  long_exchange?: string;
  short_exchange?: string;
  long_account_id?: string;
  short_account_id?: string;
  leverage?: number;
  target_position_size?: number;
};

export type ArbitrageTask = {
  id: string;
  task_number: number;
  opportunity_id?: string;
  strategy_id?: string;
  status: 'pending' | 'confirming' | 'running' | 'failed';
  unified_symbol: string;
  long_exchange: string;
  short_exchange: string;
  leverage: number;
  target_position_size: number;
  actual_position_size: number;
  margin_used: number;
  long_qty: number;
  short_qty: number;
  realized_pnl: number;
  unrealized_pnl: number;
  net_pnl: number;
  created_at: string;
  started_at?: string;
};

@Injectable()
export class TasksService {
  private readonly tasks: ArbitrageTask[] = [];
  private nextTaskNumber = 1;

  constructor(
    private readonly riskService: RiskService,
    private readonly auditService: AuditService,
    private readonly executionService: ExecutionService,
  ) {}

  list() {
    return {
      items: [...this.tasks],
      total: this.tasks.length,
      page: 1,
      size: this.tasks.length,
    };
  }

  create(body: CreateTaskBody): ArbitrageTask {
    const leverage = body.leverage ?? 1;
    const targetPositionSize = body.target_position_size ?? 0;
    const longAccountId = body.long_account_id ?? '';
    const shortAccountId = body.short_account_id ?? '';

    const riskResult = this.riskService.checkBeforeOpen({
      leverage,
      targetPositionSize,
      longAccountId,
      shortAccountId,
    });

    if (!riskResult.passed) {
      throw new BadRequestException({
        message: 'Risk check failed',
        reasons: riskResult.reasons,
      });
    }

    const task: ArbitrageTask = {
      id: crypto.randomUUID(),
      task_number: this.nextTaskNumber,
      opportunity_id: body.opportunity_id,
      strategy_id: body.strategy_id,
      status: 'pending',
      unified_symbol: body.unified_symbol ?? 'BTC/USDT:USDT',
      long_exchange: body.long_exchange ?? 'binance',
      short_exchange: body.short_exchange ?? 'okx',
      leverage,
      target_position_size: targetPositionSize,
      actual_position_size: 0,
      margin_used: 0,
      long_qty: 0,
      short_qty: 0,
      realized_pnl: 0,
      unrealized_pnl: 0,
      net_pnl: 0,
      created_at: new Date().toISOString(),
    };

    this.nextTaskNumber += 1;
    this.tasks.unshift(task);

    this.auditService.record({
      action: 'task:create',
      resourceType: 'arbitrage_task',
      resourceId: task.id,
      afterState: task,
    });

    return task;
  }

  execute(id: string): ArbitrageTask {
    const task = this.tasks.find((item) => item.id === id);
    if (!task) {
      throw new NotFoundException('Task not found');
    }

    if (task.status !== 'pending') {
      throw new BadRequestException(`Task cannot execute from status: ${task.status}`);
    }

    task.status = 'confirming';
    const result = this.executionService.open(task);
    task.status = result.status;
    task.actual_position_size = result.actual_position_size;
    task.margin_used = result.margin_used;
    task.long_qty = result.long_qty;
    task.short_qty = result.short_qty;
    task.started_at = result.started_at;

    this.auditService.record({
      action: 'task:execute',
      resourceType: 'arbitrage_task',
      resourceId: task.id,
      afterState: task,
    });

    return task;
  }
}
