import { IsIn, IsOptional, IsUUID } from 'class-validator';
import type { UserStatus } from '../entities/user.entity.ts';

export class UpdateMemberDto {
  @IsOptional()
  @IsUUID()
  roleId?: string;

  @IsOptional()
  @IsIn(['active', 'disabled'])
  status?: UserStatus;
}
