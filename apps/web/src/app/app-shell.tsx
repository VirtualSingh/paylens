import { USER_ROLES, type UserRole } from '@paylens/shared';
import { type FormEvent, useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router';
import { useCurrentRole } from '../lib/current-role';
import { reportingCurrencies, useCountries } from '../lib/lookups';
import { useReportingCurrency } from '../lib/reporting-currency';
import { CommandPalette } from './command-palette';
import { SECTIONS } from './sections';

const ROLE_LABELS: Record<UserRole, string> = {
  viewer: 'Viewer',
  hr_manager: 'HR manager',
  admin: 'Admin',
};

const selectClass =
  'h-8 rounded-md border border-line bg-surface px-2 text-base tabular-nums';

/** Left navigation (240 px) + top bar (56 px) + content with 24 px padding (ui.md → Layout). */
export function AppShell() {
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
                <NavLink
                  to={section.path}
                  end={section.path === '/'}
                  className={({ isActive }) =>
                    `flex h-9 items-center rounded-md px-3 hover:bg-teal-soft ${
                      isActive ? 'bg-teal-soft font-medium' : ''
                    }`
                  }
                >
                  {section.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <CommandPalette />
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function TopBar() {
  return (
    <header className="flex h-14 items-center gap-6 border-b border-line px-6">
      <PeopleSearch />
      <div className="ml-auto flex items-center gap-6">
        <ReportingCurrencySwitch />
        {import.meta.env.DEV && <DevRoleSwitch />}
      </div>
    </header>
  );
}

/** Typing a name and pressing Enter opens the directory filtered by it; "/" focuses it. */
function PeopleSearch() {
  const navigate = useNavigate();
  const [text, setText] = useState('');
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function focusOnSlash(event: KeyboardEvent) {
      const target = event.target;
      const typing =
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));
      if (event.key === '/' && !typing) {
        event.preventDefault();
        input.current?.focus();
      }
    }
    window.addEventListener('keydown', focusOnSlash);
    return () => window.removeEventListener('keydown', focusOnSlash);
  }, []);

  function search(event: FormEvent) {
    event.preventDefault();
    const q = text.trim();
    navigate(q === '' ? '/people' : `/people?${new URLSearchParams({ q })}`);
  }

  return (
    <form role="search" onSubmit={search} className="w-80">
      <input
        type="search"
        aria-label="Search people"
        ref={input}
        placeholder="Search people, or press ⌘K"
        value={text}
        onChange={(event) => setText(event.target.value)}
        className="h-8 w-full rounded-md border border-line bg-surface px-3"
      />
    </form>
  );
}

function ReportingCurrencySwitch() {
  const { currency, setCurrency } = useReportingCurrency();
  const countries = useCountries();
  const currencies = reportingCurrencies(countries.data ?? []);
  return (
    <label className="flex items-center gap-2 text-sm text-muted-foreground">
      Reporting currency
      <select
        className={selectClass}
        value={currency}
        onChange={(event) => setCurrency(event.target.value)}
      >
        {currencies.map((code) => (
          <option key={code}>{code}</option>
        ))}
      </select>
    </label>
  );
}

/** TEMPORARY until sign-in (2.1): development builds only; see lib/dev-role.ts. */
function DevRoleSwitch() {
  const { role, setRole } = useCurrentRole();
  return (
    <label className="flex items-center gap-2 text-sm text-muted-foreground">
      Acting as (development only)
      <select
        className={selectClass}
        value={role ?? 'hr_manager'}
        onChange={(event) => {
          const next = USER_ROLES.find(
            (candidate) => candidate === event.target.value,
          );
          if (next !== undefined) {
            setRole(next);
          }
        }}
      >
        {USER_ROLES.map((value) => (
          <option key={value} value={value}>
            {ROLE_LABELS[value]}
          </option>
        ))}
      </select>
    </label>
  );
}
