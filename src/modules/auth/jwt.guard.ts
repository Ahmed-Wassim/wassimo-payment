import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service.ts';
import { RolesService } from '../users/roles.service.ts';

export interface ActorContext {
  userId: string;
  email: string;
  organizationId: string | null;
  roleId: string | null;
  isSuperAdmin: boolean;
}

@Injectable()
export class JwtGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly users: UsersService,
    private readonly roles: RolesService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const header = req.headers?.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bearer token');
    }
    const token = header.slice(7);
    let payload: { sub: string };
    try {
      payload = await this.jwt.verifyAsync<{ sub: string }>(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
    if (typeof payload.sub !== 'string' || payload.sub.length === 0) {
      throw new UnauthorizedException('Invalid token subject');
    }
    const user = await this.users.findById(payload.sub);
    if (user.status !== 'active') {
      throw new UnauthorizedException('Account disabled');
    }
    const membership = user.isSuperAdmin
      ? null
      : await this.users.requireMembership(user.id);
    const platformRole = user.isSuperAdmin
      ? await this.roles.findPlatformAdminRole()
      : null;
    req.actor = {
      userId: user.id,
      email: user.email,
      organizationId: membership?.organizationId ?? null,
      roleId: membership?.roleId ?? platformRole?.id ?? null,
      isSuperAdmin: user.isSuperAdmin,
    };
    return true;
  }
}
