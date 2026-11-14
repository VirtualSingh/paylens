// Conventional Commits, limited to the types CLAUDE.md allows. `security:` is ours, not
// part of the conventional preset.
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'test',
        'feat',
        'fix',
        'refactor',
        'docs',
        'chore',
        'ci',
        'perf',
        'security',
      ],
    ],
  },
};
