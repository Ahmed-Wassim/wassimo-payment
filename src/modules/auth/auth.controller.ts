import { Body, Controller, Get, Post, Req, UseGuards, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { OrganizationsService } from '../organizations/organizations.service.ts';
import { UsersService } from '../users/users.service.ts';
import { RegisterDto } from './dto/register.dto.ts';
import { LoginDto } from './dto/login.dto.ts';
import { JwtGuard, ActorContext } from './jwt.guard.ts';
import * as bcrypt from 'bcrypt';

@Controller()
export class AuthController {
  constructor(
    private readonly users: UsersService,
    private readonly orgs: OrganizationsService,
    private readonly jwt: JwtService,
  ) {}

  @Post('auth/register')
  async register(@Body() dto: RegisterDto) {
    const existing = await this.users.findByEmail(dto.email);
    if (existing) throw new ConflictException('Email already registered');
    const org = await this.orgs.create({ name: dto.organizationName, slug: dto.organizationSlug });
    const hash = await bcrypt.hash(dto.password, 10);
    const user = await this.users.create({ email: dto.email, passwordHash: hash });
    const adminRole = await this.users.createOrganizationAdminRole(org.id, user.id);
    await this.users.createMembership(user.id, org.id, adminRole.id);
    const token = this.jwt.sign({
      sub: user.id,
      orgId: org.id,
      roleId: adminRole.id,
      isSuperAdmin: false,
    });
    return { accessToken: token, user: { id: user.id, email: user.email }, organization: { id: org.id, slug: org.slug } };
  }

  @Post('auth/login')
  async login(@Body() dto: LoginDto) {
    const user = await this.users.findByEmail(dto.email, true);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');
    if (user.status !== 'active') throw new UnauthorizedException('Account disabled');
    if (user.isSuperAdmin) {
      const role = await this.users.findPlatformAdminRole();
      const permissions = role
        ? await this.users.getRolePermissions(role.id)
        : [];
      const token = this.jwt.sign({
        sub: user.id,
        orgId: null,
        roleId: role?.id ?? null,
        isSuperAdmin: true,
      });
      return { accessToken: token, permissions };
    }
    const membership = await this.users.requireMembership(user.id);
    const permissions = await this.users.getRolePermissions(membership.roleId);
    const token = this.jwt.sign({
      sub: user.id,
      orgId: membership.organizationId,
      roleId: membership.roleId,
      isSuperAdmin: user.isSuperAdmin,
    });
    return { accessToken: token, permissions };
  }

  @Get('auth/me')
  @UseGuards(JwtGuard)
  async me(@Req() req: { actor: ActorContext }) {
    const actor = req.actor;
    if (actor.isSuperAdmin) {
      const role = actor.roleId
        ? await this.users.getRolePermissions(actor.roleId)
        : [];
      return { ...actor, permissions: role };
    }
    const membership = await this.users.requireMembership(actor.userId);
    const permissions = await this.users.getRolePermissions(membership.roleId);
    return { ...actor, permissions };
  }
}
