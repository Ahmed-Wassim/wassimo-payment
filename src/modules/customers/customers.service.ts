import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Customer } from './entities/customer.entity.ts';
import { toCustomerModel, CustomerModel } from './customer.model.ts';
import { FilterDto } from '../../common/dto/filter.dto.ts';
import { isUuid } from '../../common/is-uuid.ts';

type Actor = { organizationId: string | null; isSuperAdmin: boolean };

export type CustomerInput = {
  name?: string;
  email?: string;
  phone?: string;
  street?: string;
  city?: string;
  state?: string;
  country?: string;
  zip?: string;
};

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private readonly repo: Repository<Customer>,
  ) {}

  async snapshotInTx(
    em: EntityManager,
    paymentId: string,
    details: CustomerInput,
  ): Promise<void> {
    await em.insert(Customer, {
      paymentId,
      name: details.name ?? null,
      email: details.email ?? null,
      phone: details.phone ?? null,
      street: details.street ?? null,
      city: details.city ?? null,
      state: details.state ?? null,
      country: details.country ?? null,
      zip: details.zip ?? null,
    });
  }

  async forPayment(paymentId: string): Promise<Customer | null> {
    return this.repo.findOne({ where: { paymentId } });
  }

  async listForActor(actor: Actor, filter: FilterDto): Promise<CustomerModel[]> {
    const organizationId = actor.isSuperAdmin
      ? filter.organizationId ?? null
      : actor.organizationId;

    const qb = this.repo
      .createQueryBuilder('c')
      .innerJoin('payments', 'p', 'p.id = c.payment_id')
      .orderBy('c.created_at', 'ASC');

    if (organizationId) {
      qb.andWhere('p.organization_id = :organizationId', { organizationId });
    }
    if (filter.applicationId) {
      qb.andWhere('p.application_id = :applicationId', {
        applicationId: filter.applicationId,
      });
    }

    const rows = await qb.getMany();
    return rows.map((row) => toCustomerModel(row));
  }

  async requireByIdForActor(actor: Actor, id: string): Promise<CustomerModel> {
    if (!isUuid(id)) {
      throw new BadRequestException('malformed customer id');
    }

    const qb = this.repo
      .createQueryBuilder('c')
      .innerJoin('payments', 'p', 'p.id = c.payment_id')
      .where('c.id = :id', { id });

    if (!actor.isSuperAdmin) {
      qb.andWhere('p.organization_id = :organizationId', {
        organizationId: actor.organizationId,
      });
    }

    const row = await qb.getOne();
    if (!row) {
      throw new NotFoundException(`Customer not found ${id}`);
    }

    return toCustomerModel(row);
  }
}
