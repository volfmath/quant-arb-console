import { describe, expect, it } from 'vitest';
import { AlertsService } from '../src/alerts/alerts.service';

describe('AlertsService', () => {
  it('lists active alerts and supports acknowledge/dismiss actions', () => {
    const service = new AlertsService();

    expect(service.list().total).toBe(1);
    expect(service.unreadCount().count).toBe(1);

    const acknowledged = service.acknowledge('mock-alert-api-health');
    expect(acknowledged.status).toBe('acknowledged');
    expect(service.unreadCount().count).toBe(0);

    const dismissed = service.dismiss('mock-alert-api-health');
    expect(dismissed.status).toBe('dismissed');
  });

  it('creates and resolves runtime alerts', () => {
    const service = new AlertsService();

    const alert = service.create({
      source: 'risk_engine',
      severity: 'critical',
      title: 'Circuit break',
      message: 'Manual circuit break',
    });
    const resolved = service.resolve(alert.id);

    expect(alert.status).toBe('resolved');
    expect(resolved.resolved_at).toBeTruthy();
    expect(service.list().total).toBe(2);
  });
});
