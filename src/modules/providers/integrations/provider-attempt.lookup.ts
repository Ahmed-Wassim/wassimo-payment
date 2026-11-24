import { Repository } from 'typeorm';
import { PaymentAttempt } from '../../payments/entities/payment-attempt.entity.ts';

export async function findAttemptForProvider(
  attempts: Repository<PaymentAttempt>,
  providerReference: string,
  providerCode: string,
): Promise<PaymentAttempt | null> {
  const matches = await attempts.find({
    where: {
      providerReference,
      providerAccount: { providerCode },
    },
    relations: { providerAccount: true },
  });
  return matches.length === 1 ? matches[0] : null;
}
