import { OAuth2Client } from 'google-auth-library';

/** What Google vouches for about the person behind an ID token. */
export interface GoogleIdentity {
  /** Google's stable account id. */
  readonly sub: string;
  readonly email: string;
  readonly emailVerified: boolean;
  readonly name: string;
}

/**
 * Checks a "Sign in with Google" ID token. An abstract class so tests swap in a fake and
 * never call Google; production uses Google's own library below.
 */
export abstract class GoogleTokenVerifier {
  /** Resolves with the identity, or rejects when the token is not valid for our client. */
  abstract verify(idToken: string): Promise<GoogleIdentity>;
}

/**
 * Verifies with google-auth-library: the signature against Google's published keys, the
 * audience (our client id), the issuer (accounts.google.com) and the expiry.
 */
export class GoogleAuthLibraryVerifier extends GoogleTokenVerifier {
  private readonly client: OAuth2Client;

  constructor(private readonly clientId: string) {
    super();
    this.client = new OAuth2Client(clientId);
  }

  async verify(idToken: string): Promise<GoogleIdentity> {
    const ticket = await this.client.verifyIdToken({
      idToken,
      audience: this.clientId,
    });
    const payload = ticket.getPayload();
    if (payload?.email === undefined) {
      throw new Error('The token carries no email');
    }
    return {
      sub: payload.sub,
      email: payload.email,
      emailVerified: payload.email_verified === true,
      name: payload.name ?? payload.email,
    };
  }
}
