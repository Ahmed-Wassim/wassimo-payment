import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ApiKeyGuard } from '../auth/api-key.guard.ts';
import { AuthContext } from '../auth/auth-context.ts';
import { PaymentsService } from './payments.service.ts';
import { CreatePaymentDto } from './dto/create-payment.dto.ts';

@Controller()
@UseGuards(ApiKeyGuard)
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post('v1/payments')
  async create(@Req() req: { auth?: AuthContext }, @Body() dto: CreatePaymentDto) {
    return this.payments.create(req.auth!, dto);
  }
}
