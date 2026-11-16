import {
  AuthConfigSchema,
  type CurrentUser,
  CurrentUserSchema,
  hasAtLeast,
  type UserRole,
} from '@paylens/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import { z } from 'zod';
import { actingRole, setActingRole } from './acting-role';
import { ApiError, apiRequest } from './api-client';

/** Where this browser stands (ADR-014). */
export type Session =
  | { readonly status: 'loading' }
  /** Sign-in off: everyone views as the role they pick. */
  | {
      readonly status: 'open';
      readonly role: UserRole;
      readonly setRole: (role: UserRole) => void;
    }
  /** Sign-in on, nobody signed in yet. */
  | {
      readonly status: 'signed-out';
      readonly googleClientId: string | null;
      readonly refresh: () => void;
    }
  | {
      readonly status: 'signed-in';
      readonly user: CurrentUser;
      readonly signOut: () => Promise<void>;
    };

const SessionContext = createContext<Session>({ status: 'loading' });

export const sessionKeys = {
  config: ['auth', 'config'] as const,
  me: ['auth', 'me'] as const,
};

/**
 * Asks the API whether people sign in (`/auth/config`), and if they do, who is signed in
 * (`/auth/me`). With sign-in off the role is local and switching it refetches everything,
 * because what a role may see differs (pay is masked for viewers).
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [role, setRoleState] = useState<UserRole>(actingRole);

  const config = useQuery({
    queryKey: sessionKeys.config,
    queryFn: async () =>
      (await apiRequest('/auth/config', AuthConfigSchema)).data,
    staleTime: Number.POSITIVE_INFINITY,
  });
  const authEnabled = config.data?.authEnabled === true;
  const me = useQuery({
    queryKey: sessionKeys.me,
    queryFn: async () => (await apiRequest('/auth/me', CurrentUserSchema)).data,
    enabled: authEnabled,
    retry: false,
  });

  const setRole = useCallback(
    (next: UserRole) => {
      setActingRole(next);
      setRoleState(next);
      void queryClient.resetQueries();
    },
    [queryClient],
  );
  const refresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: sessionKeys.me });
  }, [queryClient]);
  const signOut = useCallback(async () => {
    await apiRequest('/auth/logout', z.undefined(), { method: 'POST' });
    // Nothing of the signed-in person's data may stay on screen or in memory.
    queryClient.removeQueries({
      predicate: (query) => query.queryKey[0] !== 'auth',
    });
    await queryClient.invalidateQueries({ queryKey: sessionKeys.me });
  }, [queryClient]);

  const value = useMemo((): Session => {
    if (config.data === undefined) {
      return { status: 'loading' };
    }
    if (!config.data.authEnabled) {
      return { status: 'open', role, setRole };
    }
    if (me.data !== undefined && !me.isError) {
      return { status: 'signed-in', user: me.data, signOut };
    }
    if (me.isError && me.error instanceof ApiError && me.error.status === 401) {
      return {
        status: 'signed-out',
        googleClientId: config.data.googleClientId,
        refresh,
      };
    }
    return { status: 'loading' };
  }, [
    config.data,
    me.data,
    me.isError,
    me.error,
    role,
    setRole,
    signOut,
    refresh,
  ]);

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession(): Session {
  return useContext(SessionContext);
}

/** The role the app acts as: the picked one with sign-in off, the user's with it on. */
export function useCurrentRole(): UserRole | null {
  const session = useSession();
  if (session.status === 'open') {
    return session.role;
  }
  return session.status === 'signed-in' ? session.user.role : null;
}

/** Individual pay is for HR managers and admins (api.md → Roles). */
export function useCanManagePay(): boolean {
  const role = useCurrentRole();
  return role !== null && hasAtLeast(role, 'hr_manager');
}
