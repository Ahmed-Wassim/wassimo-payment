import { Body, Controller, HttpStatus, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiKeyGuard } from '../auth/api-key.guard.ts';
import { AuthContext } from '../auth/auth-context.ts';
import { ApiError } from '../../common/errors/api-error.ts';
import { isUuid } from '../../common/utils/is-uuid.ts';
import { CreateRefundDto } from './dto/create-refund.dto.ts';
import { RefundsService } from './refunds.service.ts';
import { toRefundModel } from './mappers/refund.mapper.ts';

@Controller()
@UseGuards(ApiKeyGuard)
export class RefundsController {
  constructor(private readonly refunds: RefundsService) {}

  @Post('v1/payments/:id/refunds')
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
        'refund lost the availability race — resolve its record for the provider-side truth',
        { refund_id: refund.id },
      );
    }
    return toRefundModel(refund);
  }

  @Post('v1/payments/:id/refunds/:rid/resolve')
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
        'resolved refund lost the availability race — reconcile (§9.5)',
        { refund_id: refund.id },
      );
    }
    return toRefundModel(refund);
  }
}
