import { IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Length, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CustomerDetailsDto } from './customer-details.dto.ts';

export class CreatePaymentDto {
  @IsString() @IsNotEmpty()
  reference!: string;

  @IsInt() @Min(1)
  amount_minor!: number;

  @IsString() @Length(3, 3)
  currency!: string;

  @IsUUID()
  provider_account_id!: string;

  @IsString() @IsNotEmpty()
  method!: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => CustomerDetailsDto)
  customer_details?: CustomerDetailsDto;
}