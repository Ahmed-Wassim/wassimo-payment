import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('providers')
export class Provider {
  @PrimaryColumn()
  code!: string;

  @Column()
  name!: string;
}
