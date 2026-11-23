import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Currency } from '../entities/currency.entity.ts';

const CURRENCIES = [
  {
    code: 'EGP',
    exponent: 2,
    symbol: 'E£',
    symbolUrl: 'https://api.iconify.design/tabler/currency-pound.svg',
  },
  {
    code: 'SAR',
    exponent: 2,
    symbol: '﷼',
    symbolUrl: 'https://api.iconify.design/hugeicons/saudi-riyal.svg',
  },
  {
    code: 'USD',
    exponent: 2,
    symbol: '$',
    symbolUrl: 'https://api.iconify.design/mdi/currency-usd.svg',
  },
  {
    code: 'EUR',
    exponent: 2,
    symbol: '€',
    symbolUrl: 'https://api.iconify.design/mdi/currency-eur.svg',
  },
  {
    code: 'AED',
    exponent: 2,
    symbol: 'د.إ',
    symbolUrl: 'https://api.iconify.design/tabler/currency-dirham.svg',
  },
];

@Injectable()
export class CurrenciesSeeder {
  private readonly logger = new Logger(CurrenciesSeeder.name);

  constructor(
    @InjectRepository(Currency)
    private readonly currencyRepo: Repository<Currency>,
  ) {}

  async seed(): Promise<void> {
    this.logger.log('Seeding currencies...');

    for (const currency of CURRENCIES) {
      const exists = await this.currencyRepo.findOne({
        where: { code: currency.code },
      });
      if (exists) continue;

      await this.currencyRepo.insert(currency);
      this.logger.log(`Created currency: ${currency.code}`);
    }

    this.logger.log('Currencies seeding completed');
  }
}
