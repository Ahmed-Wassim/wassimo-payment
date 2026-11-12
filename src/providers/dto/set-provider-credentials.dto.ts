import { IsObject } from 'class-validator';

export class SetProviderCredentialsDto {
  @IsObject()
  credentials!: Record<string, string>;
}
