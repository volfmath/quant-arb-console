import { describe, expect, it } from 'vitest';
import { normalizeInstrumentSymbol, toExchangeSymbol } from '../src/exchanges/instrument-normalizer';

describe('instrument normalizer', () => {
  it.each([
    ['BTC', 'BTC/USDT:USDT'],
    ['BTCUSDT', 'BTC/USDT:USDT'],
    ['BTC/USDT:USDT', 'BTC/USDT:USDT'],
    ['BTC-USDT-SWAP', 'BTC/USDT:USDT'],
    ['eth-usdc-perp', 'ETH/USDC:USDC'],
  ])('normalizes %s to %s', (input, expected) => {
    expect(normalizeInstrumentSymbol(input).unifiedSymbol).toBe(expected);
  });

  it('formats exchange-specific symbols for mock exchange examples', () => {
    expect(toExchangeSymbol('BTC/USDT:USDT', 'binance')).toBe('BTCUSDT');
    expect(toExchangeSymbol('BTC/USDT:USDT', 'bybit')).toBe('BTCUSDT');
    expect(toExchangeSymbol('BTC/USDT:USDT', 'okx')).toBe('BTC-USDT-SWAP');
    expect(toExchangeSymbol('BTC/USDT:USDT', 'gate')).toBe('BTC_USDT');
  });
});
