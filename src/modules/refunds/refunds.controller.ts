import { Body, Controller, HttpStatus, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiKeyGuard } from '../auth/api-key.guard.ts';
import { ApiScope } from '../auth/api-scope.decorator.ts';
import { AuthContext } from '../auth/auth-context.ts';
import { ActorContext, JwtGuard } from '../auth/jwt.guard.ts';
import { PermissionGuard } from '../auth/permission.guard.ts';
import { Permission } from '../auth/permission.decorator.ts';
import { ApiError } from '../../common/errors/api-error.ts';
import { isUuid } from '../../common/utils/is-uuid.ts';
import { CreateRefundDto } from './dto/create-refund.dto.ts';
import { RefundsService } from './refunds.service.ts';
import { toRefundModel } from './mappers/refund.mapper.ts';

@Controller()
export class RefundsController {
  constructor(private readonly refunds: RefundsService) {}

  @Post('v1/payments/:id/refunds')
  @UseGuards(ApiKeyGuard)
  @ApiScope('refunds:create')
  async request(
    @Req() req: { auth?: AuthContext },
    @Param('id') id: string,
    @Body() dto: CreateRefundDto,
  ) {
    if (!isUuid(id)) {
      throw new ApiError('validation_error', HttpStatus.BAD_REQUEST, 'malformed payment id');
    }
    const { refund, raceLost } = await this.refunds.request(req.auth!, id, {
      amount_minor: dto.amount_minor,
      reason: dto.reason,
    });
    if (raceLost) {
      throw new ApiError(
        'refund_not_allowed',
        HttpStatus.CONFLICT,
        'provider refund succeeded but local balance could not be confirmed; reconcile with provider records',
        { refund_id: refund.id },
      );
    }
    return toRefundModel(refund);
  }

  @Post('v1/payments/:id/refunds/:rid/resolve')
  @UseGuards(ApiKeyGuard)
  @ApiScope('refunds:resolve')
  async resolve(
    @Req() req: { auth?: AuthContext },
    @Param('id') id: string,
    @Param('rid') refundId: string,
  ) {
    if (!isUuid(id) || !isUuid(refundId)) {
      throw new ApiError('validation_error', HttpStatus.BAD_REQUEST, 'malformed refund path');
    }
    const { refund, raceLost } = await this.refunds.resolve(req.auth!, id, refundId);
    if (raceLost) {
      throw new ApiError(
        'refund_not_allowed',
        HttpStatus.CONFLICT,
        'provider refund succeeded but local balance could not be confirmed; reconcile with provider records',
        { refund_id: refund.id },
      );
    }
    return toRefundModel(refund);
  }

  @Post('payments/:id/refunds')
  @UseGuards(JwtGuard, PermissionGuard)
  @Permission('payments:refund')
  async createManualRefund(
    @Req() req: { actor: ActorContext },
    @Param('id') id: string,
    @Body() dto: CreateRefundDto,
  ) {
    if (!isUuid(id)) {
      throw new ApiError('validation_error', HttpStatus.BAD_REQUEST, 'malformed payment id');
    }
    if (!req.actor.organizationId) {
      throw new ApiError('validation_error', HttpStatus.BAD_REQUEST, 'organization context is required');
    }
    const { refund, raceLost } = await this.refunds.request(
      { organizationId: req.actor.organizationId },
      id,
      { amount_minor: dto.amount_minor, reason: dto.reason },
    );
    if (raceLost) {
      throw new ApiError(
        'refund_not_allowed',
        HttpStatus.CONFLICT,
        'provider refund succeeded but local balance could not be confirmed; reconcile with provider records',
        { refund_id: refund.id },
      );
    }
    return toRefundModel(refund);
  }
}
