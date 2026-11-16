import { zodResolver } from '@hookform/resolvers/zod';
import { parseAmount } from '@paylens/domain';
import { CreateEmployeeRequestSchema } from '@paylens/shared';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { FormAlert } from '../../components/form-parts';
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
import { formProblem } from '../../lib/form-problems';
import {
  API_FIELDS,
  EmployeeFields,
  type EmployeeFormValues,
  employeeFormSchema,
  managerIdFor,
  showFieldProblems,
  useEmployeeLookups,
} from './employee-form';
import { useCreateEmployee } from './use-employee-changes';

const EMPTY: EmployeeFormValues = {
  firstName: '',
  lastName: '',
  workEmail: '',
  departmentCode: '',
  jobFamilyCode: '',
  levelCode: '',
  jobTitle: '',
  managerCode: '',
  employmentType: 'full_time',
  fte: '1',
  gender: '',
  countryCode: '',
  hireDate: '',
  salaryAmount: '',
  salaryFrequency: 'annual',
};

/** "Add employee" (F-10): a new person and the salary they are hired on, in one save. */
export function AddEmployeeSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-[560px]">
        <SheetHeader>
          <SheetTitle>Add employee</SheetTitle>
          <SheetDescription>
            They get the next employee code; country and hire date cannot change
            later.
          </SheetDescription>
        </SheetHeader>
        {open && <AddForm onDone={() => onOpenChange(false)} />}
      </SheetContent>
    </Sheet>
  );
}

function AddForm({ onDone }: { onDone: () => void }) {
  const lookups = useEmployeeLookups();
  if (!lookups.ready) {
    return <p className="px-4 text-muted-foreground">Loading…</p>;
  }
  return <LoadedAddForm onDone={onDone} />;
}

function LoadedAddForm({ onDone }: { onDone: () => void }) {
  const navigate = useNavigate();
  const create = useCreateEmployee();
  const lookups = useEmployeeLookups();
  const [alert, setAlert] = useState<string | null>(null);
  const currencyOf = (countryCode: string) =>
    lookups.countries.find((country) => country.code === countryCode)
      ?.currencyCode;
  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeFormSchema('add', currencyOf)),
    defaultValues: EMPTY,
  });

  async function submit(values: EmployeeFormValues) {
    setAlert(null);
    const managerId = await managerIdFor(values.managerCode);
    if (managerId === undefined) {
      form.setError('managerCode', {
        message: 'There is no current employee with this code',
      });
      return;
    }
    const currency = currencyOf(values.countryCode) ?? '';
    const amount = parseAmount(values.salaryAmount, currency);
    const request = CreateEmployeeRequestSchema.parse({
      firstName: values.firstName,
      lastName: values.lastName,
      workEmail: values.workEmail,
      countryCode: values.countryCode,
      departmentCode: values.departmentCode,
      jobFamilyCode: values.jobFamilyCode,
      levelCode: values.levelCode,
      jobTitle: values.jobTitle,
      managerId,
      employmentType: values.employmentType,
      fte: values.fte,
      hireDate: values.hireDate,
      gender: values.gender,
      salary: {
        amount: {
          amountMinor: (amount?.amountMinor ?? 0n).toString(),
          currency,
        },
        frequency: values.salaryFrequency,
      },
    });
    try {
      const profile = await create.mutateAsync(request);
      toast.success(`Employee added — ${profile.employeeCode}`);
      onDone();
      navigate(`/people/${profile.id}`);
    } catch (error) {
      const problem = formProblem(error, {
        fields: API_FIELDS,
        conflictField: 'workEmail',
        ruleFields: {
          salary_not_positive: 'salary',
          salary_currency_not_country_currency: 'salary',
        },
      });
      showFieldProblems(form, problem);
      setAlert(problem.message);
    }
  }

  return (
    <form
      noValidate
      onSubmit={form.handleSubmit(submit)}
      className="flex flex-col gap-5 px-4"
    >
      <EmployeeFields form={form} mode="add" />
      {alert !== null && <FormAlert message={alert} />}
      <SheetFooter className="flex-row justify-end gap-2 px-0">
        <SheetClose asChild>
          <Button type="button" variant="ghost">
            Cancel
          </Button>
        </SheetClose>
        <Button type="submit" disabled={form.formState.isSubmitting}>
          Add employee
        </Button>
      </SheetFooter>
    </form>
  );
}
