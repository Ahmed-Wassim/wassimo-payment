import {
  BadRequestException,
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
}
