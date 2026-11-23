import {
  ArrayNotEmpty,
  IsIn,
  IsArray,
  IsUUID,
} from 'class-validator';
import {
  API_SCOPE_CODES,
  type ApiScopeCode,
} from '../../auth/api-scopes.ts';
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
  @IsIn(API_SCOPE_CODES, {
    each: true,
    message: 'scope must be a supported API scope',
  })
  scopes!: ApiScopeCode[];
}
