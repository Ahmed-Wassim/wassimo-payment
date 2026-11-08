import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
    if (!c.enabled)
      throw new BadRequestException(`currency ${code} not enabled`);
    return c;
  }

  findAll() {
    return this.repo.find({ order: { code: 'ASC' } });
  }

  async findByCode(code: string): Promise<Currency> {
    return this.requireEnabled(code);
  }

  async create(dto: {
    code: string;
    exponent: number;
    symbol: string;
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
      enabled: dto.enabled ?? true,
    });
    return this.repo.save(currency);
  }

  async update(code: string, dto: { symbol?: string; enabled?: boolean }) {
    const normalized = code.toUpperCase().trim();
    const currency = await this.repo.findOne({ where: { code: normalized } });

    if (!currency) {
      throw new NotFoundException(`unknown currency ${code}`);
    }

    if (dto.symbol !== undefined) currency.symbol = dto.symbol;
    if (dto.enabled !== undefined) currency.enabled = dto.enabled;

    return this.repo.save(currency);
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
}
