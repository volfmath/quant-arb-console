export type ExchangeCode = 'binance' | 'bybit' | 'okx' | 'gate' | 'mexc';

export type FundingRateSnapshot = {
  exchange: ExchangeCode;
  unifiedSymbol: string;
  fundingRate: number;
  markPrice: number;
  settlementTime: string;
  nextSettlement: string;
};

export type TickerSnapshot = {
  exchange: ExchangeCode;
  unifiedSymbol: string;
  markPrice: number;
  bestBid: number;
  bestAsk: number;
  bidSize: number;
  askSize: number;
  capturedAt: string;
};

export type PlaceOrderRequest = {
  exchange: ExchangeCode;
  unifiedSymbol: string;
  side: 'buy' | 'sell';
  positionSide: 'long' | 'short';
  orderType: 'limit' | 'market';
  qty: number;
  price?: number;
  clientOrderId: string;
};

export type PlaceOrderResult = {
  exchangeOrderId: string;
  status: 'submitted';
  submittedAt: string;
};

export interface ExchangeAdapter {
  getFundingRates(symbols: string[]): Promise<FundingRateSnapshot[]>;
  getTicker(unifiedSymbol: string, exchange: ExchangeCode): Promise<TickerSnapshot>;
  placeOrder(request: PlaceOrderRequest): Promise<PlaceOrderResult>;
}

export const EXCHANGE_ADAPTER = Symbol('EXCHANGE_ADAPTER');

