import type { Money } from '@paylens/domain';
import type { MoneyJson } from '@paylens/shared';

/** Domain Money → its JSON form (api.md: minor units as a string, currency alongside). */
export function toMoneyJson(money: Money): MoneyJson {
  return {
    amountMinor: money.amountMinor.toString(),
    currency: money.currency,
  };
}
