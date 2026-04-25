import { Injectable } from '@nestjs/common';
import { getAppConfig } from '../config/app.config';
import type {
  ExchangeAdapter,
  ExchangeCode,
  FundingRateSnapshot,
  PlaceOrderRequest,
  PlaceOrderResult,
  TickerSnapshot,
} from './exchange-adapter.interface';
import { toExchangeSymbol } from './instrument-normalizer';

const publicExchanges: ExchangeCode[] = ['binance', 'okx', 'gate'];

@Injectable()
export class PublicMarketDataAdapter implements ExchangeAdapter {
  async getFundingRates(symbols: string[]): Promise<FundingRateSnapshot[]> {
    const snapshots = await Promise.allSettled(
      symbols.flatMap((symbol) => publicExchanges.map((exchange) => this.getFundingRate(symbol, exchange))),
    );

    return snapshots.flatMap((snapshot) => (snapshot.status === 'fulfilled' ? [snapshot.value] : []));
  }

  async getTicker(unifiedSymbol: string, exchange: ExchangeCode): Promise<TickerSnapshot> {
    if (exchange === 'binance') {
      return this.getBinanceTicker(unifiedSymbol);
    }
    if (exchange === 'okx') {
      return this.getOkxTicker(unifiedSymbol);
    }
    if (exchange === 'gate') {
      return this.getGateTicker(unifiedSymbol);
    }

    throw new Error(`Unsupported public market data exchange: ${exchange}`);
  }

  async placeOrder(_request: PlaceOrderRequest): Promise<PlaceOrderResult> {
    const config = getAppConfig();
    if (config.exchangeMode === 'live' && !config.liveTradingEnabled) {
      throw new Error('Live trading is disabled by configuration');
    }

    throw new Error('Authenticated order placement is not implemented for public market data adapter');
  }

  private async getFundingRate(unifiedSymbol: string, exchange: ExchangeCode): Promise<FundingRateSnapshot> {
    if (exchange === 'binance') {
      return this.getBinanceFundingRate(unifiedSymbol);
    }
    if (exchange === 'okx') {
      return this.getOkxFundingRate(unifiedSymbol);
    }
    if (exchange === 'gate') {
      return this.getGateFundingRate(unifiedSymbol);
    }

    throw new Error(`Unsupported public funding exchange: ${exchange}`);
  }

  private async getBinanceFundingRate(unifiedSymbol: string): Promise<FundingRateSnapshot> {
    const symbol = toExchangeSymbol(unifiedSymbol, 'binance');
    const body = await fetchJson<BinancePremiumIndex>(
      `https://fapi.binance.com/fapi/v1/premiumIndex?symbol=${encodeURIComponent(symbol)}`,
    );
    const settlementTime = timestampToIso(body.nextFundingTime);

    return {
      exchange: 'binance',
      unifiedSymbol,
      fundingRate: parseNumber(body.lastFundingRate),
      markPrice: parseNumber(body.markPrice),
      settlementTime,
      nextSettlement: settlementTime,
    };
  }

  private async getOkxFundingRate(unifiedSymbol: string): Promise<FundingRateSnapshot> {
    const symbol = toExchangeSymbol(unifiedSymbol, 'okx');
    const body = await fetchJson<OkxResponse<OkxFundingRate>>(
      `https://www.okx.com/api/v5/public/funding-rate?instId=${encodeURIComponent(symbol)}`,
    );
    const item = firstOkxData(body, 'OKX funding rate not found');
    const ticker = await this.getOkxTickerBody(unifiedSymbol);
    const fundingTime = item.nextFundingTime ?? item.fundingTime ?? ticker.ts;
    const settlementTime = timestampToIso(fundingTime);

    return {
      exchange: 'okx',
      unifiedSymbol,
      fundingRate: parseNumber(item.fundingRate),
      markPrice: parseNumber(ticker.last),
      settlementTime,
      nextSettlement: settlementTime,
    };
  }

  private async getGateFundingRate(unifiedSymbol: string): Promise<FundingRateSnapshot> {
    const contract = toExchangeSymbol(unifiedSymbol, 'gate');
    const body = await fetchJson<GateContract>(
      `https://api.gateio.ws/api/v4/futures/usdt/contracts/${encodeURIComponent(contract)}`,
    );
    const settlementTime = timestampToIsoSeconds(body.funding_next_apply);

    return {
      exchange: 'gate',
      unifiedSymbol,
      fundingRate: parseNumber(body.funding_rate),
      markPrice: parseNumber(body.mark_price),
      settlementTime,
      nextSettlement: settlementTime,
    };
  }

