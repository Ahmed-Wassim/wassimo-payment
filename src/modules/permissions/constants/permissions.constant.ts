export const PERMISSIONS = [
  // organization
  { code: 'org:read', name: 'View organization', groupName: 'organization' },
  { code: 'org:update', name: 'Edit organization', groupName: 'organization' },
  // members
  { code: 'org:members:read', name: 'View members', groupName: 'members' },
  { code: 'org:members:manage', name: 'Manage members', groupName: 'members' },
  // applications
  { code: 'apps:read', name: 'View applications', groupName: 'applications' },
  { code: 'apps:create', name: 'Create applications', groupName: 'applications' },
  { code: 'apps:update', name: 'Edit applications', groupName: 'applications' },
  { code: 'apps:delete', name: 'Delete applications', groupName: 'applications' },
  // keys
  { code: 'keys:read', name: 'View API keys', groupName: 'keys' },
  { code: 'keys:issue', name: 'Issue API keys', groupName: 'keys' },
  { code: 'keys:revoke', name: 'Revoke API keys', groupName: 'keys' },
  // platform
  { code: 'platform:orgs:read', name: 'View all organizations', groupName: 'platform' },
  { code: 'platform:orgs:filter', name: 'Filter by organization', groupName: 'platform' },
  // payments
  { code: 'payments:read', name: 'View payments', groupName: 'payments' },
  { code: 'payments:refund', name: 'Refund payments', groupName: 'payments' },
  // ... add more here later
] as const;

export const ORG_ADMIN_PERMISSION_GROUPS = [
  'organization',
  'applications',
  'keys',
  'members',
  'payments',
] as const;

export type PermissionCode = (typeof PERMISSIONS)[number]['code'];
