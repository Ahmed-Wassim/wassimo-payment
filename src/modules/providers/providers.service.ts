import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Provider } from './provider.entity.ts';
import { toProviderModel } from './provider.mapper.ts';

@Injectable()
export class ProvidersService {
  constructor(
    @InjectRepository(Provider)
    private readonly providers: Repository<Provider>,
  ) {}

  async listProviders() {
    const rows = await this.providers.find({ order: { code: 'ASC' } });
    return rows.map((row) => toProviderModel(row));
  }

  async requireByCode(code: string): Promise<Provider> {
    const row = await this.providers.findOne({ where: { code } });
    if (!row) throw new NotFoundException(`Provider not found: ${code}`);
    return row;
  }
}