  private async getBinanceTicker(unifiedSymbol: string): Promise<TickerSnapshot> {
    const symbol = toExchangeSymbol(unifiedSymbol, 'binance');
    const [premium, book] = await Promise.all([
      fetchJson<BinancePremiumIndex>(`https://fapi.binance.com/fapi/v1/premiumIndex?symbol=${encodeURIComponent(symbol)}`),
      fetchJson<BinanceBookTicker>(`https://fapi.binance.com/fapi/v1/ticker/bookTicker?symbol=${encodeURIComponent(symbol)}`),
    ]);

    return {
      exchange: 'binance',
      unifiedSymbol,
      markPrice: parseNumber(premium.markPrice),
      bestBid: parseNumber(book.bidPrice),
      bestAsk: parseNumber(book.askPrice),
      bidSize: parseNumber(book.bidQty),
      askSize: parseNumber(book.askQty),
      capturedAt: timestampToIso(book.time ?? premium.time ?? Date.now()),
    };
  }

  private async getOkxTicker(unifiedSymbol: string): Promise<TickerSnapshot> {
    const ticker = await this.getOkxTickerBody(unifiedSymbol);

    return {
      exchange: 'okx',
      unifiedSymbol,
      markPrice: parseNumber(ticker.last),
      bestBid: parseNumber(ticker.bidPx),
      bestAsk: parseNumber(ticker.askPx),
      bidSize: parseNumber(ticker.bidSz),
      askSize: parseNumber(ticker.askSz),
      capturedAt: timestampToIso(ticker.ts),
    };
  }

  private async getOkxTickerBody(unifiedSymbol: string): Promise<OkxTicker> {
    const symbol = toExchangeSymbol(unifiedSymbol, 'okx');
    const body = await fetchJson<OkxResponse<OkxTicker>>(
      `https://www.okx.com/api/v5/market/ticker?instId=${encodeURIComponent(symbol)}`,
    );

    return firstOkxData(body, `OKX ticker not found: ${symbol}`);
  }

  private async getGateTicker(unifiedSymbol: string): Promise<TickerSnapshot> {
    const contract = toExchangeSymbol(unifiedSymbol, 'gate');
    const body = await fetchJson<GateTicker[]>(
      `https://api.gateio.ws/api/v4/futures/usdt/tickers?contract=${encodeURIComponent(contract)}`,
    );
    const ticker = body[0];
    if (!ticker) {
      throw new Error(`Gate ticker not found: ${contract}`);
    }

    return {
      exchange: 'gate',
      unifiedSymbol,
      markPrice: parseNumber(ticker.mark_price || ticker.last),
      bestBid: parseNumber(ticker.highest_bid),
      bestAsk: parseNumber(ticker.lowest_ask),
      bidSize: parseNumber(ticker.highest_size),
      askSize: parseNumber(ticker.lowest_size),
      capturedAt: new Date().toISOString(),
    };
  }
}

type BinancePremiumIndex = {
  markPrice: string;
  lastFundingRate: string;
  nextFundingTime: number;
  time?: number;
};

type BinanceBookTicker = {
  bidPrice: string;
  bidQty: string;
  askPrice: string;
  askQty: string;
  time?: number;
};

type OkxResponse<T> = {
  code: string;
  data?: T[];
};

type OkxFundingRate = {
  fundingRate: string;
  nextFundingTime?: string;
  fundingTime?: string;
};

type OkxTicker = {
  last: string;
  bidPx: string;
  bidSz: string;
  askPx: string;
  askSz: string;
  ts: string;
};

type GateContract = {
  funding_rate: string;
  funding_next_apply: number;
  mark_price: string;
};

type GateTicker = {
  last: string;
  funding_rate: string;
  mark_price: string;
  highest_bid: string;
  highest_size: string;
  lowest_ask: string;
  lowest_size: string;
};

async function fetchJson<T>(url: string): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`Public exchange request failed: ${response.status}`);
    }

    return response.json() as Promise<T>;
  } finally {
    clearTimeout(timeout);
  }
}

function firstOkxData<T>(body: OkxResponse<T>, message: string): T {
  const item = body.data?.[0];
  if (!item || body.code !== '0') {
    throw new Error(message);
  }

  return item;
}

function parseNumber(value: string | number | undefined): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid numeric exchange value: ${String(value)}`);
  }

  return parsed;
}

function timestampToIso(value: string | number | undefined): string {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return new Date().toISOString();
  }

  return new Date(parsed).toISOString();
}

function timestampToIsoSeconds(value: string | number | undefined): string {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return new Date().toISOString();
  }

  return new Date(parsed * 1000).toISOString();
}
