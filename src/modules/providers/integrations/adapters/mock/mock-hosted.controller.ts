import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { MockButton, MockHostedService } from './mock-hosted.service.ts';

@Controller('mock/hosted')
export class MockHostedController {
  constructor(private readonly hosted: MockHostedService) {}

  @Get(':ref')
  page(@Param('ref') sessionRef: string, @Res() res: Response): void {
    const session = this.hosted.get(sessionRef);
    if (!session) {
      res
        .status(404)
        .type('html')
        .send('<html><body><h3>unknown session</h3></body></html>');
      return;
    }

    const customer = session.customer;
    const customerHtml = customer
      ? `<p>Customer: ${customer.name ?? ''} &lt;${customer.email ?? ''}&gt;</p>
        ${customer.phone ? `<p>Phone: ${customer.phone}</p>` : ''}
        ${customer.street || customer.city || customer.state || customer.country || customer.zip
          ? `<p>Address: ${[customer.street, customer.city, customer.state, customer.zip, customer.country].filter(Boolean).join(', ')}</p>`
          : ''}`
      : '<p>Customer: (none provided)</p>';

    res.type('html').send(`<!doctype html>
      <html><body style="font-family:sans-serif;max-width:480px;margin:3rem auto">
        <h3>Mock Provider — hosted checkout</h3>
        <p>Amount: ${session.amountMinor.toString()} ${session.currency} (minor units)</p>
        <p>Method: ${session.method}</p>
        ${customerHtml}
        <p>Session: ${session.sessionRef}</p>
        <form method="post" action="/mock/hosted/${session.sessionRef}/complete">
          <button name="outcome" value="approve" type="submit">Approve</button>
          <button name="outcome" value="decline" type="submit">Decline</button>
          <button name="outcome" value="approve-lost" type="submit">Approve (webhook lost)</button>
        </form>
      </body></html>`);
  }

  @Post(':ref/complete')
  complete(
    @Param('ref') sessionRef: string,
    @Query('outcome') outcome: string | undefined,
    @Res() res: Response,
  ): void {
    if (
      outcome !== 'approve' &&
      outcome !== 'decline' &&
      outcome !== 'approve-lost'
    ) {
      throw new NotFoundException(`unknown outcome ${outcome ?? ''}`);
    }

    const session = this.hosted.completeOutcome(
      sessionRef,
      outcome as MockButton,
    );
    res.type('html').send(`<!doctype html>
      <html><body style="font-family:sans-serif;max-width:480px;margin:3rem auto">
        <h3>Mock Provider — completed</h3>
        <p>Session: ${session.sessionRef}</p>
        <p>Outcome: ${session.outcome}</p>
        <p>Webhook delivered: ${session.webhookDelivered}</p>
      </body></html>`);
  }
}
