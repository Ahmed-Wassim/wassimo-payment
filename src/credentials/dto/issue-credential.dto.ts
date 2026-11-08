import {
  IsArray,
  IsString,
  IsUUID,
  ArrayNotEmpty,
  Matches,
} from 'class-validator';

export class IssueCredentialDto {
  @IsUUID()
  applicationId!: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  @Matches(/^[a-z]+:[a-z-]+$/, {
    each: true,
    message: 'scope must be like payments:create',
  })
  scopes!: string[];
}
