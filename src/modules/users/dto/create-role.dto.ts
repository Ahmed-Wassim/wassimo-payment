import { IsOptional, IsString, IsUUID, IsNotEmpty, MaxLength } from 'class-validator';

export class CreateRoleDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  name!: string;

  @IsOptional()
  @IsUUID()
  organizationId?: string;
}
