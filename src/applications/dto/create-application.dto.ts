import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
} from 'class-validator';

export class CreateApplicationDto {
  @IsUUID()
  organizationId: string;

  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug must be lowercase letters, numbers, hyphens',
  })
  slug!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;
}
