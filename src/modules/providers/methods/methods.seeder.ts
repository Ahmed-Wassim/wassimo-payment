import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Provider } from '../provider.entity.ts';
import { PROVIDER_CATALOGUES } from './methods.constant.ts';

@Injectable()
export class ProviderMethodsSeeder {
  constructor(
    @InjectRepository(Provider)
    private readonly providerRepo: Repository<Provider>,
  ) {}

  async seed() {
    for (const catalogue of PROVIDER_CATALOGUES) {
      await this.providerRepo.upsert(
        {
          code: catalogue.code,
          name: catalogue.name,
          methods: [...catalogue.methods],
        },
        ['code'],
      );
    }
  }
}
