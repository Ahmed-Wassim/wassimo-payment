import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateRoleDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  name!: string;
}
