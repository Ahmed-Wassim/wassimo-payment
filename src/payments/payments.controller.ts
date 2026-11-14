import {
  Body,
  Controller,
  Get,
  Headers,
  HttpStatus,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiKeyGuard } from '../auth/api-key.guard.ts';
import { AuthContext } from '../auth/auth-context.ts';
import { ApiError } from '../common/api-error.ts';
import { IdempotencyService } from '../idempotency/idempotency.service.ts';
import { ChargeService } from './charge.service.ts';
import { ResolutionService } from './resolution.service.ts';
import { PaymentsService } from './payments.service.ts';
import { toPaymentModel } from './payment.model.ts';
import { CreatePaymentDto } from './dto/create-payment.dto.ts';
import { isUuid } from './uuid.ts';

@Controller()
@UseGuards(ApiKeyGuard)
export class PaymentsController {
  constructor(
    private readonly payments: PaymentsService,
    private readonly idempotency: IdempotencyService,
    private readonly charge: ChargeService,
    private readonly resolution: ResolutionService,
  ) {}

  @Post('v1/payments')
  async create(
    @Req() req: { auth?: AuthContext },
    @Body() dto: CreatePaymentDto,
    @Headers('Idempotency-Key') idemKey?: string,
  ) {
    if (!idemKey?.trim()) {
      throw new ApiError(
        'validation_error',
        HttpStatus.BAD_REQUEST,
        'Idempotency-Key header is required',
      );
    }

    const id = (
      await this.idempotency.execute(
        req.auth!,
        idemKey,
        this.idempotency.fingerprint(dto),
        (tx) => this.payments.createInTx(tx, req.auth!, dto),
      )
    ).id;

    const payment = await this.payments.loadById(id);
    if (!payment) {
      throw new ApiError('not_found', HttpStatus.NOT_FOUND, 'payment not found');
    }
    return toPaymentModel(payment, await this.payments.customerFor(id));
  }

  @Get('v1/payments/:id')
  async get(@Req() req: { auth?: AuthContext }, @Param('id') id: string) {
    if (!isUuid(id)) {
      throw new ApiError(
        'validation_error',
        HttpStatus.BAD_REQUEST,
        'malformed payment id',
      );
    }

    const payment = await this.payments.loadById(id);
    if (!payment || payment.organizationId !== req.auth!.organizationId) {
      throw new ApiError('not_found', HttpStatus.NOT_FOUND, 'payment not found');
    }

    return toPaymentModel(payment, await this.payments.customerFor(id));
  }

  @Post('v1/payments/:id/charge')
  async chargePayment(
    @Req() req: { auth?: AuthContext },
    @Param('id') id: string,
  ) {
    return this.charge.charge(req.auth!, id);
  }

  @Post('v1/payments/:id/resolve')
  async resolvePayment(
    @Req() req: { auth?: AuthContext },
    @Param('id') id: string,
  ) {
    const payment = await this.resolution.resolve(req.auth!, id);
    return toPaymentModel(payment, await this.payments.customerFor(id));
  }
}
