import { afterEach, describe, expect, it, vi } from 'vitest';
import { PublicMarketDataAdapter } from '../src/exchanges/public-market-data.adapter';

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.EXCHANGE_MODE;
  delete process.env.ENABLE_LIVE_TRADING;
});

describe('PublicMarketDataAdapter', () => {
  it('maps public funding-rate responses from Binance, Bybit, and OKX', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => jsonResponse(responseFor(String(input))));
    const adapter = new PublicMarketDataAdapter();

    const rates = await adapter.getFundingRates(['BTC/USDT:USDT']);

    expect(rates).toHaveLength(3);
    expect(rates.map((rate) => rate.exchange)).toEqual(['binance', 'bybit', 'okx']);
    expect(rates[0]).toMatchObject({
      unifiedSymbol: 'BTC/USDT:USDT',
      fundingRate: 0.0001,
      markPrice: 60001,
    });
    expect(rates[2]).toMatchObject({
      exchange: 'okx',
      fundingRate: 0.00012,
      markPrice: 60003,
    });
  });

  it('maps exchange-specific ticker responses', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => jsonResponse(responseFor(String(input))));
    const adapter = new PublicMarketDataAdapter();

    const binanceTicker = await adapter.getTicker('BTC/USDT:USDT', 'binance');
    const bybitTicker = await adapter.getTicker('BTC/USDT:USDT', 'bybit');
    const okxTicker = await adapter.getTicker('BTC/USDT:USDT', 'okx');

    expect(binanceTicker).toMatchObject({ bestBid: 60000, bestAsk: 60002, bidSize: 3 });
    expect(bybitTicker).toMatchObject({ bestBid: 60010, bestAsk: 60012, bidSize: 4 });
    expect(okxTicker).toMatchObject({ bestBid: 60020, bestAsk: 60022, bidSize: 5 });
  });

  it('does not place authenticated orders through the public adapter', async () => {
    process.env.EXCHANGE_MODE = 'testnet';
    const adapter = new PublicMarketDataAdapter();

    await expect(
      adapter.placeOrder({
        exchange: 'binance',
        unifiedSymbol: 'BTC/USDT:USDT',
        side: 'buy',
        positionSide: 'long',
        orderType: 'market',
        qty: 1,
        clientOrderId: 'order-1',
      }),
    ).rejects.toThrow('Authenticated order placement is not implemented');
  });
});

function responseFor(url: string): unknown {
  if (url.includes('fapi.binance.com/fapi/v1/premiumIndex')) {
    return {
      markPrice: '60001',
      lastFundingRate: '0.0001',
      nextFundingTime: 1777125600000,
      time: 1777118400000,
    };
  }
  if (url.includes('fapi.binance.com/fapi/v1/ticker/bookTicker')) {
    return {
      bidPrice: '60000',
      bidQty: '3',
      askPrice: '60002',
      askQty: '2',
      time: 1777118400000,
    };
  }
  if (url.includes('api.bybit.com/v5/market/tickers')) {
    return {
      retCode: 0,
      result: {
        list: [
          {
            lastPrice: '60011',
            markPrice: '60011',
            fundingRate: '0.00011',
            nextFundingTime: '1777125600000',
            bid1Price: '60010',
            bid1Size: '4',
            ask1Price: '60012',
            ask1Size: '2.5',
            ts: '1777118400000',
          },
        ],
      },
    };
  }
  if (url.includes('www.okx.com/api/v5/public/funding-rate')) {
    return {
      code: '0',
      data: [{ fundingRate: '0.00012', nextFundingTime: '1777125600000' }],
    };
  }
  if (url.includes('www.okx.com/api/v5/market/ticker')) {
    return {
      code: '0',
      data: [
        {
          last: '60003',
          bidPx: '60020',
          bidSz: '5',
          askPx: '60022',
          askSz: '2.8',
          ts: '1777118400000',
        },
      ],
    };
  }

  throw new Error(`Unhandled URL: ${url}`);
}

function jsonResponse(body: unknown): Promise<Response> {
  return Promise.resolve({
    ok: true,
    json: async () => body,
  } as Response);
}
