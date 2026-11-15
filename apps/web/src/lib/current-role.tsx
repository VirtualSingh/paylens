import { hasAtLeast, type UserRole } from '@paylens/shared';
import { useQueryClient } from '@tanstack/react-query';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import { devRole, setDevRole } from './dev-role';

interface CurrentRole {
  /** null: nobody is signed in (always, in production, until sign-in exists). */
  readonly role: UserRole | null;
  readonly setRole: (role: UserRole) => void;
}

const CurrentRoleContext = createContext<CurrentRole>({
  role: null,
  setRole: () => undefined,
});

/**
 * Who the app acts as. Until sign-in (2.1) this is the development role from the top bar;
 * the session hook replaces it later without changing the components that ask.
 */
export function CurrentRoleProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [role, setRoleState] = useState<UserRole | null>(devRole);

  const setRole = useCallback(
    (next: UserRole) => {
      setDevRole(next);
      setRoleState(next);
      // What a role may see differs (pay is masked for viewers): drop every cached answer.
      queryClient.resetQueries();
    },
    [queryClient],
  );

  const value = useMemo(() => ({ role, setRole }), [role, setRole]);
  return (
    <CurrentRoleContext.Provider value={value}>
      {children}
    </CurrentRoleContext.Provider>
  );
}

export function useCurrentRole(): CurrentRole {
  return useContext(CurrentRoleContext);
}

/** Individual pay is for HR managers and admins (api.md → Roles). */
export function useCanManagePay(): boolean {
  const { role } = useCurrentRole();
  return role !== null && hasAtLeast(role, 'hr_manager');
}
