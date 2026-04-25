import { describe, expect, it } from 'vitest';
import { AuditService } from '../src/audit/audit.service';
import { RiskService } from '../src/risk/risk.service';

describe('RiskService', () => {
  it('passes a conservative mock task', () => {
    const result = new RiskService().checkBeforeOpen({
      targetPositionSize: 200,
      leverage: 3,
      longAccountId: 'account-long',
      shortAccountId: 'account-short',
    });

    expect(result.passed).toBe(true);
  });

  it('blocks invalid leverage and same-account hedges', () => {
    const result = new RiskService().checkBeforeOpen({
      targetPositionSize: 200,
      leverage: 10,
      longAccountId: 'same',
      shortAccountId: 'same',
    });

    expect(result.passed).toBe(false);
    expect(result.reasons).toContain('leverage must be an integer between 1 and 3');
    expect(result.reasons).toContain('long and short accounts must be different');
  });

  it('manages risk rules and writes audit records', () => {
    const audit = new AuditService();
    const service = new RiskService(audit);

    const rule = service.createRule({
      name: '单账户最大仓位',
      metric: 'position_size',
      operator: '<=',
      threshold: 1000,
      severity: 'high',
    });
    const updated = service.updateRule(rule.id, { threshold: 800 });
    const toggled = service.toggleRule(rule.id);

    expect(service.rulesList().total).toBe(3);
    expect(updated.threshold).toBe(800);
    expect(toggled.enabled).toBe(false);
    expect(audit.list().map((record) => record.action)).toEqual([
      'risk_rule:create',
      'risk_rule:update',
      'risk_rule:toggle',
    ]);
  });

  it('exposes overview, account risk and manual circuit break state', () => {
    const audit = new AuditService();
    const service = new RiskService(audit);

    const circuitBreak = service.circuitBreak({ reason: 'operator test', scope: 'all' });

    expect(service.overview()).toMatchObject({
      risk_level: 'critical',
      circuit_breaker_enabled: true,
      circuit_breaker_reason: 'operator test',
    });
    expect(service.accounts().total).toBe(2);
    expect(circuitBreak.enabled).toBe(true);
    expect(audit.list()[0]?.action).toBe('risk:circuit_break');
  });
});
