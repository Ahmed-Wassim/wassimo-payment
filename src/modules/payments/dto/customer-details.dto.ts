import { IsEmail, IsOptional, IsString, Length, MaxLength } from 'class-validator';
import type { CustomerDetails } from '../../customers/customer-details.ts';

export class CustomerDetailsDto implements CustomerDetails {
  @IsOptional() @IsString() @MaxLength(255)
  name?: string;

  @IsOptional() @IsEmail()
  email?: string;

  @IsOptional() @IsString() @MaxLength(32)
  phone?: string;

  @IsOptional() @IsString() @MaxLength(255)
  street?: string;

  @IsOptional() @IsString() @MaxLength(255)
  city?: string;

  @IsOptional() @IsString() @MaxLength(255)
  state?: string;

  @IsOptional() @IsString() @Length(2, 2)
  country?: string;

  @IsOptional() @IsString() @MaxLength(32)
  zip?: string;
}
