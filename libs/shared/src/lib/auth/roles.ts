/**
 * Who may do what (ADR-006, api.md): each role includes everything the roles before it may do.
 * viewer — aggregates and the directory without individual pay
 * hr_manager — manage people and pay
 * admin — everything, including settings
 */
export const USER_ROLES = ['viewer', 'hr_manager', 'admin'] as const;
export type UserRole = (typeof USER_ROLES)[number];

/** Whether `role` includes the rights of `minimum` (admin ⊇ hr_manager ⊇ viewer). */
export function hasAtLeast(role: UserRole, minimum: UserRole): boolean {
  return USER_ROLES.indexOf(role) >= USER_ROLES.indexOf(minimum);
}
