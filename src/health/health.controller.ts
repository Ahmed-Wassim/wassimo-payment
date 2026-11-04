import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Controller()
export class HealthController {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  @Get('health')
  health() {
    return { status: 'ok', service: 'wassimo-payment' };
  }

  @Get('ready')
  async ready() {
    try {
      await this.dataSource.query('SELECT 1');
      return {
        status: 'ok',
        service: 'wassimo-payment',
        checks: {
          database: 'available',
        },
      };
    } catch {
      throw new ServiceUnavailableException({
        status: 'error',
        service: 'wassimo-payment',
        checks: { database: 'down' },
      });
    }
  }
}
