import { describe, expect, it } from 'vitest';
import { AuditService } from '../src/audit/audit.service';
import { ExecutionService } from '../src/execution/execution.service';
import { RiskService } from '../src/risk/risk.service';
import { TasksService } from '../src/tasks/tasks.service';

describe('TasksService', () => {
  it('creates a pending task after risk check and writes audit log', () => {
    const audit = new AuditService();
    const service = new TasksService(new RiskService(), audit, new ExecutionService());

    const task = service.create({
      opportunity_id: 'opp-1',
      long_account_id: 'long',
      short_account_id: 'short',
      leverage: 3,
      target_position_size: 200,
    });

    expect(task.status).toBe('pending');
    expect(task.task_number).toBe(1);
    expect(service.list().total).toBe(1);
    expect(audit.list()[0]?.action).toBe('task:create');
  });

  it('rejects tasks that fail risk checks', () => {
    const service = new TasksService(new RiskService(), new AuditService(), new ExecutionService());

    expect(() =>
      service.create({
        long_account_id: 'same',
        short_account_id: 'same',
        leverage: 9,
        target_position_size: 200,
      }),
    ).toThrow('Risk check failed');
  });

  it('executes a pending task through the mock execution engine', () => {
    const audit = new AuditService();
    const service = new TasksService(new RiskService(), audit, new ExecutionService());
    const task = service.create({
      long_account_id: 'long',
      short_account_id: 'short',
      leverage: 3,
      target_position_size: 200,
    });

    const executed = service.execute(task.id);

    expect(executed.status).toBe('running');
    expect(executed.long_qty).toBeGreaterThan(0);
    expect(executed.short_qty).toBe(executed.long_qty);
    expect(executed.funding_income).toBeGreaterThan(0);
    expect(executed.net_pnl).toBeGreaterThan(0);
    expect(service.orders(task.id).total).toBe(2);
    expect(service.positions(task.id).total).toBe(2);
    expect(audit.list().map((record) => record.action)).toEqual(['task:create', 'task:execute']);
  });
});
