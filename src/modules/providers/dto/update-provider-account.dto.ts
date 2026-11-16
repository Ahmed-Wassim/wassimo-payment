import {
  IsArray,
  IsIn,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  ArrayNotEmpty,
  Matches,
  MaxLength,
} from 'class-validator';

export class UpdateProviderAccountDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  displayName?: string;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  @Matches(/^[A-Z]{3}$/, { each: true, message: 'currency codes must be 3 uppercase letters' })
  supportedCurrencies?: string[];

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  @Matches(/^[a-z][a-z0-9_-]*$/, {
    each: true,
    message: 'methods must be lowercase words with hyphens or underscores',
  })
  supportedMethods?: string[];

  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;

  @IsOptional()
  @IsIn(['enabled', 'disabled'])
  status?: 'enabled' | 'disabled';
}
