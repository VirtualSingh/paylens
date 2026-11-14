import type { ReactNode } from 'react';

/** Main sections, in the order of docs/vault/design/ui-screens.md → "App shell". */
const SECTIONS = [
  { label: 'Dashboard', path: '/' },
  { label: 'People', path: '/people' },
  { label: 'Pay bands', path: '/pay-bands' },
  { label: 'Imports', path: '/imports' },
  { label: 'Audit log', path: '/audit' },
  { label: 'Settings', path: '/settings' },
] as const;

interface AppShellProps {
  readonly children: ReactNode;
}

/**
 * Left navigation (240 px) + top bar (56 px) + content with 24 px padding (ui.md → Layout).
 * Links are plain anchors until React Router arrives with the first real routes (Phase 2).
 */
export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex min-h-screen">
      <aside className="flex w-60 shrink-0 flex-col border-r border-line">
        <div className="flex h-14 items-center px-6 text-md font-semibold">
          PayLens
        </div>
        <nav aria-label="Main" className="px-3 py-2">
          <ul className="flex flex-col gap-0.5">
            {SECTIONS.map((section) => (
              <li key={section.path}>
                <a
                  href={section.path}
                  className="flex h-9 items-center rounded-md px-3 hover:bg-teal-soft"
                >
                  {section.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar: global search (⌘K) and the reporting-currency switch arrive in Phase 2. */}
        <header className="h-14 border-b border-line" />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
