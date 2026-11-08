import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateCurrencyDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  symbol?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
