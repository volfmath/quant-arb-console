import { describe, expect, it } from 'vitest';
import { AuditService } from '../src/audit/audit.service';
import { ExecutionService } from '../src/execution/execution.service';
import { PnlService } from '../src/pnl/pnl.service';
import { RiskService } from '../src/risk/risk.service';
import { TasksService } from '../src/tasks/tasks.service';

describe('PnlService', () => {
  it('aggregates realized, funding, fee and net PnL from executed tasks', () => {
    const tasks = new TasksService(new RiskService(), new AuditService(), new ExecutionService());
    const task = tasks.create({
      long_account_id: 'long',
      short_account_id: 'short',
      leverage: 3,
      target_position_size: 200,
    });
    tasks.execute(task.id);

    const pnl = new PnlService(tasks);
    const summary = pnl.summary();

    expect(summary.funding_income).toBe(0.24);
    expect(summary.fee_cost).toBe(0.08);
    expect(summary.net_pnl).toBe(0.16);
    expect(pnl.details().total).toBe(1);
    expect(pnl.trend().points).toHaveLength(1);
  });
});
