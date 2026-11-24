import { IsDefined, IsInt, IsNotEmpty, IsString, IsUUID, Length, Max, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CustomerDetailsDto } from './customer-details.dto.ts';

export class CreatePaymentDto {
  @IsString() @IsNotEmpty()
  reference!: string;

  @IsInt() @Min(1) @Max(Number.MAX_SAFE_INTEGER)
  amount_minor!: number;

  @IsString() @Length(3, 3)
  currency!: string;

  @IsUUID()
  provider_account_id!: string;

  @IsString() @IsNotEmpty()
  method!: string;

  @IsDefined()
  @ValidateNested()
  @Type(() => CustomerDetailsDto)
  customer_details!: CustomerDetailsDto;
}
