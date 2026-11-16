import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import type { OrganizationStatus } from '../entities/organization.entity.ts';

export class UpdateOrganizationDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsIn(['active', 'disabled'])
  status?: OrganizationStatus;
}
