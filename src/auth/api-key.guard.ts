import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import {
  CredentialsService,
  VerifiedCredential,
} from '../credentials/credentials.service.ts';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly credentials: CredentialsService) {}

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
