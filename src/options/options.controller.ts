import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { ApiKeyGuard } from '../auth/api-key.guard.ts';
import { AuthContext } from '../auth/auth-context.ts';
import { ProvidersService } from '../providers/providers.service.ts';

@Controller()
export class OptionsController {
  constructor(private readonly providers: ProvidersService) {}

  @Get('v1/options')
  @UseGuards(ApiKeyGuard)
  async options(
    @Req() req: { auth?: AuthContext },
    @Query('currency') currency?: string,
    @Query('method') method?: string,
  ) {
    const auth = req.auth!;
    const accounts = await this.providers.findForContext(
      {
        organizationId: auth.organizationId,
        applicationId: auth.applicationId,
      },
      {
        currency: currency?.toUpperCase(),
        method: method?.toLowerCase(),
      },
    );
    return {
      organization: auth.organizationId,
      generated_at: new Date().toISOString(),
      options: accounts.map((account) => ({
        provider_account_id: account.id,
        gateway: account.providerCode,
        display_name: account.displayName,
        methods: account.supportedMethods,
        currencies: account.supportedCurrencies,
      })),
    };
  }
}
