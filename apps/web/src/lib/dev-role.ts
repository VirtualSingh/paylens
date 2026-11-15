import { USER_ROLES, type UserRole } from '@paylens/shared';

const STORAGE_KEY = 'paylens.devRole';

/**
 * TEMPORARY, until sign-in exists (phase-2 task 2.1, parked by Pushpendra on 2026-11-15).
 * In development builds the app acts as one role, chosen in the top bar, and sends it as
 * `x-dev-role` — the header the API honours only outside production. Production builds never
 * send it (`import.meta.env.DEV` is false there), and the API would ignore it anyway.
 */
export function devRole(): UserRole | null {
  if (!import.meta.env.DEV) {
    return null;
  }
  const saved = readStorage();
  return USER_ROLES.find((role) => role === saved) ?? 'hr_manager';
}

export function setDevRole(role: UserRole): void {
  try {
    localStorage.setItem(STORAGE_KEY, role);
  } catch {
    // Private windows may refuse storage; the role then resets on reload.
  }
}

function readStorage(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}
