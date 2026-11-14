import { Provider, ProviderMethod } from './entities/provider.entity.ts';

export class ProviderMethodModel {
  code!: string;
  name!: string;
  is_special?: boolean;
}

export class ProviderModel {
  code!: string;
  name!: string;
  methods!: ProviderMethodModel[];
}

export function toProviderMethodModel(row: ProviderMethod): ProviderMethodModel {
  return {
    code: row.code,
    name: row.name,
    is_special: row.is_special,
  };
}

export function toProviderModel(row: Provider): ProviderModel {
  return {
    code: row.code,
    name: row.name,
    methods: (row.methods ?? []).map((m) => toProviderMethodModel(m)),
  };
}
