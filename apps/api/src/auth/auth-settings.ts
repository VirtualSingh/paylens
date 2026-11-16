/** Injection token for the sign-in mode (ADR-014). */
export const AUTH_SETTINGS = Symbol('AUTH_SETTINGS');

export interface AuthSettings {
  /** false (the default): nobody signs in; requests act as demo users. */
  readonly authEnabled: boolean;
  /** The Google OAuth client whose ID tokens we accept (public, not a secret). */
  readonly googleClientId: string | null;
}

/**
 * Read once at start-up. Only the exact value "true" turns sign-in on, so a typo leaves the
 * documented default (off) rather than something in between.
 */
export function authSettingsFromEnv(
  env: Readonly<Record<string, string | undefined>>,
): AuthSettings {
  const clientId = env['GOOGLE_CLIENT_ID']?.trim();
  return {
    authEnabled: env['AUTH_ENABLED'] === 'true',
    googleClientId: clientId === undefined || clientId === '' ? null : clientId,
  };
}
