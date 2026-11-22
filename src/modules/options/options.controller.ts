import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { ApiKeyGuard } from '../auth/api-key.guard.ts';
import { ApiScope } from '../auth/api-scope.decorator.ts';
import { AuthContext } from '../auth/auth-context.ts';
import { FilterDto } from '../../common/dto/filter.dto.ts';
import { ProvidersService } from '../providers/providers.service.ts';

@Controller()
export class OptionsController {
  constructor(private readonly providers: ProvidersService) {}

  @Get('v1/options')
  @UseGuards(ApiKeyGuard)
  @ApiScope('options:read')
  async options(
    @Req() req: { auth?: AuthContext },
    @Query() filter: FilterDto,
  ) {
    const auth = req.auth!;
    const accounts = await this.providers.findForContext(
      {
        organizationId: auth.organizationId,
        applicationId: auth.applicationId,
      },
      {
        currency: filter.currency?.toUpperCase(),
        method: filter.method?.toLowerCase(),
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
