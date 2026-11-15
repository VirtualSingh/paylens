/**
 * A calendar date as `YYYY-MM-DD` (UTC, no time). Effective dating uses dates, not
 * timestamps (CLAUDE.md). In this format, string order is chronological order, so dates
 * compare with `<` and `>` directly.
 */
export type IsoDate = string;
