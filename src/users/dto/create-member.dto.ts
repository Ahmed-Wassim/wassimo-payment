import { IsEmail, IsNotEmpty, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateMemberDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsUUID()
  roleId!: string;
}
