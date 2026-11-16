import { USER_ROLES, type UserRole } from '@paylens/shared';

const STORAGE_KEY = 'paylens.actingRole';

/**
 * With sign-in off (ADR-014), the role this browser views PayLens as: picked in the top bar
 * ("Viewing as"), sent as `x-acting-role`. HR manager until someone picks another. With
 * sign-in on the API ignores it, so sending it is harmless.
 */
export function actingRole(): UserRole {
  const saved = readStorage();
  return USER_ROLES.find((role) => role === saved) ?? 'hr_manager';
}

export function setActingRole(role: UserRole): void {
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
