import { parseAmount } from '@paylens/domain';
import {
  EMPLOYMENT_TYPES,
  type EmploymentType,
  EmployeeDirectoryPageSchema,
  FteSchema,
  type Gender,
  GENDERS,
  PAY_FREQUENCIES,
  type PayFrequencyName,
} from '@paylens/shared';
import type { UseFormReturn } from 'react-hook-form';
import { z } from 'zod';
import { controlProps, Field, inputClass } from '../../components/form-parts';
import { apiRequest } from '../../lib/api-client';
import type { FormProblem } from '../../lib/form-problems';
import { PER_PERIOD } from '../../lib/format';
import { EMPLOYMENT_LABELS, GENDER_LABELS } from '../../lib/labels';
import {
  useCountries,
  useDepartments,
  useJobFamilies,
  useJobLevels,
} from '../../lib/lookups';

/** One form shape for adding and editing a person; the add-only fields are ignored on edit. */
export interface EmployeeFormValues {
  firstName: string;
  lastName: string;
  workEmail: string;
  departmentCode: string;
  jobFamilyCode: string;
  levelCode: string;
  jobTitle: string;
  /** People type codes, not ids (api.md: "employeeCode is for humans"). */
  managerCode: string;
  employmentType: EmploymentType;
  fte: string;
  gender: Gender | '';
  countryCode: string;
  hireDate: string;
  salaryAmount: string;
  salaryFrequency: PayFrequencyName;
}

/**
 * What a person types, checked with words that say how to fix it. FTE uses the shared
 * schema itself; the request built from these values is checked again with the shared
 * contract before it is sent.
 */
export function employeeFormSchema(
  mode: 'add' | 'edit',
  currencyOf: (countryCode: string) => string | undefined,
) {
  const required = (message: string) =>
    mode === 'add' ? z.string().min(1, message) : z.string();
  return z
    .object({
      firstName: z.string().trim().min(1, 'Enter a first name').max(100),
      lastName: z.string().trim().min(1, 'Enter a last name').max(100),
      workEmail: z.email('Enter a work email like name@acme.com'),
      departmentCode: z.string().min(1, 'Choose a department'),
      jobFamilyCode: z.string().min(1, 'Choose a job family'),
      levelCode: z.string().min(1, 'Choose a level'),
      jobTitle: z.string().trim().min(1, 'Enter a job title').max(120),
      managerCode: z.string().trim().toUpperCase(),
      employmentType: z.enum(EMPLOYMENT_TYPES),
      fte: FteSchema,
      gender: z
        .union([z.enum(GENDERS), z.literal('')])
        .refine(
          (gender) => mode === 'edit' || gender !== '',
          'Choose a gender',
        ),
      countryCode: required('Choose a country'),
      hireDate: required('Choose the hire date'),
      salaryAmount: z.string(),
      salaryFrequency: z.enum(PAY_FREQUENCIES),
    })
    .superRefine((values, context) => {
      if (mode !== 'add') {
        return;
      }
      const currency = currencyOf(values.countryCode);
      const amount =
        currency === undefined
          ? null
          : parseAmount(values.salaryAmount, currency);
      if (amount === null || amount.amountMinor <= 0n) {
        context.addIssue({
          code: 'custom',
          path: ['salaryAmount'],
          message: 'Enter the starting salary, e.g. 20,00,000',
        });
      }
    });
}

/**
 * The manager's id for a typed employee code: null for an empty field (reports to nobody),
 * undefined when nobody has that code. Uses the directory search, which matches codes.
 */
export async function managerIdFor(
  code: string,
): Promise<string | null | undefined> {
  if (code === '') {
    return null;
  }
  const { data } = await apiRequest(
    `/employees?${new URLSearchParams({ q: code, pageSize: '5' })}`,
    EmployeeDirectoryPageSchema,
  );
  return data.data.find((person) => person.employeeCode === code)?.id;
}

/** The API's field names (problem `errors[].path`) → this form's fields. */
const API_TO_FORM: Readonly<Record<string, keyof EmployeeFormValues>> = {
  firstName: 'firstName',
  lastName: 'lastName',
  workEmail: 'workEmail',
  departmentCode: 'departmentCode',
  jobFamilyCode: 'jobFamilyCode',
  levelCode: 'levelCode',
  jobTitle: 'jobTitle',
  managerId: 'managerCode',
  employmentType: 'employmentType',
  fte: 'fte',
  gender: 'gender',
  countryCode: 'countryCode',
  hireDate: 'hireDate',
  salary: 'salaryAmount',
};
export const API_FIELDS = Object.keys(API_TO_FORM);

/** Puts a failed save's field errors onto this form (API names like managerId translated). */
export function showFieldProblems(
  form: UseFormReturn<EmployeeFormValues>,
  problem: FormProblem,
): void {
  for (const { field, message } of problem.fields) {
    const name = API_TO_FORM[field];
    if (name !== undefined) {
      form.setError(name, { message });
    }
  }
}

