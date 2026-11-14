# React for Angular engineers — the PayLens cheat sheet

For Pushpendra, not for the agent. One page to read before reviewing `apps/web`, and again
before the interview. Every row maps something you already know to what you will see in the code.

## Mental model

Angular: classes + decorators + DI + templates with change detection (zones or signals).
React: functions that return UI; state changes re-run the function; everything else is a
library choice. There is no DI container — composition and hooks replace it.

| Angular | React (as used in PayLens) | What to look for in the code |
|---|---|---|
| Component class + template | Function component returning JSX | `export function DirectoryPage() { … return (<…/>) }` |
| `@Input()` / `@Output()` | Props / callback props | `<BandBar min={…} onSelect={…} />` |
| Signals / `ngModel` local state | `useState`, `useReducer` | `const [open, setOpen] = useState(false)` |
| `ngOnInit` / effects | `useEffect` (rarely needed) | Prefer data hooks; effects only for subscriptions/DOM |
| Service with `HttpClient` + RxJS cache | **TanStack Query** hooks | `useEmployees(params)` → `{ data, isLoading, error }`; cache keyed by `queryKeys.employees(params)` |
| Mutations via service then refetch | `useMutation` + `invalidateQueries` | `useChangeSalary()` invalidates profile/history/directory |
| DI token / providers | Context + custom hooks (sparingly) | `useSession()` reads `SessionProvider` |
| Router with lazy modules, guards | React Router routes with `lazy`, `RequireRole` wrapper | `app/router.tsx` |
| Route params / query params | `useParams`, `useSearchParams` | Directory filters live in the URL |
| Reactive forms + validators | **react-hook-form** + Zod resolver | Same schema as the API: `salaryChangeSchema` |
| Pipes (`currency`, `date`) | Plain functions / components | `MoneyText`, `formatDate` in `lib/format.ts` |
| `*ngIf` / `*ngFor` / `@if` / `@for` | `cond && <X/>`, `items.map(...)` with `key` | Keys must be stable ids, never array index |
| `OnPush` / signals for perf | `memo`, `useMemo`, `useCallback` — only when measured | Default is fine; don't sprinkle memo |
| Interceptors | Wrapper around `fetch` in `lib/api.ts` | request id header, problem+json mapping |
| Guards | `RequireRole` component + API 403 handling | UI hides, API enforces |
| Angular Material / PrimeNG | shadcn/ui primitives on Radix | Components are files in `src/ui/` you can read and edit |
| SCSS theming | Tailwind utilities + CSS variables (tokens) | `styles/tokens.css`, `@theme` |
| TestBed + Jasmine/Vitest | Vitest + Testing Library | Query by role/label, assert what the user sees |
| Zone.js change detection | Nothing — React re-renders the component whose state changed | Keep state local; lift only when shared |

## Five rules the code follows (so you can predict it)

1. Components never fetch; hooks do. One hook per server interaction.
2. Server state lives in Query; UI state lives in the component; list state lives in the URL.
3. Forms validate with the shared Zod schema — the same object the NestJS pipe uses.
4. No global store, no HOCs, no render props. If you see one, ask the agent why.
5. Accessibility comes from Radix primitives plus labels, `aria-sort`, focus rings, reduced motion.

## Questions an interviewer may ask — and the honest answers

- *Why React and not Angular?* The brief restricted the UI to React/Next for non-Java roles; the
  JD lists React as a nice-to-have. The backend is where my architecture lives (NestJS, which
  mirrors Angular's DI and module system).
- *How do you avoid prop drilling?* Composition first; Context only for session and theme;
  server data via Query hooks wherever it is needed (cache dedupes requests).
- *How does Query differ from RxJS services?* It is a server-state cache with lifecycle
  (stale, refetch, invalidate) rather than a stream abstraction; simpler for request/response data.
- *What would you change with more time?* Keyset pagination, dark mode, saved views, and a
  design-system package shared with a future mobile app.

## Reading order for `apps/web`

`app/router.tsx` → `lib/api.ts` → `features/people/DirectoryPage.tsx` → `components/DataTable.tsx`
→ `features/people/SalaryChangeSheet.tsx` → `components/BandBar.tsx` → one test file next to each.
