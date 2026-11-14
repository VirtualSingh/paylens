import nx from '@nx/eslint-plugin';
import security from 'eslint-plugin-security';
import tseslint from 'typescript-eslint';

const typeScriptFiles = ['**/*.ts', '**/*.tsx', '**/*.cts', '**/*.mts'];
const testFiles = [
  '**/*.spec.ts',
  '**/*.spec.tsx',
  '**/*.e2e-spec.ts',
  '**/testing/**/*.ts',
];

export default [
  ...nx.configs['flat/base'],
  ...nx.configs['flat/typescript'],
  ...nx.configs['flat/javascript'],
  // typescript-eslint "strict": no `any`, no non-null assertions, no extraneous classes, …
  // Scoped to TypeScript files so plain JS config files are not linted as TS.
  ...tseslint.configs.strict.map((config) => ({
    ...config,
    files: typeScriptFiles,
  })),
  security.configs.recommended,
  {
    ignores: [
      '**/dist',
      '**/out-tsc',
      '**/vitest.config.*.timestamp*',
      '**/vite.config.*.timestamp*',
      '**/test-output',
    ],
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {
      // Architecture boundaries (docs/vault/design/architecture.md). Every project must
      // carry a `type:*` tag; anything not listed here is denied.
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: true,
          allow: ['^.*/eslint(\\.base)?\\.config\\.[cm]?[jt]s$'],
          depConstraints: [
            {
              sourceTag: 'type:api',
              onlyDependOnLibsWithTags: ['type:shared', 'type:domain'],
            },
            {
              sourceTag: 'type:web',
              onlyDependOnLibsWithTags: ['type:shared'],
            },
            {
              // Pure business rules: no frameworks, no libraries, no other projects.
              sourceTag: 'type:domain',
              onlyDependOnLibsWithTags: [],
              allowedExternalImports: [],
            },
            {
              // Contracts shared by api and web: Zod only.
              sourceTag: 'type:shared',
              onlyDependOnLibsWithTags: [],
              allowedExternalImports: ['zod'],
            },
            {
              sourceTag: 'type:e2e',
              onlyDependOnLibsWithTags: [],
            },
          ],
        },
      ],
    },
  },
  {
    // Tests may assert that a value exists with `!` after checking it; production code may not.
    files: testFiles,
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
];
