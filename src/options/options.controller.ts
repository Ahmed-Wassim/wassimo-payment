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
    const accounts = await this.providers.findEnabledForOrg(
      auth.organizationId,
      {
        currency: currency?.toUpperCase(),
        method: method?.toLowerCase(),
      },
    );
    return {
      organization: auth.organizationId,
      generated_at: new Date().toISOString(),
      options: accounts.map((a) => ({
        provider_account_id: a.id,
        gateway: a.providerCode,
        display_name: a.displayName,
        methods: a.supportedMethods,
        currencies: a.supportedCurrencies,
      })),
    };
  }
}
