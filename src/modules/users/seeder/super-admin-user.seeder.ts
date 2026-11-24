import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity.ts';

@Injectable()
export class SuperAdminUserSeeder {
  private readonly logger = new Logger(SuperAdminUserSeeder.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async seed() {
    this.logger.log('Seeding platform admin...');

    const email = 'superadmin@wassimo.local';
    const user = await this.userRepo.findOneBy({ email });
    if (!user) {
      const passwordHash = await bcrypt.hash('password', 10);
      await this.userRepo.save(
        this.userRepo.create({
          email,
          passwordHash,
          isSuperAdmin: true,
        }),
      );
    }

    this.logger.log('Platform admin seeding completed');
  }
}
