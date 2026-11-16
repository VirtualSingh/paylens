import type { UserRole } from '@paylens/shared';

/**
 * The users requests act as while sign-in is off (ADR-014), one per role. Migration
 * 0003_sign-in.sql creates these rows with the same ids, so audit events and salary records
 * name a real actor; a test checks the two agree.
 */
export const DEMO_USERS: Readonly<
  Record<UserRole, { readonly id: string; readonly displayName: string }>
> = {
  viewer: {
    id: '00000000-0000-4000-8000-0000000d0001',
    displayName: 'Demo viewer',
  },
  hr_manager: {
    id: '00000000-0000-4000-8000-0000000d0002',
    displayName: 'Demo HR manager',
  },
  admin: {
    id: '00000000-0000-4000-8000-0000000d0003',
    displayName: 'Demo admin',
  },
};

/** The role a visitor acts as until they choose another: the persona PayLens is built for. */
export const DEFAULT_ACTING_ROLE: UserRole = 'hr_manager';
