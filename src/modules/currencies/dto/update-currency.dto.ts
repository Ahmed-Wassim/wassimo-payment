import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';

export class UpdateCurrencyDto {
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @IsNotEmpty()
  symbol?: string;

  @IsOptional()
  @IsString()
  symbolUrl?: string | null;

  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  enabled?: boolean;
}
