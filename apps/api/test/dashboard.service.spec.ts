import { describe, expect, it } from 'vitest';
import { AuditService } from '../src/audit/audit.service';
import { DashboardService } from '../src/dashboard/dashboard.service';
import { ExecutionService } from '../src/execution/execution.service';
import { RiskService } from '../src/risk/risk.service';
import { TasksService } from '../src/tasks/tasks.service';

describe('DashboardService', () => {
  it('aggregates task state into dashboard summaries', () => {
    const tasks = new TasksService(new RiskService(), new AuditService(), new ExecutionService());
    const task = tasks.create({
      long_account_id: 'long',
      short_account_id: 'short',
      leverage: 3,
      target_position_size: 200,
    });
    tasks.execute(task.id);

    const dashboard = new DashboardService(tasks);

    expect(dashboard.assetSummary().total_equity).toBe(100000);
    expect(dashboard.strategySummary()).toMatchObject({ active_tasks: 1, total_tasks: 1 });
    expect(dashboard.riskSummary()).toMatchObject({ risk_level: 'low', risk_exposure: 200 });
  });
});
