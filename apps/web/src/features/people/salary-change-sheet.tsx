import { zodResolver } from '@hookform/resolvers/zod';
import { annualize, bandMetrics, Money, parseAmount } from '@paylens/domain';
import {
  CHANGE_REASONS,
  type EmployeeProfile,
  PAY_FREQUENCIES,
  type SalaryChangeRequest,
  SalaryChangeRequestSchema,
  type SalaryRecordJson,
} from '@paylens/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { type FieldPath, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { formatMoney } from '../../components/money';
import { Button } from '../../components/ui/button';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '../../components/ui/sheet';
import { ApiError } from '../../lib/api-client';
import {
  formatDate,
  PER_PERIOD,
  salaryChange,
  salaryChangeRatio,
} from '../../lib/format';
import { REASON_LABELS } from '../../lib/labels';
import { useChangeSalary } from './use-change-salary';
import { employeeKeys } from './use-employee';

interface ChangeForm {
  effectiveFrom: string;
  amount: string;
  frequency: (typeof PAY_FREQUENCIES)[number];
  reason: (typeof CHANGE_REASONS)[number];
  note: string;
}

/** Domain rule codes (422) that belong to one field, so the message appears next to it. */
const FIELD_OF_RULE: Readonly<Record<string, FieldPath<ChangeForm>>> = {
  effective_date_not_after_current: 'effectiveFrom',
  correction_outside_history: 'effectiveFrom',
  salary_not_positive: 'amount',
  salary_currency_not_country_currency: 'amount',
};

/** A change bigger than this share of the current salary gets a warning. */
const UNUSUAL_CHANGE = 0.25;

const POSITION_WORDS = {
  below: 'below band',
  within: 'within band',
  above: 'above band',
} as const;

/** What a person types, checked as they will mean it; the shared schema checks the request. */
function changeFormSchema(currency: string) {
  return z.object({
    effectiveFrom: z.string().min(1, 'Choose the date the new salary starts'),
    amount: z
      .string()
      .refine(
        (text) => (parseAmount(text, currency)?.amountMinor ?? 0n) > 0n,
        `Enter the new salary, e.g. ${currency === 'INR' ? '31,00,000' : '85,000'}`,
      ),
    frequency: z.enum(PAY_FREQUENCIES),
    reason: z.enum(CHANGE_REASONS),
    note: z.string().max(500, 'Keep the note under 500 characters'),
  });
}

/**
 * "Change salary" (ui-screens.md §6), the flagship interaction: a live preview computed with
 * the same libs/domain functions the server uses, a pessimistic save with If-Match, and
 * errors placed where they help — a broken rule next to its field, a conflict with a reload.
 */
