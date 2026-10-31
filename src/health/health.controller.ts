import { Controller, Get } from '@nestjs/common';

@Controller()
export class HealthController {
  @Get('health')
  health() {
    return { status: 'ok', service: 'wassimo-payment' };
  }

  @Get('ready')
  ready() {
    return {
      status: 'ok',
      service: 'wassimo-payment',
      checks: {
        database: 'not yet',
      },
    };
  }
}
