import { Customer } from './entities/customer.entity.ts';

export interface CustomerDetails {
  name?: string;
  email?: string;
  phone?: string;
  street?: string;
  city?: string;
  state?: string;
  country?: string;
  zip?: string;
}

export function toCustomerDetails(row: Customer): CustomerDetails {
  return {
    name: row.name ?? undefined,
    email: row.email ?? undefined,
    phone: row.phone ?? undefined,
    street: row.street ?? undefined,
    city: row.city ?? undefined,
    state: row.state ?? undefined,
    country: row.country ?? undefined,
    zip: row.zip ?? undefined,
  };
}
