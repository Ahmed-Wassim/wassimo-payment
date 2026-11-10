import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { APP_CONFIG, AppConfigModule } from '../config/config.module.ts';
import type { AppConfig } from '../config/configuration.ts';
import { UsersModule } from '../users/users.module.ts';
import { OrganizationsModule } from '../organizations/organizations.module.ts';
import { AuthController } from './auth.controller.ts';
import { JwtGuard } from './jwt.guard.ts';
import { PermissionGuard } from './permission.guard.ts';

@Module({
  imports: [
    AppConfigModule,
    forwardRef(() => UsersModule),
    forwardRef(() => OrganizationsModule),
    JwtModule.registerAsync({
      inject: [APP_CONFIG],
      useFactory: (cfg: AppConfig) => ({
        secret: cfg.jwt.secret,
        signOptions: { expiresIn: '1h' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [JwtGuard, PermissionGuard],
  exports: [JwtGuard, PermissionGuard, JwtModule],
})
export class AuthModule {}
