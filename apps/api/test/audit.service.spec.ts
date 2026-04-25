import { describe, expect, it } from 'vitest';
import { AuditService } from '../src/audit/audit.service';

describe('AuditService', () => {
  it('records immutable audit entries for key actions', () => {
    const service = new AuditService();

    const record = service.record({
      userId: 'user-1',
      action: 'task:create',
      resourceType: 'arbitrage_task',
      resourceId: 'task-1',
      afterState: { status: 'pending' },
    });

    expect(record.id).toBeTruthy();
    expect(record.createdAt).toBeInstanceOf(Date);
    expect(service.list()).toHaveLength(1);
    expect(service.list()[0]?.action).toBe('task:create');
  });
});

