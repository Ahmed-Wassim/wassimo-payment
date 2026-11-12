import {
  IsArray,
  IsIn,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  ArrayNotEmpty,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateProviderAccountDto {
  @IsUUID()
  organizationId!: string;

  @IsUUID()
  applicationId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  providerCode!: string;

  @IsIn(['test', 'live'])
  environment!: 'test' | 'live';

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  displayName!: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  @Matches(/^[A-Z]{3}$/, { each: true, message: 'currency codes must be 3 uppercase letters' })
  supportedCurrencies!: string[];

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  @Matches(/^[a-z][a-z-]*$/, { each: true, message: 'methods must be lowercase kebab words' })
  supportedMethods!: string[];

  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  credentialsRef?: string;
}
