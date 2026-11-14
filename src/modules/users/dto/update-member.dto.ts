import { IsIn, IsOptional, IsUUID } from 'class-validator';

export class UpdateMemberDto {
  @IsOptional()
  @IsUUID()
  roleId?: string;

  @IsOptional()
  @IsIn(['active', 'disabled'])
  status?: 'active' | 'disabled';
}
