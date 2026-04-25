import type { ExchangeCode } from './exchange-adapter.interface';

export type NormalizedInstrument = {
  base: string;
  quote: string;
  settlement: string;
  unifiedSymbol: string;
};

const knownQuotes = ['USDT', 'USDC', 'USD'];

export function normalizeInstrumentSymbol(symbol: string): NormalizedInstrument {
  const raw = symbol.trim().toUpperCase();
  if (!raw) {
    throw new Error('Instrument symbol is required');
  }

  const withoutPerpSuffix = raw.replace(/[-_:]?(SWAP|PERP|PERPETUAL)$/u, '');
  const slashMatch = withoutPerpSuffix.match(/^([A-Z0-9]+)\/([A-Z0-9]+)(?::([A-Z0-9]+))?$/u);
  if (slashMatch) {
    return buildInstrument(slashMatch[1]!, slashMatch[2]!, slashMatch[3] ?? slashMatch[2]!);
  }

  const dashParts = withoutPerpSuffix.split('-').filter(Boolean);
  if (dashParts.length >= 2) {
    return buildInstrument(dashParts[0]!, dashParts[1]!, dashParts[2] ?? dashParts[1]!);
  }

  const compact = withoutPerpSuffix.replace(/[^A-Z0-9]/gu, '');
  const quote = knownQuotes.find((candidate) => compact.endsWith(candidate));
  if (quote && compact.length > quote.length) {
    return buildInstrument(compact.slice(0, -quote.length), quote, quote);
  }

  return buildInstrument(compact, 'USDT', 'USDT');
}

export function toExchangeSymbol(unifiedSymbol: string, exchange: ExchangeCode): string {
  const instrument = normalizeInstrumentSymbol(unifiedSymbol);
  if (exchange === 'okx') {
    return `${instrument.base}-${instrument.quote}-SWAP`;
  }

  return `${instrument.base}${instrument.quote}`;
}

function buildInstrument(base: string, quote: string, settlement: string): NormalizedInstrument {
  return {
    base,
    quote,
    settlement,
    unifiedSymbol: `${base}/${quote}:${settlement}`,
  };
}