export function SalaryChangeSheet({
  profile,
  etag,
  history,
  countryName,
  open,
  onOpenChange,
}: {
  profile: EmployeeProfile;
  etag: string;
  history: readonly SalaryRecordJson[];
  countryName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const currency = profile.pay?.salary.currency ?? 'USD';
  const queryClient = useQueryClient();
  const change = useChangeSalary(profile.id);
  const [formError, setFormError] = useState<{
    message: string;
    conflict: boolean;
  } | null>(null);
  const form = useForm<ChangeForm>({
    resolver: zodResolver(changeFormSchema(currency)),
    defaultValues: {
      effectiveFrom: '',
      amount: '',
      frequency: profile.pay?.frequency ?? 'annual',
      reason: 'merit',
      note: '',
    },
  });
  const { errors } = form.formState;
  const values = form.watch();
  const current = history.find((record) => record.effectiveTo === null);

  async function submit(values: ChangeForm) {
    setFormError(null);
    const amount = parseAmount(values.amount, currency);
    const request: SalaryChangeRequest = SalaryChangeRequestSchema.parse({
      effectiveFrom: values.effectiveFrom,
      amount: {
        amountMinor: (amount?.amountMinor ?? 0n).toString(),
        currency,
      },
      frequency: values.frequency,
      reason: values.reason,
      note: values.note.trim() === '' ? undefined : values.note.trim(),
    });
    try {
      await change.mutateAsync({ request, etag });
      toast.success(
        `Salary change recorded — effective ${formatDate(request.effectiveFrom)}`,
      );
      form.reset();
      onOpenChange(false);
    } catch (error) {
      showError(error);
    }
  }

  function showError(error: unknown) {
    if (!(error instanceof ApiError)) {
      setFormError({
        message: 'The change could not be recorded. Try again.',
        conflict: false,
      });
      return;
    }
    if (error.status === 409) {
      setFormError({ message: error.message, conflict: true });
      return;
    }
    const field =
      error.problem.code === undefined
        ? undefined
        : FIELD_OF_RULE[error.problem.code];
    if (field !== undefined) {
      form.setError(field, { message: error.message });
      return;
    }
    if (error.status === 400 && error.problem.errors !== undefined) {
      for (const { path, message } of error.problem.errors) {
        const name = path.split('.')[0];
        const known = (
          ['effectiveFrom', 'amount', 'frequency', 'reason', 'note'] as const
        ).find((candidate) => candidate === name);
        if (known !== undefined) {
          form.setError(known, { message });
        }
      }
      return;
    }
    const requestId = error.problem.requestId;
    setFormError({
      message: `${error.message}${requestId === undefined ? '' : ` (request ${requestId})`}`,
      conflict: false,
    });
  }

  async function reload() {
    setFormError(null);
    await queryClient.invalidateQueries({
      queryKey: employeeKeys.profile(profile.id),
    });
  }

  const field = (name: FieldPath<ChangeForm>) => ({
    id: `change-${name}`,
    'aria-invalid': errors[name] !== undefined,
    'aria-describedby':
      errors[name] !== undefined ? `change-${name}-error` : undefined,
  });
  const fieldError = (name: FieldPath<ChangeForm>) =>
    errors[name]?.message === undefined ? null : (
      <p id={`change-${name}-error`} className="text-sm text-danger">
        {errors[name].message}
      </p>
    );
  const inputClass =
    'h-9 rounded-md border border-line bg-surface px-3 aria-invalid:border-danger';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-[480px]">
        <SheetHeader>
          <SheetTitle>
            Change salary — {profile.firstName} {profile.lastName}
          </SheetTitle>
          <SheetDescription>
            The new salary starts on the effective date; history before it stays
            as it was.
          </SheetDescription>
        </SheetHeader>

        <form
          noValidate
          onSubmit={form.handleSubmit(submit)}
          className="flex flex-col gap-5 px-4"
        >
          <div className="flex flex-col gap-1">
            <label htmlFor="change-effectiveFrom" className="font-medium">
              Effective from
            </label>
            <input
              type="date"
              className={inputClass}
              {...field('effectiveFrom')}
              {...form.register('effectiveFrom')}
            />
            {current !== undefined && values.reason !== 'correction' && (
              <p className="text-sm text-muted-foreground">
                Must be after {formatDate(current.effectiveFrom)}
              </p>
            )}
            {fieldError('effectiveFrom')}
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="change-amount" className="font-medium">
              New salary
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                inputMode="decimal"
                autoComplete="off"
                className={`${inputClass} w-48 text-right tabular-nums`}
                {...field('amount')}
                {...form.register('amount')}
              />
              <label htmlFor="change-frequency" className="sr-only">
                Pay frequency
              </label>
              <select
                id="change-frequency"
                className={inputClass}
                {...form.register('frequency')}
              >
                {PAY_FREQUENCIES.map((frequency) => (
                  <option key={frequency} value={frequency}>
                    / {PER_PERIOD[frequency]}
                  </option>
                ))}
              </select>
              <span className="text-sm text-muted-foreground">
                currency fixed: {currency}
              </span>
            </div>
            {fieldError('amount')}
          </div>

          <fieldset className="flex flex-col gap-1">
            <legend className="mb-1 font-medium">Reason</legend>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {CHANGE_REASONS.map((reason) => (
                <label key={reason} className="flex items-center gap-1.5">
                  <input
                    type="radio"
                    value={reason}
                    {...form.register('reason')}
                  />
                  {REASON_LABELS[reason]}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="flex flex-col gap-1">
            <label htmlFor="change-note" className="font-medium">
              Note
            </label>
            <textarea
              rows={2}
              className="rounded-md border border-line bg-surface px-3 py-2"
              {...field('note')}
              {...form.register('note')}
            />
            {fieldError('note')}
          </div>

          <Preview
            profile={profile}
            countryName={countryName}
            amountText={values.amount}
            frequency={values.frequency}
            reason={values.reason}
            currency={currency}
          />

          {formError !== null && (
            <div
              role="alert"
              className="flex items-center justify-between gap-3 rounded-md border border-danger/40 bg-surface p-3 text-sm"
            >
              <span>{formError.message}</span>
              {formError.conflict && (
                <Button type="button" variant="outline" onClick={reload}>
                  Reload
                </Button>
              )}
            </div>
          )}

          <SheetFooter className="flex-row justify-end gap-2 px-0">
            <SheetClose asChild>
              <Button type="button" variant="ghost">
                Cancel
              </Button>
            </SheetClose>
            <Button type="submit" disabled={change.isPending}>
              {change.isPending ? 'Recording…' : 'Record change'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

/** The change in money and in band terms, before anything is saved (ui.md → Confirmation). */
function Preview({
  profile,
  countryName,
  amountText,
  frequency,
  reason,
  currency,
}: {
  profile: EmployeeProfile;
  countryName: string;
  amountText: string;
  frequency: ChangeForm['frequency'];
  reason: ChangeForm['reason'];
  currency: string;
}) {
  const pay = profile.pay;
  const amount = parseAmount(amountText, currency);
  if (pay === null || pay === undefined || amount === null) {
    return null;
  }
  const json = (money: Money) => ({
    amountMinor: money.amountMinor.toString(),
    currency: money.currency,
  });
  const newAnnual = annualize(amount, frequency);
  const delta = newAnnual.subtract(
    Money.of(BigInt(pay.annualLocal.amountMinor), currency),
  );
  const percent = salaryChange(
    { salary: pay.salary, frequency: pay.frequency },
    { salary: json(amount), frequency },
  );
  const band = pay.band;
  const after =
    band === null
      ? null
      : bandMetrics(newAnnual, {
          min: Money.of(BigInt(band.min.amountMinor), currency),
          mid: Money.of(BigInt(band.mid.amountMinor), currency),
          max: Money.of(BigInt(band.max.amountMinor), currency),
        });

  const warnings: string[] = [];
  if (band !== null && after?.position === 'above') {
    warnings.push(`Above the band maximum of ${formatMoney(band.max)}`);
  }
  if (band !== null && after?.position === 'below') {
    warnings.push(`Below the band minimum of ${formatMoney(band.min)}`);
  }
  const ratio = salaryChangeRatio(
    { salary: pay.salary, frequency: pay.frequency },
    { salary: json(amount), frequency },
  );
  // More than a quarter either way is rare for one change, and the usual sign of a typo
  // (an extra zero, or a monthly amount entered as annual).
  if (ratio !== null && Math.abs(ratio) > UNUSUAL_CHANGE && percent !== null) {
    warnings.push(`A change of ${percent} is unusual — check the amount`);
  }

  return (
    <section
      aria-labelledby="change-preview"
      className="flex flex-col gap-1 border-t border-line pt-4"
    >
      <h3 id="change-preview" className="font-medium">
        Preview
      </h3>
      <dl className="grid grid-cols-[140px_1fr] gap-y-1">
        <dt className="text-muted-foreground">Change</dt>
        <dd className="tabular-nums">
          {`${delta.amountMinor > 0n ? '+' : ''}${formatMoney(json(delta))}${percent === null ? '' : ` · ${percent}`}`}
        </dd>
        {after !== null && (
          <>
            <dt className="text-muted-foreground">
              Band {profile.levelCode} · {countryName}
            </dt>
            <dd className="tabular-nums">
              {`compa-ratio ${pay.compaRatio === null ? '—' : pay.compaRatio.toFixed(2)} → ${after.compaRatio.toFixed(2)} · ${POSITION_WORDS[after.position]}`}
            </dd>
          </>
        )}
      </dl>
      {warnings.length > 0 && (
        <ul
          aria-label="Warnings"
          className="flex flex-col gap-0.5 text-sm text-below"
        >
          {warnings.map((warning) => (
            <li key={warning}>▲ {warning}</li>
          ))}
        </ul>
      )}
      {reason === 'promotion' && (
        <p className="text-sm text-muted-foreground">
          Promotion to a new level? Change the level in Details first, so the
          preview uses that level’s band.
        </p>
      )}
    </section>
  );
}
