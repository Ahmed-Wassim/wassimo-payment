import {
  IsArray,
  IsString,
  IsUUID,
  ArrayNotEmpty,
  IsIn,
  Matches,
} from 'class-validator';
import {
  CREDENTIAL_ENVIRONMENTS,
  type CredentialEnvironment,
} from '../entities/api-credential.entity.ts';

export class IssueCredentialDto {
  @IsUUID()
  applicationId!: string;

  @IsIn(CREDENTIAL_ENVIRONMENTS)
  environment!: CredentialEnvironment;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  @Matches(/^[a-z]+:[a-z-]+$/, {
    each: true,
    message: 'scope must be like payments:create',
  })
  scopes!: string[];
}
