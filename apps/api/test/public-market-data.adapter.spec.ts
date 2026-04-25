import { afterEach, describe, expect, it, vi } from 'vitest';
import { PublicMarketDataAdapter } from '../src/exchanges/public-market-data.adapter';

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.EXCHANGE_MODE;
  delete process.env.ENABLE_LIVE_TRADING;
});

describe('PublicMarketDataAdapter', () => {
  it('maps public funding-rate responses from Binance, OKX, and Gate', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => jsonResponse(responseFor(String(input))));
    const adapter = new PublicMarketDataAdapter();

    const rates = await adapter.getFundingRates(['BTC/USDT:USDT']);

    expect(rates).toHaveLength(3);
    expect(rates.map((rate) => rate.exchange)).toEqual(['binance', 'okx', 'gate']);
    expect(rates[0]).toMatchObject({
      unifiedSymbol: 'BTC/USDT:USDT',
      fundingRate: 0.0001,
      markPrice: 60001,
    });
    expect(rates[1]).toMatchObject({
      exchange: 'okx',
      fundingRate: 0.00012,
      markPrice: 60003,
    });
    expect(rates[2]).toMatchObject({
      exchange: 'gate',
      fundingRate: 0.00013,
      markPrice: 60004,
    });
  });

  it('maps exchange-specific ticker responses', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => jsonResponse(responseFor(String(input))));
    const adapter = new PublicMarketDataAdapter();

    const binanceTicker = await adapter.getTicker('BTC/USDT:USDT', 'binance');
    const okxTicker = await adapter.getTicker('BTC/USDT:USDT', 'okx');
    const gateTicker = await adapter.getTicker('BTC/USDT:USDT', 'gate');

    expect(binanceTicker).toMatchObject({ bestBid: 60000, bestAsk: 60002, bidSize: 3 });
    expect(okxTicker).toMatchObject({ bestBid: 60020, bestAsk: 60022, bidSize: 5 });
    expect(gateTicker).toMatchObject({ bestBid: 60030, bestAsk: 60032, bidSize: 6 });
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
  if (url.includes('api.gateio.ws/api/v4/futures/usdt/contracts/BTC_USDT')) {
    return {
      funding_rate: '0.00013',
      funding_next_apply: 1777125600,
      mark_price: '60004',
    };
  }
  if (url.includes('api.gateio.ws/api/v4/futures/usdt/tickers')) {
    return [
      {
        last: '60004',
        funding_rate: '0.00013',
        mark_price: '60004',
        highest_bid: '60030',
        highest_size: '6',
        lowest_ask: '60032',
        lowest_size: '2.9',
      },
    ];
  }

  throw new Error(`Unhandled URL: ${url}`);
}

function jsonResponse(body: unknown): Promise<Response> {
  return Promise.resolve({
    ok: true,
    json: async () => body,
  } as Response);
}
