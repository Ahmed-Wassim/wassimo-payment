import { IsInt, IsNotEmpty, IsString, IsUUID, Length, Min } from 'class-validator';

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
}