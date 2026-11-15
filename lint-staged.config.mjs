import { relative } from 'node:path';

// Runs on `git commit` (via .husky/pre-commit) against the staged files only.
// ESLint goes through Nx rather than straight to `eslint`, so each project's own
// eslint.config.mjs applies, and the same run type-checks and tests every affected project:
// a commit that is red never gets made.
const toWorkspacePaths = (files) =>
  files.map((file) => relative(process.cwd(), file)).join(',');

export default {
  '*': 'prettier --write --ignore-unknown',
  '*.{ts,tsx,js,jsx,mjs,cjs,mts,cts}': (files) =>
    `nx affected -t lint typecheck test --parallel=1 --files=${toWorkspacePaths(files)}`,
};
