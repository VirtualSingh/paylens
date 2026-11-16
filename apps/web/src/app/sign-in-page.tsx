import { CurrentUserSchema } from '@paylens/shared';
import { useEffect, useRef, useState } from 'react';
import { ApiError, apiRequest } from '../lib/api-client';

/** The slice of Google Identity Services this page uses. */
interface GoogleAccountsId {
  initialize(options: {
    client_id: string;
    callback: (response: { credential: string }) => void;
  }): void;
  renderButton(element: HTMLElement, options: Record<string, string>): void;
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleAccountsId } };
  }
}

const GOOGLE_SCRIPT = 'https://accounts.google.com/gsi/client';
let googleScript: Promise<GoogleAccountsId> | undefined;

/** Loads Google's sign-in script once (allowed by the web's CSP, apps/web/vercel.json). */
function loadGoogle(): Promise<GoogleAccountsId> {
  googleScript ??= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = GOOGLE_SCRIPT;
    script.async = true;
    script.onload = () => {
      const id = window.google?.accounts.id;
      if (id === undefined) {
        reject(new Error('Google sign-in did not load'));
      } else {
        resolve(id);
      }
    };
    script.onerror = () => reject(new Error('Google sign-in did not load'));
    document.head.append(script);
  });
  return googleScript;
}

/**
 * Sign in (ui-screens.md §1), shown only when sign-in is on (ADR-014). Google's own button
 * gives the browser an ID token; the API checks it and sets the session cookie.
 */
export function SignInPage({
  googleClientId,
  onSignedIn,
}: {
  googleClientId: string | null;
  onSignedIn: () => void;
}) {
  const button = useRef<HTMLDivElement>(null);
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    if (googleClientId === null) {
      return;
    }
    let cancelled = false;
    loadGoogle()
      .then((google) => {
        if (cancelled || button.current === null) {
          return;
        }
        google.initialize({
          client_id: googleClientId,
          callback: ({ credential }) => {
            apiRequest('/auth/google', CurrentUserSchema, {
              method: 'POST',
              body: { idToken: credential },
            })
              .then(onSignedIn)
              .catch((error: unknown) =>
                setProblem(
                  error instanceof ApiError
                    ? error.message
                    : 'Sign-in failed. Try again.',
                ),
              );
          },
        });
        google.renderButton(button.current, {
          theme: 'outline',
          size: 'large',
          text: 'signin_with',
          shape: 'rectangular',
        });
      })
      .catch(() =>
        setProblem(
          'Google sign-in could not load. Check the connection and reload.',
        ),
      );
    return () => {
      cancelled = true;
    };
  }, [googleClientId, onSignedIn]);

  return (
    <main className="grid min-h-screen place-items-center bg-paper p-6">
      <section className="flex w-full max-w-[400px] flex-col gap-4">
        <h1 className="text-xl">Sign in to PayLens</h1>
        <p className="text-muted-foreground">
          Salary data for ACME, with its history and its answers.
        </p>
        {googleClientId === null ? (
          <p role="alert">
            Sign-in is required, but no Google client is configured. Set
            GOOGLE_CLIENT_ID on the API.
          </p>
        ) : (
          <div ref={button} className="min-h-10" />
        )}
        {problem !== null && <p role="alert">{problem}</p>}
      </section>
    </main>
  );
}
