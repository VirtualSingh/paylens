/** Main sections, in the order of docs/vault/design/ui-screens.md → "App shell". */
export const SECTIONS = [
  { label: 'Dashboard', path: '/' },
  { label: 'People', path: '/people' },
  { label: 'Pay bands', path: '/pay-bands' },
  { label: 'Imports', path: '/imports' },
  { label: 'Audit log', path: '/audit' },
  { label: 'Settings', path: '/settings' },
] as const;
