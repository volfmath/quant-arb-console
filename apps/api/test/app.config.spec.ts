import { describe, expect, it } from 'vitest';
import { getAppConfig } from '../src/config/app.config';
import { getCacheConfig } from '../src/config/cache.config';
import { getQueueConfig } from '../src/config/queue.config';

describe('app config', () => {
  it('defaults to mock exchange mode and live trading off', () => {
    expect(getAppConfig({})).toMatchObject({
      apiPort: 3000,
      exchangeMode: 'mock',
      liveTradingEnabled: false,
      adminUsername: 'admin',
    });
  });

  it('parses cache and queue defaults', () => {
    expect(getCacheConfig({})).toEqual({
      redisUrl: 'redis://localhost:6379',
      keyPrefix: 'quant-arb-console',
    });
    expect(getQueueConfig({})).toEqual({
      rabbitMqUrl: 'amqp://localhost:5672',
      taskExecutionQueue: 'task.execution',
      eventExchange: 'quant.events',
    });
  });

  it('rejects invalid API ports', () => {
    expect(() => getAppConfig({ API_PORT: '0' })).toThrow('Invalid API_PORT');
  });
});

