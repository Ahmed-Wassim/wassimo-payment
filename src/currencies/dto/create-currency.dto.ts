import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';

export class CreateCurrencyDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toUpperCase() : value,
  )
  @IsString()
  @Length(3, 3)
  code!: string;

  @IsInt()
  @Min(0)
  @Max(4)
  exponent!: number;

  @IsString()
  @IsNotEmpty()
  symbol!: string;

  @IsOptional()
  @IsString()
  symbolUrl?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
