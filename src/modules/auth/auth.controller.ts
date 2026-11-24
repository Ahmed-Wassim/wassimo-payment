import {
  Body,
  ConflictException,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { OrganizationsService } from '../organizations/organizations.service.ts';
import { UsersService } from '../users/users.service.ts';
import { RolesService } from '../users/roles.service.ts';
import { PERMISSIONS } from '../permissions/constants/permissions.constant.ts';
import { RegisterDto } from './dto/register.dto.ts';
import { LoginDto } from './dto/login.dto.ts';
import { ResetPasswordDto } from './dto/reset-password.dto.ts';
import { JwtGuard, ActorContext } from './jwt.guard.ts';
import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly users: UsersService,
    private readonly roles: RolesService,
    private readonly orgs: OrganizationsService,
    private readonly jwt: JwtService,
    private readonly dataSource: DataSource,
  ) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    const existing = await this.users.findByEmail(dto.email);
    if (existing) throw new ConflictException('Email already registered');
    const hash = await bcrypt.hash(dto.password, 10);
    const { org, user } = await this.dataSource.transaction(async (manager) => {
      const org = await this.orgs.create(
        { name: dto.organizationName, slug: dto.organizationSlug },
        manager,
      );
      const user = await this.users.create(
        { email: dto.email, passwordHash: hash },
        manager,
      );
      const adminRole = await this.roles.createOrganizationAdminRole(
        org.id,
        user.id,
        manager,
      );
      await this.users.createMembership(user.id, org.id, adminRole.id, manager);
      return { org, user };
    });
    const token = this.jwt.sign({ sub: user.id });
    return { accessToken: token, user: { id: user.id, email: user.email }, organization: { id: org.id, slug: org.slug } };
  }

  @Post('login')
  async login(@Body() dto: LoginDto) {
    const user = await this.users.findByEmailWithPassword(dto.email);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');
    if (user.status !== 'active') throw new UnauthorizedException('Account disabled');
    if (user.isSuperAdmin) {
      const token = this.jwt.sign({ sub: user.id });
      return {
        accessToken: token,
        permissions: PERMISSIONS.map((permission) => permission.code),
      };
    }
    const membership = await this.users.requireMembership(user.id);
    const permissions = await this.roles.getRolePermissionsForActor(
      { organizationId: membership.organizationId, isSuperAdmin: false },
      membership.roleId,
    );
    const token = this.jwt.sign({ sub: user.id });
    return { accessToken: token, permissions };
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtGuard)
  async resetPassword(
    @Req() req: { actor: ActorContext },
    @Body() dto: ResetPasswordDto,
  ): Promise<void> {
    const user = await this.users.findByIdWithPassword(req.actor.userId);
    const currentPasswordMatches = await bcrypt.compare(
      dto.currentPassword,
      user.passwordHash,
    );
    if (!currentPasswordMatches) {
      throw new UnauthorizedException('Invalid current password');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.users.updatePassword(user.id, passwordHash);
  }

  @Get('me')
  @UseGuards(JwtGuard)
  async me(@Req() req: { actor: ActorContext }) {
    const actor = req.actor;
    if (actor.isSuperAdmin) {
      const permissions = PERMISSIONS.map((permission) => permission.code);
      return { ...actor, permissions };
    }
    const membership = await this.users.requireMembership(actor.userId);
    const permissions = await this.roles.getRolePermissionsForActor(
      actor,
      membership.roleId,
    );
    return { ...actor, permissions };
  }
}
