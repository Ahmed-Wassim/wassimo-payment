import { Currency } from '../entities/currency.entity.ts';

export class CurrencyModel {
  id!: number;
  code!: string;
  exponent!: number;
  symbol!: string;
  symbolUrl!: string | null;
  enabled!: boolean;
  createdAt!: Date;
}

export function toCurrencyModel(row: Currency): CurrencyModel {
  return {
    id: row.id,
    code: row.code,
    exponent: row.exponent,
    symbol: row.symbol,
    symbolUrl: row.symbolUrl,
    enabled: row.enabled,
    createdAt: row.createdAt,
  };
}
