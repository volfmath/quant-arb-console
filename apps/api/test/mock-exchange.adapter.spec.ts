import { describe, expect, it } from 'vitest';
import { MockExchangeAdapter } from '../src/exchanges/mock-exchange.adapter';

describe('MockExchangeAdapter', () => {
  it('returns deterministic funding rate snapshots for supported exchanges', async () => {
    const adapter = new MockExchangeAdapter();

    const rates = await adapter.getFundingRates(['BTC/USDT:USDT', 'ETH/USDT:USDT']);

    expect(rates).toHaveLength(6);
    expect(rates[0]).toMatchObject({
      exchange: 'binance',
      unifiedSymbol: 'BTC/USDT:USDT',
    });
  });

  it('does not place live orders when live trading is disabled', async () => {
    process.env.EXCHANGE_MODE = 'live';
    process.env.ENABLE_LIVE_TRADING = 'false';
    const adapter = new MockExchangeAdapter();

    await expect(
      adapter.placeOrder({
        exchange: 'binance',
        unifiedSymbol: 'BTC/USDT:USDT',
        side: 'buy',
        positionSide: 'long',
        orderType: 'limit',
        qty: 1,
        price: 60000,
        clientOrderId: 'order-1',
      }),
    ).rejects.toThrow('Live trading is disabled');
  });
});

