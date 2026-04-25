import { describe, expect, it } from 'vitest';
import { HealthController } from '../src/health.controller';

describe('HealthController', () => {
  it('defaults to mock exchange mode and disables live trading', () => {
    delete process.env.EXCHANGE_MODE;
    delete process.env.ENABLE_LIVE_TRADING;

    const response = new HealthController().getHealth();

    expect(response).toEqual({
      status: 'ok',
      service: 'admin-console-api',
      exchangeMode: 'mock',
      liveTradingEnabled: false,
    });
  });

  it('does not treat invalid exchange mode as live', () => {
    process.env.EXCHANGE_MODE = 'production';
    process.env.ENABLE_LIVE_TRADING = 'false';

    const response = new HealthController().getHealth();

    expect(response.exchangeMode).toBe('mock');
    expect(response.liveTradingEnabled).toBe(false);
  });
});

