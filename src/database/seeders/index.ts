import { CurrenciesSeeder } from '../../modules/currencies/seeder/currencies.seeder.ts';
import { PermissionsSeeder } from '../../modules/permissions/seeder/permissions.seeder.ts';
import { ProviderMethodsSeeder } from '../../modules/providers/seeder/provider-methods.seeder.ts';
import { SuperAdminUserSeeder } from '../../modules/users/seeder/super-admin-user.seeder.ts';

export const SEEDERS = [
  CurrenciesSeeder,
  SuperAdminUserSeeder,
  PermissionsSeeder,
  ProviderMethodsSeeder,
];
