/** Injection token for the sign-in mode (ADR-014). */
export const AUTH_SETTINGS = Symbol('AUTH_SETTINGS');

export interface AuthSettings {
  /** false (the default): nobody signs in; requests act as demo users. */
  readonly authEnabled: boolean;
  /** The Google OAuth client whose ID tokens we accept (public, not a secret). */
  readonly googleClientId: string | null;
  /** Lower-case emails that become admin on first sign-in. */
  readonly adminEmails?: readonly string[];
  /** Lower-case domains whose people may sign in (as viewers, at first). */
  readonly allowedEmailDomains?: readonly string[];
  /** How long a session lasts. */
  readonly sessionTtlHours?: number;
}

const DEFAULT_SESSION_TTL_HOURS = 12;

/**
 * Read once at start-up. Only the exact value "true" turns sign-in on, so a typo leaves the
 * documented default (off) rather than something in between.
 */
export function authSettingsFromEnv(
  env: Readonly<Record<string, string | undefined>>,
): AuthSettings {
  const clientId = env['GOOGLE_CLIENT_ID']?.trim();
  const ttl = Number(env['SESSION_TTL_HOURS']);
  return {
    authEnabled: env['AUTH_ENABLED'] === 'true',
    googleClientId: clientId === undefined || clientId === '' ? null : clientId,
    adminEmails: list(env['ADMIN_EMAILS']),
    allowedEmailDomains: list(env['ALLOWED_EMAIL_DOMAINS']),
    sessionTtlHours:
      Number.isInteger(ttl) && ttl > 0 ? ttl : DEFAULT_SESSION_TTL_HOURS,
  };
}

/** "a@x.com, B@y.com" → ["a@x.com", "b@y.com"]. */
function list(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter((item) => item !== '');
}

export function sessionTtlHours(settings: AuthSettings): number {
  return settings.sessionTtlHours ?? DEFAULT_SESSION_TTL_HOURS;
}
