import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Currency } from './currency.entity.ts';

@Injectable()
export class CurrenciesService {
  constructor(
    @InjectRepository(Currency)
    private readonly repo: Repository<Currency>,
  ) {}

  async requireEnabled(code: string): Promise<Currency> {
    const c = await this.repo.findOne({
      where: { code: code.toUpperCase().trim() },
    });
    if (!c) throw new NotFoundException(`unknown currency ${code}`);
    if (!c.enabled) throw new BadRequestException(`currency ${code} not enabled`);
    return c;
  }

  // 17000 with exponent 2 → "170.00"  (providers wanting decimals, §4.6)
  // 500   with exponent 0 → "500"     (JPY-style, if ever registered)
  // Pure INTEGER math — no /100, no toFixed, no IEEE-754 anywhere.
  minorToDecimal(minor: bigint | string, exponent: number): string {
    const minorBig = typeof minor === 'string' ? BigInt(minor) : minor;
    if (exponent === 0) return minorBig.toString();
    const scale = 10n ** BigInt(exponent);
    const negative = minorBig < 0n;
    const abs = negative ? -minorBig : minorBig;
    const units = abs / scale;
    const remainder = abs % scale;
    return `${negative ? '-' : ''}${units}.${remainder.toString().padStart(exponent, '0')}`;
  }
}