/** Whether every lookup the form's selects need has arrived. */
export function useEmployeeLookups() {
  const countries = useCountries();
  const departments = useDepartments();
  const jobFamilies = useJobFamilies();
  const levels = useJobLevels();
  const ready =
    countries.data !== undefined &&
    departments.data !== undefined &&
    jobFamilies.data !== undefined &&
    levels.data !== undefined;
  return {
    ready,
    countries: countries.data ?? [],
    departments: departments.data ?? [],
    jobFamilies: jobFamilies.data ?? [],
    levels: levels.data ?? [],
  };
}

/** The fields of a person, shared by "Add employee" and "Edit details". */
export function EmployeeFields({
  form,
  mode,
}: {
  form: UseFormReturn<EmployeeFormValues>;
  mode: 'add' | 'edit';
}) {
  const { errors } = form.formState;
  const lookups = useEmployeeLookups();
  const country = form.watch('countryCode');
  const currency = lookups.countries.find(
    (c) => c.code === country,
  )?.currencyCode;

  const text = (
    name: keyof EmployeeFormValues,
    label: string,
    options: { type?: string; hint?: string } = {},
  ) => (
    <Field
      id={`employee-${name}`}
      label={label}
      hint={options.hint}
      error={errors[name]?.message}
    >
      <input
        type={options.type ?? 'text'}
        className={inputClass}
        {...controlProps(
          `employee-${name}`,
          errors[name]?.message,
          options.hint !== undefined,
        )}
        {...form.register(name)}
      />
    </Field>
  );
  const select = (
    name: keyof EmployeeFormValues,
    label: string,
    choices: readonly { value: string; label: string }[],
    placeholder = true,
  ) => (
    <Field id={`employee-${name}`} label={label} error={errors[name]?.message}>
      <select
        className={inputClass}
        {...controlProps(`employee-${name}`, errors[name]?.message)}
        {...form.register(name)}
      >
        {placeholder && <option value="">Choose…</option>}
        {choices.map((choice) => (
          <option key={choice.value} value={choice.value}>
            {choice.label}
          </option>
        ))}
      </select>
    </Field>
  );

  return (
    <div className="grid grid-cols-2 gap-4">
      {text('firstName', 'First name')}
      {text('lastName', 'Last name')}
      <div className="col-span-2">
        {text('workEmail', 'Work email', { type: 'email' })}
      </div>
      {mode === 'add' &&
        select(
          'countryCode',
          'Country',
          lookups.countries.map((c) => ({ value: c.code, label: c.name })),
        )}
      {select(
        'departmentCode',
        'Department',
        lookups.departments.map((d) => ({ value: d.code, label: d.name })),
      )}
      {select(
        'jobFamilyCode',
        'Job family',
        lookups.jobFamilies.map((f) => ({ value: f.code, label: f.name })),
      )}
      {select(
        'levelCode',
        'Level',
        lookups.levels.map((l) => ({ value: l.code, label: l.code })),
      )}
      <div className="col-span-2">{text('jobTitle', 'Job title')}</div>
      <div className="col-span-2">
        {text('managerCode', 'Manager’s employee code', {
          hint: 'For example ACME-000421. Leave empty if they report to nobody.',
        })}
      </div>
      {select(
        'employmentType',
        'Employment type',
        EMPLOYMENT_TYPES.map((t) => ({
          value: t,
          label: EMPLOYMENT_LABELS[t],
        })),
        false,
      )}
      {text('fte', 'FTE', { hint: 'Share of full time, e.g. 1 or 0.5' })}
      {select(
        'gender',
        'Gender',
        GENDERS.map((g) => ({ value: g, label: GENDER_LABELS[g] })),
      )}
      {mode === 'add' && (
        <>
          {text('hireDate', 'Hire date', { type: 'date' })}
          <div className="col-span-2 flex flex-col gap-1">
            <Field
              id="employee-salaryAmount"
              label="Starting salary"
              hint={
                currency === undefined
                  ? 'Choose the country first: it sets the currency.'
                  : `In ${currency}. Starts on the hire date, with reason "hire".`
              }
              error={errors.salaryAmount?.message}
            >
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  className={`${inputClass} w-48 text-right tabular-nums`}
                  {...controlProps(
                    'employee-salaryAmount',
                    errors.salaryAmount?.message,
                    true,
                  )}
                  {...form.register('salaryAmount')}
                />
                <label htmlFor="employee-salaryFrequency" className="sr-only">
                  Pay frequency
                </label>
                <select
                  id="employee-salaryFrequency"
                  className={inputClass}
                  {...form.register('salaryFrequency')}
                >
                  {PAY_FREQUENCIES.map((frequency) => (
                    <option key={frequency} value={frequency}>
                      / {PER_PERIOD[frequency]}
                    </option>
                  ))}
                </select>
              </div>
            </Field>
          </div>
        </>
      )}
    </div>
  );
}
