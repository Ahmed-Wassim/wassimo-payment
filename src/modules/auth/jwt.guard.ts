import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service.ts';

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
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const header = req.headers?.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bearer token');
    }
    const token = header.slice(7);
    let payload: {
      sub: string;
      orgId: string | null;
      roleId: string | null;
      isSuperAdmin: boolean;
    };
    try {
      payload = await this.jwt.verifyAsync(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
    const user = await this.users.findById(payload.sub);
    if (user.status !== 'active') {
      throw new UnauthorizedException('Account disabled');
    }
    req.actor = {
      userId: user.id,
      email: user.email,
      organizationId: payload.orgId,
      roleId: payload.roleId,
      isSuperAdmin: payload.isSuperAdmin,
    } as ActorContext;
    return true;
  }
}
