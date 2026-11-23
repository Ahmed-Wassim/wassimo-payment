export const API_SCOPES = [
  {
    code: 'options:read',
    name: 'Read payment options',
    description: 'View payment methods and currencies available to the application.',
  },
  {
    code: 'payments:create',
    name: 'Create payments',
    description: 'Create payments for the application.',
  },
  {
    code: 'payments:read',
    name: 'Read payments',
    description: 'View the application’s payment details and statuses.',
  },
  {
    code: 'payments:charge',
    name: 'Charge payments',
    description: 'Start processing a created payment.',
  },
  {
    code: 'payments:resolve',
    name: 'Resolve payments',
    description: 'Resolve payments whose provider outcome is unknown.',
  },
  {
    code: 'refunds:create',
    name: 'Create refunds',
    description: 'Request refunds for the application’s payments.',
  },
  {
    code: 'refunds:resolve',
    name: 'Resolve refunds',
    description: 'Resolve refunds whose provider outcome is unknown.',
  },
] as const;

export const API_SCOPE_CODES = API_SCOPES.map((scope) => scope.code);

export type ApiScopeCode = (typeof API_SCOPES)[number]['code'];
