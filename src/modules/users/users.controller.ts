import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { FilterDto } from '../../common/dto/filter.dto.ts';
import { Permission } from '../auth/permission.decorator.ts';
import { PermissionGuard } from '../auth/permission.guard.ts';
import { ActorContext, JwtGuard } from '../auth/jwt.guard.ts';
import { CreateMemberDto } from './dto/create-member.dto.ts';
import { UpdateMemberDto } from './dto/update-member.dto.ts';
import { UsersService } from './users.service.ts';
import * as bcrypt from 'bcrypt';

@Controller()
@UseGuards(JwtGuard, PermissionGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('users')
  @Permission('org:members:read')
  listMembers(
    @Req() req: { actor: ActorContext },
    @Query() filter: FilterDto,
  ) {
    return this.users.listMembersForActor(req.actor, filter);
  }

  @Post('users')
  @Permission('org:members:manage')
  async createMember(
    @Req() req: { actor: ActorContext },
    @Body() dto: CreateMemberDto,
  ) {
    const hash = await bcrypt.hash(dto.password, 10);
    return this.users.createMemberForActor(req.actor, {
      email: dto.email,
      passwordHash: hash,
      roleId: dto.roleId,
      organizationId: dto.organizationId,
    });
  }

  @Patch('users/:id')
  @Permission('org:members:manage')
  updateMember(
    @Req() req: { actor: ActorContext },
    @Param('id') id: string,
    @Body() dto: UpdateMemberDto,
  ) {
    return this.users.updateMemberForActor(req.actor, id, dto);
  }
}
