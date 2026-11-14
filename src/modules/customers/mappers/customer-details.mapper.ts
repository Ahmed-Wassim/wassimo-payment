import { Customer } from '../entities/customer.entity.ts';
import type { CustomerDetails } from '../customer-details.ts';

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
