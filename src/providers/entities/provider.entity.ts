import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('providers')
export class Provider {
  @PrimaryColumn('text')
  code!: string;

  @Column()
  name!: string;
}
