import { Customer } from '../entities/customer.entity.ts';

export class CustomerModel {
  id!: string;
  paymentId!: string;
  name!: string | null;
  email!: string | null;
  phone!: string | null;
  street!: string | null;
  city!: string | null;
  state!: string | null;
  country!: string | null;
  zip!: string | null;
  createdAt!: Date;
}

export function toCustomerModel(row: Customer): CustomerModel {
  return {
    id: row.id,
    paymentId: row.paymentId,
    name: row.name,
    email: row.email,
    phone: row.phone,
    street: row.street,
    city: row.city,
    state: row.state,
    country: row.country,
    zip: row.zip,
    createdAt: row.createdAt,
  };
}
