import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Customer } from './entities/customer.entity.ts';

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
}
