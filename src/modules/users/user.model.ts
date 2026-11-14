import { User } from './entities/user.entity.ts';

export class UserModel {
  id!: string;
  email!: string;
  status!: string;
  isSuperAdmin!: boolean;
  createdAt!: Date;
  updatedAt!: Date;
}

export function toUserModel(row: User): UserModel {
  return {
    id: row.id,
    email: row.email,
    status: row.status,
    isSuperAdmin: row.isSuperAdmin,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
