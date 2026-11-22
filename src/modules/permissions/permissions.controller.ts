import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ActorContext, JwtGuard } from '../auth/jwt.guard.ts';
import { Permission } from '../auth/permission.decorator.ts';
import { PermissionGuard } from '../auth/permission.guard.ts';
import { PermissionsService } from './permissions.service.ts';

@Controller()
@UseGuards(JwtGuard, PermissionGuard)
export class PermissionsController {
  constructor(private readonly permissions: PermissionsService) {}

  @Get('permissions')
  @Permission('org:members:manage')
  list(@Req() req: { actor: ActorContext }) {
    return this.permissions.listForActor(req.actor);
  }
}
