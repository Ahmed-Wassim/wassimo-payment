import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('currencies')
export class Currency {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 3, unique: true })
  code!: string;

  @Column({ type: 'smallint' })
  exponent!: number;

  @Column({ type: 'text' })
  symbol!: string;

  @Column({ default: true })
  enabled!: boolean;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;
}
