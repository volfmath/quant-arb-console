import { describe, expect, it } from 'vitest';
import { AuditService } from '../src/audit/audit.service';
import { StrategiesService } from '../src/strategies/strategies.service';

describe('StrategiesService', () => {
  it('lists the seed strategy for the dashboard and strategy page', () => {
    const service = new StrategiesService(new AuditService());

    const list = service.list();

    expect(list.total).toBe(1);
    expect(list.items[0]?.status).toBe('running');
    expect(list.items[0]?.type).toBe('funding_rate_arb');
  });

  it('creates, updates and toggles a strategy with audit records', () => {
    const audit = new AuditService();
    const service = new StrategiesService(audit);

    const created = service.create({
      name: '资金费套利_ETH',
      symbol: 'ETH/USDT:USDT',
      min_spread_pct: 0.03,
      max_position_size: 500,
      leverage: 2,
    });
    expect(created.status).toBe('draft');

    const updated = service.update(created.id, { min_spread_pct: 0.04, leverage: 4 });
    const toggled = service.toggle(created.id);

    expect(updated.min_spread_pct).toBe(0.04);
    expect(updated.leverage).toBe(4);
    expect(toggled.status).toBe('running');
    expect(audit.list().map((record) => record.action)).toEqual([
      'strategy:create',
      'strategy:update',
      'strategy:toggle',
    ]);
  });

  it('rejects invalid strategy risk parameters', () => {
    const service = new StrategiesService(new AuditService());

    expect(() => service.create({ name: 'bad', leverage: 11 })).toThrow('Leverage must be between 1 and 10');
    expect(() => service.create({ name: 'bad', max_position_size: 0 })).toThrow(
      'Max position size must be greater than 0',
    );
  });
});
