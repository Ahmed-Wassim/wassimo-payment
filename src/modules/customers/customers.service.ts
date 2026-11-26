import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';
import { Customer } from './entities/customer.entity.ts';
import { Payment } from '../payments/entities/payment.entity.ts';
import { toCustomerModel, CustomerModel } from './mappers/customer.mapper.ts';
import { FilterDto } from '../../common/dto/filter.dto.ts';
import { isUuid } from '../../common/utils/is-uuid.ts';

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
    @InjectRepository(Payment)
    private readonly payments: Repository<Payment>,
  ) {}

  async createSnapshotForPayment(
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

    const paymentWhere = {
      ...(organizationId ? { organizationId } : {}),
      ...(filter.applicationId ? { applicationId: filter.applicationId } : {}),
    };
    const payments = await this.payments.find({
      select: { id: true },
      where: paymentWhere,
    });
    if (payments.length === 0) return [];

    const rows = await this.repo.find({
      where: { paymentId: In(payments.map(({ id }) => id)) },
      order: { createdAt: 'ASC' },
    });
    return rows.map((row) => toCustomerModel(row));
  }

  async requireByIdForActor(actor: Actor, id: string): Promise<CustomerModel> {
    if (!isUuid(id)) {
      throw new BadRequestException('malformed customer id');
    }
    if (!actor.isSuperAdmin && !actor.organizationId) {
      throw new NotFoundException(`Customer not found ${id}`);
    }

    const row = await this.repo.findOneBy({ id });
    const payment = row
      ? await this.payments.findOne({
          where: {
            id: row.paymentId,
            ...(!actor.isSuperAdmin
              ? { organizationId: actor.organizationId ?? undefined }
              : {}),
          },
          select: { id: true },
        })
      : null;
    if (!row || !payment) {
      throw new NotFoundException(`Customer not found ${id}`);
    }

    return toCustomerModel(row);
  }
}
