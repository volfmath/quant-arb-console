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

const supportedExchanges: ExchangeCode[] = ['binance', 'bybit', 'okx'];

@Injectable()
export class MockExchangeAdapter implements ExchangeAdapter {
  async getFundingRates(symbols: string[]): Promise<FundingRateSnapshot[]> {
    const now = new Date();
    const settlement = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const nextSettlement = new Date(settlement.getTime() + 8 * 60 * 60 * 1000);

    return symbols.flatMap((unifiedSymbol, symbolIndex) =>
      supportedExchanges.map((exchange, exchangeIndex) => ({
        exchange,
        unifiedSymbol,
        fundingRate: roundRate((exchangeIndex - 1) * 0.00008 + symbolIndex * 0.00001),
        markPrice: 60000 + symbolIndex * 1000 + exchangeIndex * 10,
        settlementTime: settlement.toISOString(),
        nextSettlement: nextSettlement.toISOString(),
      })),
    );
  }

  async getTicker(unifiedSymbol: string, exchange: ExchangeCode): Promise<TickerSnapshot> {
    const exchangeOffset = supportedExchanges.indexOf(exchange);
    const markPrice = 60000 + Math.max(exchangeOffset, 0) * 10;

    return {
      exchange,
      unifiedSymbol,
      markPrice,
      bestBid: markPrice - 1,
      bestAsk: markPrice + 1,
      bidSize: 125.5,
      askSize: 118.25,
      capturedAt: new Date().toISOString(),
    };
  }

  async placeOrder(request: PlaceOrderRequest): Promise<PlaceOrderResult> {
    const config = getAppConfig();
    if (config.exchangeMode === 'live' && !config.liveTradingEnabled) {
      throw new Error('Live trading is disabled by configuration');
    }

    return {
      exchangeOrderId: `mock-${request.clientOrderId}`,
      status: 'submitted',
      submittedAt: new Date().toISOString(),
    };
  }
}

function roundRate(value: number): number {
  return Number(value.toFixed(8));
}

