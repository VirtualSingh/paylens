const CODE = /^ACME-(\d{6})$/;
const LAST_NUMBER = 999_999;

/**
 * The code for the next person: one past the highest code in use ("ACME-000421" for people,
 * the uuid for URLs, data-model.md). Codes are fixed-width, so the highest code sorts last.
 * The caller serialises allocation (one transaction at a time) and the unique constraint
 * backs it up.
 */
export function nextEmployeeCode(highest: string | null): string {
  if (highest === null) {
    return format(1);
  }
  const digits = CODE.exec(highest)?.[1];
  if (digits === undefined) {
    throw new Error(`Unexpected employee code "${highest}"`);
  }
  const next = Number(digits) + 1;
  if (next > LAST_NUMBER) {
    throw new Error('Employee codes are exhausted');
  }
  return format(next);
}

function format(number: number): string {
  return `ACME-${String(number).padStart(6, '0')}`;
}
