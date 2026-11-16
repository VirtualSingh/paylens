import type { ReactNode } from 'react';
import { Button } from './ui/button';

/** Inputs and selects share one look: 36 px, 6 px radius, red border when invalid. */
export const inputClass =
  'h-9 rounded-md border border-line bg-surface px-3 aria-invalid:border-danger';

/**
 * A labelled field with its hint and error, wired for assistive technology: the control gets
 * `id`, `aria-invalid` and `aria-describedby` from `controlProps(id, error)`.
 */
export function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="font-medium">
        {label}
      </label>
      {children}
      {hint !== undefined && (
        <p id={`${id}-hint`} className="text-sm text-muted-foreground">
          {hint}
        </p>
      )}
      {error !== undefined && (
        <p id={`${id}-error`} className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export function controlProps(
  id: string,
  error: string | undefined,
  hasHint = false,
) {
  const describedBy = [
    ...(hasHint ? [`${id}-hint`] : []),
    ...(error === undefined ? [] : [`${id}-error`]),
  ];
  return {
    id,
    'aria-invalid': error !== undefined,
    'aria-describedby':
      describedBy.length === 0 ? undefined : describedBy.join(' '),
  };
}

/** The form-level message of a failed save; a stale version also offers a reload. */
export function FormAlert({
  message,
  onReload,
}: {
  message: string;
  onReload?: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex items-center justify-between gap-3 rounded-md border border-danger/40 bg-surface p-3 text-sm"
    >
      <span>{message}</span>
      {onReload !== undefined && (
        <Button type="button" variant="outline" onClick={onReload}>
          Reload
        </Button>
      )}
    </div>
  );
}
