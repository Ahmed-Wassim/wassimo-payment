import {
  Body,
  Controller,
  Headers,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiKeyGuard } from '../auth/api-key.guard.ts';
import { AuthContext } from '../auth/auth-context.ts';
import { ApiError } from '../common/api-error.ts';
import { IdempotencyService } from '../idempotency/idempotency.service.ts';
import { PaymentsService } from './payments.service.ts';
import { toPaymentModel } from './payment.model.ts';
import { CreatePaymentDto } from './dto/create-payment.dto.ts';

@Controller()
@UseGuards(ApiKeyGuard)
export class PaymentsController {
  constructor(
    private readonly payments: PaymentsService,
    private readonly idempotency: IdempotencyService,
  ) {}

  @Post('v1/payments')
  async create(
    @Req() req: { auth?: AuthContext },
    @Body() dto: CreatePaymentDto,
    @Headers('Idempotency-Key') idemKey?: string,
  ) {
    const id = idemKey
      ? (
          await this.idempotency.execute(
            req.auth!,
            idemKey,
            this.idempotency.fingerprint(dto),
            (tx) => this.payments.createInTx(tx, req.auth!, dto),
          )
        ).id
      : (await this.payments.create(req.auth!, dto)).id;

    const payment = await this.payments.loadById(id);
    if (!payment) {
      throw new ApiError('not_found', HttpStatus.NOT_FOUND, 'payment not found');
    }
    return toPaymentModel(payment);
  }
}
