import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Provider } from '../entities/provider.entity.ts';
import { PROVIDER_CATALOGUES } from '../constants/providers-methods.constant.ts';

@Injectable()
export class ProviderMethodsSeeder {
  private readonly logger = new Logger(ProviderMethodsSeeder.name);

  constructor(
    @InjectRepository(Provider)
    private readonly providerRepo: Repository<Provider>,
  ) {}

  async seed() {
    this.logger.log('Seeding provider catalogues...');

    for (const catalogue of PROVIDER_CATALOGUES) {
      const existing = await this.providerRepo.findOne({
        where: { code: catalogue.code },
      });
      if (existing) {
        if (existing.methods.length === 0) {
          existing.methods = [...catalogue.methods];
          await this.providerRepo.save(existing);
          this.logger.log(
            `Seeded ${catalogue.methods.length} methods for ${catalogue.code}`,
          );
        }
        continue;
      }
      await this.providerRepo.insert({
        code: catalogue.code,
        name: catalogue.name,
        methods: [...catalogue.methods],
      });
      this.logger.log(
        `Created ${catalogue.code} with ${catalogue.methods.length} methods`,
      );
    }

    this.logger.log('Provider catalogues seeding completed');
  }
}
