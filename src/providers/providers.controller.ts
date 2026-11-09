import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { Provider } from './entities/provider.entity.ts';
import { ProvidersService } from './providers.service.ts';
import { ProviderAccountModel } from './provider-account.model.ts';
import { CreateProviderAccountDto } from './dto/create-provider-account.dto.ts';
import { UpdateProviderAccountDto } from './dto/update-provider-account.dto.ts';

@Controller()
export class ProvidersController {
  constructor(private readonly service: ProvidersService) {}

  @Get('providers')
  listProviders(): Promise<Provider[]> {
    return this.service.listProviders();
  }

  @Get('providers/:code')
  findProvider(@Param('code') code: string): Promise<Provider> {
    return this.service.requireByCode(code);
  }

  @Get('provider-accounts')
  listAccounts(): Promise<ProviderAccountModel[]> {
    return this.service.listAccounts();
  }

  @Get('provider-accounts/:id')
  findAccount(@Param('id') id: string): Promise<ProviderAccountModel> {
    return this.service.findOneAccount(id);
  }

  @Post('provider-accounts')
  createAccount(@Body() dto: CreateProviderAccountDto) {
    return this.service.createAccount(dto);
  }

  @Patch('provider-accounts/:id')
  updateAccount(@Param('id') id: string, @Body() dto: UpdateProviderAccountDto) {
    return this.service.updateAccount(id, dto);
  }

  @Delete('provider-accounts/:id')
  @HttpCode(204)
  async removeAccount(@Param('id') id: string) {
    await this.service.removeAccount(id);
  }
}
