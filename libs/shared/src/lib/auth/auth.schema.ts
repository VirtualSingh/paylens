import { z } from 'zod';
import { USER_ROLES } from './roles.js';

/**
 * With sign-in off (the default, ADR-014), the role to act as: `x-acting-role: viewer`.
 * The API ignores it when sign-in is on.
 */
export const ACTING_ROLE_HEADER = 'x-acting-role';

/** `GET /auth/config` — public, so the web app knows which mode it is in before anything else. */
export const AuthConfigSchema = z.object({
  /** false: nobody signs in, everyone acts as a demo user (ADR-014). */
  authEnabled: z.boolean(),
  /** The Google OAuth client for "Sign in with Google"; public by design. */
  googleClientId: z.string().nullable(),
});
export type AuthConfig = z.infer<typeof AuthConfigSchema>;

/** `GET /auth/me` — who the app is acting as. */
export const CurrentUserSchema = z.object({
  id: z.uuid(),
  email: z.string(),
  displayName: z.string(),
  role: z.enum(USER_ROLES),
  /** A seeded demo user (sign-in off, or a demo session). */
  isDemo: z.boolean(),
});
export type CurrentUser = z.infer<typeof CurrentUserSchema>;

/** `POST /auth/google` — the ID token Google Identity Services gave the browser. */
export const GoogleSignInRequestSchema = z.object({
  idToken: z.string().min(1).max(4096),
});
export type GoogleSignInRequest = z.infer<typeof GoogleSignInRequestSchema>;
