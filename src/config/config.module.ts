import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { loadConfig } from './configuration.ts';
import { envValidationSchema } from './env.validation.ts';

export const APP_CONFIG = 'APP_CONFIG';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      validationSchema: envValidationSchema,
      validationOptions: {
        libraryOptions: { abortEarly: false, allowUnknown: true },
      },
    }),
  ],
  providers: [{ provide: APP_CONFIG, useFactory: loadConfig }],
  exports: [APP_CONFIG],
})
export class AppConfigModule {}
