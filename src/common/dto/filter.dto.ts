import { IsOptional, IsString, IsUUID, Length } from 'class-validator';

export class FilterDto {
  @IsOptional() @IsUUID()
  organizationId?: string;

  @IsOptional() @IsUUID()
  applicationId?: string;

  @IsOptional() @IsString() @Length(3, 3)
  currency?: string;

  @IsOptional() @IsString() @Length(1, 64)
  method?: string;
}
