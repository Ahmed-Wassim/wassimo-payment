import {
  Body,
  Controller,
  Get,
  Headers,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiKeyGuard } from '../auth/api-key.guard.ts';
import { ApiScope } from '../auth/api-scope.decorator.ts';
import { AuthContext } from '../auth/auth-context.ts';
import { ActorContext, JwtGuard } from '../auth/jwt.guard.ts';
import { PermissionGuard } from '../auth/permission.guard.ts';
import { Permission } from '../auth/permission.decorator.ts';
import { ApiError } from '../../common/errors/api-error.ts';
import { FilterDto } from '../../common/dto/filter.dto.ts';
import { IdempotencyService } from '../idempotency/idempotency.service.ts';
import { ChargeService } from './charge.service.ts';
import { ResolutionService } from './resolution.service.ts';
import { PaymentsService } from './payments.service.ts';
import { toPaymentModel } from './mappers/payment.mapper.ts';
import { CreatePaymentDto } from './dto/create-payment.dto.ts';

@Controller()
export class PaymentsController {
  constructor(
    private readonly payments: PaymentsService,
    private readonly idempotency: IdempotencyService,
    private readonly charge: ChargeService,
    private readonly resolution: ResolutionService,
  ) {}

  @Post('v1/payments')
  @UseGuards(ApiKeyGuard)
  @ApiScope('payments:create')
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
        (tx) => this.payments.createPayment(tx, req.auth!, dto),
      )
    ).id;

    const payment = await this.payments.loadById(id, req.auth!);
    if (!payment) {
      throw new ApiError('not_found', HttpStatus.NOT_FOUND, 'payment not found');
    }
    return toPaymentModel(payment, await this.payments.customerFor(id));
  }

  @Get('v1/payments/:id')
  @UseGuards(ApiKeyGuard)
  @ApiScope('payments:read')
  async get(@Req() req: { auth?: AuthContext }, @Param('id') id: string) {
    const payment = await this.payments.requireById(id, req.auth!);

    return toPaymentModel(payment, await this.payments.customerFor(id));
  }

  @Post('v1/payments/:id/charge')
  @UseGuards(ApiKeyGuard)
  @ApiScope('payments:charge')
  async chargePayment(
    @Req() req: { auth?: AuthContext },
    @Param('id') id: string,
    @Body() body?: { return_url?: string },
  ) {
    const returnUrl = typeof body?.return_url === 'string' && body.return_url.trim() !== '' ? body.return_url.trim() : null;
    return this.charge.charge(req.auth!, id, returnUrl);
  }

  @Post('v1/payments/:id/resolve')
  @UseGuards(ApiKeyGuard)
  @ApiScope('payments:resolve')
  async resolvePayment(
    @Req() req: { auth?: AuthContext },
    @Param('id') id: string,
  ) {
    const payment = await this.resolution.resolve(req.auth!, id);
    return toPaymentModel(payment, await this.payments.customerFor(id));
  }

  @Get('payments')
  @UseGuards(JwtGuard, PermissionGuard)
  @Permission('payments:read')
  listPayments(
    @Req() req: { actor: ActorContext },
    @Query() filter: FilterDto,
  ) {
    return this.payments.listForActor(req.actor, filter);
  }

  @Get('payments/:id')
  @UseGuards(JwtGuard, PermissionGuard)
  @Permission('payments:read')
  getPayment(@Req() req: { actor: ActorContext }, @Param('id') id: string) {
    return this.payments.requireByIdForActor(req.actor, id);
  }
}
