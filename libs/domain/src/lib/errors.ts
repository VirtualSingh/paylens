/**
 * A business rule was broken (for example a salary dated before the current one). The API's
 * problem+json filter turns every DomainError into a 422 that carries `code`, so clients can
 * react to the rule, not to the wording of the message.
 */
export abstract class DomainError extends Error {
  /** Stable, machine-readable name of the rule, e.g. "currency_mismatch". */
  abstract readonly code: string;

  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}
