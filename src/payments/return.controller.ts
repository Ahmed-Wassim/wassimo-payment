import { All, Controller } from '@nestjs/common';

@Controller()
export class ReturnController {
  @All('mock/return')
  @All('payments/return')
  handle() {
    return { status: 'ok', message: 'return received' };
  }
}
