import {
  AuthConfigSchema,
  CurrentUserSchema,
  GoogleSignInRequestSchema,
} from './auth.schema.js';

describe('AuthConfigSchema', () => {
  it('reads whether sign-in is required and which Google client signs in', () => {
    expect(
      AuthConfigSchema.parse({
        authEnabled: false,
        googleClientId: '1-abc.apps.googleusercontent.com',
      }),
    ).toEqual({
      authEnabled: false,
      googleClientId: '1-abc.apps.googleusercontent.com',
    });
  });

  it('allows no Google client when sign-in is off', () => {
    expect(
      AuthConfigSchema.safeParse({ authEnabled: false, googleClientId: null })
        .success,
    ).toBe(true);
  });
});

describe('CurrentUserSchema', () => {
  it('reads the person the app acts as', () => {
    const user = {
      id: '00000000-0000-4000-8000-0000000d0002',
      email: 'demo.hr@paylens.app',
      displayName: 'Demo HR manager',
      role: 'hr_manager',
      isDemo: true,
    };

    expect(CurrentUserSchema.parse(user)).toEqual(user);
  });

  it('rejects a role outside viewer, hr_manager and admin', () => {
    expect(
      CurrentUserSchema.safeParse({
        id: '00000000-0000-4000-8000-0000000d0002',
        email: 'x@y.z',
        displayName: 'X',
        role: 'owner',
        isDemo: false,
      }).success,
    ).toBe(false);
  });
});

describe('GoogleSignInRequestSchema', () => {
  it('needs the ID token Google gave the browser', () => {
    expect(GoogleSignInRequestSchema.safeParse({}).success).toBe(false);
    expect(
      GoogleSignInRequestSchema.safeParse({ idToken: 'eyJhbGciOi.x.y' })
        .success,
    ).toBe(true);
  });
});
