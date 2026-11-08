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
import { CurrenciesService } from './currencies.service.ts';
import { CreateCurrencyDto } from './dto/create-currency.dto.ts';
import { UpdateCurrencyDto } from './dto/update-currency.dto.ts';

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
  create(@Body() dto: CreateCurrencyDto) {
    return this.service.create(dto);
  }

  @Patch(':code')
  update(@Param('code') code: string, @Body() dto: UpdateCurrencyDto) {
    return this.service.update(code, dto);
  }

  @Delete(':code')
  @HttpCode(204)
  async remove(@Param('code') code: string) {
    await this.service.remove(code);
  }
}
