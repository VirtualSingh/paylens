import { useCallback, useState } from 'react';

/**
 * A per-browser display preference (columns, row density), kept in localStorage. Not for
 * anything that must be shared or survive a new browser: those belong in the API.
 */
export function usePreference<T>(
  key: string,
  fallback: T,
  read: (stored: unknown) => T | undefined,
): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : (read(JSON.parse(raw)) ?? fallback);
    } catch {
      return fallback;
    }
  });
  const save = useCallback(
    (next: T) => {
      setValue(next);
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch {
        // Storage may be refused (private window); the choice lasts until reload.
      }
    },
    [key],
  );
  return [value, save];
}
