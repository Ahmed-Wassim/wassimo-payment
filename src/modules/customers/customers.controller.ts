import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { ActorContext, JwtGuard } from '../auth/jwt.guard.ts';
import { PermissionGuard } from '../auth/permission.guard.ts';
import { Permission } from '../auth/permission.decorator.ts';
import { FilterDto } from '../../common/dto/filter.dto.ts';
import { CustomersService } from './customers.service.ts';

@Controller('customers')
@UseGuards(JwtGuard, PermissionGuard)
export class CustomersController {
  constructor(private readonly service: CustomersService) {}

  @Get()
  @Permission('payments:read')
  list(
    @Req() req: { actor: ActorContext },
    @Query() filter: FilterDto,
  ) {
    return this.service.listForActor(req.actor, filter);
  }

  @Get(':id')
  @Permission('payments:read')
  show(@Req() req: { actor: ActorContext }, @Param('id') id: string) {
    return this.service.requireByIdForActor(req.actor, id);
  }
}
