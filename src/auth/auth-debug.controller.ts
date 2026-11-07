import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ApiKeyGuard } from './api-key.guard.ts';

@Controller()
@UseGuards(ApiKeyGuard)
export class AuthDebugController {
  @Get('v1/ping')
  ping(
    @Req() req: { auth?: { organizationId: string; applicationId: string } },
  ) {
    return {
      organization: req.auth?.organizationId,
      application: req.auth?.applicationId,
    };
  }
}
