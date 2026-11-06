import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity('currencies')
export class Currency {
  @PrimaryColumn('char', { length: 3 })
  code!: string;

  @Column({ type: 'smallint' })
  exponent!: number;

  @Column()
  symbol!: string;

  @Column({ default: true })
  enabled!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
