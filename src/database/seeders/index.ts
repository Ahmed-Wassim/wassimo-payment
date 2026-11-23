import { CurrenciesSeeder } from '../../modules/currencies/seeder/currencies.seeder.ts';
import { PermissionsSeeder } from '../../modules/permissions/seeder/permissions.seeder.ts';
import { ProviderMethodsSeeder } from '../../modules/providers/seeder/provider-methods.seeder.ts';
import { UsersRolesSeeder } from '../../modules/users/seeder/users-roles.seeder.ts';

export const SEEDERS = [
  CurrenciesSeeder,
  UsersRolesSeeder,
  PermissionsSeeder,
  ProviderMethodsSeeder,
];
