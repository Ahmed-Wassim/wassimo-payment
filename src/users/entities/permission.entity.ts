import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('permissions')
export class Permission {
  @PrimaryColumn('text')
  code!: string;

  @Column()
  name!: string;

  @Column({ name: 'group_name' })
  groupName!: string;
}
