import { SetMetadata } from '@nestjs/common';

export const Permission = (action: string) =>
  SetMetadata('permission', action);
