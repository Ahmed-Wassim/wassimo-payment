import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SUPER_ADMIN_ROLE_ID } from '../constants/system-roles.constant.ts';
import { Role } from '../entities/role.entity.ts';
import { User } from '../entities/user.entity.ts';

@Injectable()
export class UsersRolesSeeder {
  private readonly logger = new Logger(UsersRolesSeeder.name);

  constructor(
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async seed() {
    this.logger.log('Seeding platform admin...');

    const role = await this.roleRepo.findOneBy({ id: SUPER_ADMIN_ROLE_ID });
    if (!role) {
      await this.roleRepo.save(
        this.roleRepo.create({
          id: SUPER_ADMIN_ROLE_ID,
          organizationId: null,
          name: 'Super Admin',
          createdBy: null,
        }),
      );
    }

    const email = 'superadmin@wassimo.local';
    const user = await this.userRepo.findOneBy({ email });
    if (!user) {
      await this.userRepo.save(
        this.userRepo.create({
          email,
          passwordHash:
            '$2b$10$8RK5fNTSm20/LluvZWPCBu3jX53axu0l48O9cdIM3mnBO73I6Og3e',
          isSuperAdmin: true,
        }),
      );
    }

    this.logger.log('Platform admin seeding completed');
  }
}
