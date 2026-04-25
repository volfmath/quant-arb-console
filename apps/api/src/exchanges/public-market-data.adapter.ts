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

const publicExchanges: ExchangeCode[] = ['binance', 'bybit', 'okx'];

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
    if (exchange === 'bybit') {
      return this.getBybitTicker(unifiedSymbol);
    }
    if (exchange === 'okx') {
      return this.getOkxTicker(unifiedSymbol);
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
    if (exchange === 'bybit') {
      return this.getBybitFundingRate(unifiedSymbol);
    }
    if (exchange === 'okx') {
      return this.getOkxFundingRate(unifiedSymbol);
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

  private async getBybitFundingRate(unifiedSymbol: string): Promise<FundingRateSnapshot> {
    const ticker = await this.getBybitTickerBody(unifiedSymbol);
    const settlementTime = timestampToIso(ticker.nextFundingTime);

    return {
      exchange: 'bybit',
      unifiedSymbol,
      fundingRate: parseNumber(ticker.fundingRate),
      markPrice: parseNumber(ticker.markPrice || ticker.lastPrice),
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

  private async getBybitTicker(unifiedSymbol: string): Promise<TickerSnapshot> {
    const ticker = await this.getBybitTickerBody(unifiedSymbol);

    return {
      exchange: 'bybit',
      unifiedSymbol,
      markPrice: parseNumber(ticker.markPrice || ticker.lastPrice),
      bestBid: parseNumber(ticker.bid1Price),
      bestAsk: parseNumber(ticker.ask1Price),
      bidSize: parseNumber(ticker.bid1Size),
      askSize: parseNumber(ticker.ask1Size),
      capturedAt: timestampToIso(ticker.ts ?? Date.now()),
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

  private async getBybitTickerBody(unifiedSymbol: string): Promise<BybitTicker> {
    const symbol = toExchangeSymbol(unifiedSymbol, 'bybit');
    const body = await fetchJson<BybitResponse<BybitTicker>>(
      `https://api.bybit.com/v5/market/tickers?category=linear&symbol=${encodeURIComponent(symbol)}`,
    );
    const item = body.result?.list?.[0];
    if (!item || body.retCode !== 0) {
      throw new Error(`Bybit ticker not found: ${symbol}`);
    }

    return item;
  }

  private async getOkxTickerBody(unifiedSymbol: string): Promise<OkxTicker> {
    const symbol = toExchangeSymbol(unifiedSymbol, 'okx');
    const body = await fetchJson<OkxResponse<OkxTicker>>(
      `https://www.okx.com/api/v5/market/ticker?instId=${encodeURIComponent(symbol)}`,
    );

    return firstOkxData(body, `OKX ticker not found: ${symbol}`);
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

type BybitResponse<T> = {
  retCode: number;
  result?: {
    list?: T[];
  };
};

type BybitTicker = {
  lastPrice: string;
  markPrice?: string;
  fundingRate: string;
  nextFundingTime: string;
  bid1Price: string;
  bid1Size: string;
  ask1Price: string;
  ask1Size: string;
  ts?: string;
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
