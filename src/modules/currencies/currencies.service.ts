import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Currency } from './entities/currency.entity.ts';
import { toCurrencyModel } from './mappers/currency.mapper.ts';

@Injectable()
export class CurrenciesService {
  constructor(
    @InjectRepository(Currency)
    private readonly repo: Repository<Currency>,
  ) {}

  async requireEnabled(code: string): Promise<Currency> {
    const currency = await this.repo.findOne({
      where: { code: code.toUpperCase().trim() },
    });
    if (!currency) throw new NotFoundException(`unknown currency ${code}`);
    if (!currency.enabled)
      throw new BadRequestException(`currency ${code} not enabled`);
    return currency;
  }

  findAll() {
    return this.repo
      .find({ order: { code: 'ASC' } })
      .then((rows) => rows.map((row) => toCurrencyModel(row)));
  }

  async findByCode(code: string) {
    return toCurrencyModel(await this.requireEnabled(code));
  }

  async create(dto: {
    code: string;
    exponent: number;
    symbol: string;
    symbolUrl?: string;
    enabled?: boolean;
  }) {
    const exists = await this.repo.findOne({ where: { code: dto.code } });

    if (exists) {
      throw new ConflictException(`currency ${dto.code} already exists`);
    }

    const currency = this.repo.create({
      code: dto.code.toUpperCase().trim(),
      exponent: dto.exponent,
      symbol: dto.symbol,
      symbolUrl: dto.symbolUrl ?? null,
      enabled: dto.enabled ?? true,
    });
    const saved = await this.repo.save(currency);
    return toCurrencyModel(saved);
  }

  async update(
    code: string,
    dto: {
      symbol?: string;
      symbolUrl?: string | null;
      enabled?: boolean;
    },
  ) {
    const normalized = code.toUpperCase().trim();
    const currency = await this.repo.findOne({ where: { code: normalized } });

    if (!currency) {
      throw new NotFoundException(`unknown currency ${code}`);
    }

    if (dto.symbol !== undefined) currency.symbol = dto.symbol;
    if (dto.symbolUrl !== undefined) currency.symbolUrl = dto.symbolUrl;
    if (dto.enabled !== undefined) currency.enabled = dto.enabled;

    const saved = await this.repo.save(currency);
    return toCurrencyModel(saved);
  }

  async remove(code: string) {
    const normalized = code.toUpperCase().trim();
    const currency = await this.repo.findOne({ where: { code: normalized } });

    if (!currency) {
      throw new NotFoundException(`unknown currency ${code}`);
    }

    await this.repo.remove(currency);
    return { deleted: true, code: normalized };
  }

  minorToDecimal(
    amountMinor: bigint,
    exponent: number,
  ): string {
    const digits = amountMinor.toString().padStart(exponent + 1, '0');
    return exponent === 0
      ? digits
      : `${digits.slice(0, -exponent)}.${digits.slice(-exponent)}`;
  }
}
