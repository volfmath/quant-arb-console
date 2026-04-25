import { describe, expect, it } from 'vitest';
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
});

