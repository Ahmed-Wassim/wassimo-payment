import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  CredentialsService,
  VerifiedCredential,
} from '../credentials/credentials.service.ts';
import { API_SCOPE_KEY } from './api-scope.decorator.ts';
import type { ApiScopeCode } from './api-scopes.ts';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private readonly credentials: CredentialsService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const raw = (req.headers['authorization'] ?? '') as string;
    const token = raw.startsWith('Bearer ') ? raw.slice(7) : '';

    let verified: VerifiedCredential | null = null;
    try {
      verified = token ? await this.credentials.verify(token) : null;
    } catch {
      verified = null;
    }

    if (!verified) {
      throw new UnauthorizedException('invalid api key');
    }

    const requiredScope = this.reflector.get<ApiScopeCode>(
      API_SCOPE_KEY,
      ctx.getHandler(),
    );
    if (requiredScope && !verified.credential.scopes.includes(requiredScope)) {
      throw new ForbiddenException(`missing required scope: ${requiredScope}`);
    }

    await this.credentials.touchLastUsed(verified.credential.id);

    req.auth = {
      applicationId: verified.applicationId,
      organizationId: verified.organizationId,
      environment: verified.credential.environment,
      scopes: verified.credential.scopes,
    };

    return true;
  }
}
