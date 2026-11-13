import { Column, Entity, PrimaryColumn } from 'typeorm';

export type ProviderMethod = {
  code: string;
  name: string;
  is_special?: boolean;
};

@Entity('providers')
export class Provider {
  @PrimaryColumn('text')
  code!: string;

  @Column()
  name!: string;

  @Column({ type: 'jsonb' })
  methods!: ProviderMethod[];
}
