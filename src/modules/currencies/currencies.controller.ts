import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrenciesService } from './currencies.service.ts';
import { CreateCurrencyDto } from './dto/create-currency.dto.ts';
import { UpdateCurrencyDto } from './dto/update-currency.dto.ts';
import { JwtGuard } from '../auth/jwt.guard.ts';
import { PermissionGuard } from '../auth/permission.guard.ts';
import { Permission } from '../auth/permission.decorator.ts';

@Controller('currencies')
export class CurrenciesController {
  constructor(private readonly service: CurrenciesService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':code')
  findByCode(@Param('code') code: string) {
    return this.service.findByCode(code);
  }

  @Post()
  @UseGuards(JwtGuard, PermissionGuard)
  @Permission('platform:orgs:read')
  create(@Body() dto: CreateCurrencyDto) {
    return this.service.create(dto);
  }

  @Patch(':code')
  @UseGuards(JwtGuard, PermissionGuard)
  @Permission('platform:orgs:read')
  update(@Param('code') code: string, @Body() dto: UpdateCurrencyDto) {
    return this.service.update(code, dto);
  }

  @Delete(':code')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtGuard, PermissionGuard)
  @Permission('platform:orgs:read')
  async remove(@Param('code') code: string) {
    await this.service.remove(code);
  }
}
