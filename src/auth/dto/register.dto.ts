import { IsEmail, IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  organizationName!: string;

  @IsString()
  @Matches(/^[a-z0-9-]+$/)
  @MaxLength(64)
  organizationSlug!: string;
}
