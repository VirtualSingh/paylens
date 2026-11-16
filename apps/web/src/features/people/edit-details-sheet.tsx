import { zodResolver } from '@hookform/resolvers/zod';
import {
  type EmployeeProfile,
  FteSchema,
  UpdateEmployeeRequestSchema,
} from '@paylens/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
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
import { employeeKeys } from './use-employee';
import { useUpdateEmployee } from './use-employee-changes';

/** The details an edit may change, compared after the form's own clean-up (trim, FTE). */
const EDITABLE = [
  'firstName',
  'lastName',
  'workEmail',
  'departmentCode',
  'jobFamilyCode',
  'levelCode',
  'jobTitle',
  'employmentType',
  'fte',
  'gender',
] as const;

function valuesOf(profile: EmployeeProfile): EmployeeFormValues {
  return {
    firstName: profile.firstName,
    lastName: profile.lastName,
    workEmail: profile.workEmail,
    departmentCode: profile.department.code,
    jobFamilyCode: profile.jobFamily.code,
    levelCode: profile.levelCode,
    jobTitle: profile.jobTitle,
    managerCode: profile.manager?.employeeCode ?? '',
    employmentType: profile.employmentType,
    // "1.00" from the database reads as "1", like the form will write it.
    fte: FteSchema.parse(profile.fte),
    gender: profile.gender ?? '',
    countryCode: profile.countryCode,
    hireDate: profile.hireDate,
    salaryAmount: '',
    salaryFrequency: 'annual',
  };
}

/**
 * "Edit details" (F-10) with If-Match. Only fields whose value changed are sent, so the audit
 * log records exactly what someone edited. Country and hire date are fixed (a transfer is v2).
 */
export function EditDetailsSheet({
  profile,
  etag,
  open,
  onOpenChange,
}: {
  profile: EmployeeProfile;
  etag: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-[560px]">
        <SheetHeader>
          <SheetTitle>
            Edit details — {profile.firstName} {profile.lastName}
          </SheetTitle>
          <SheetDescription>
            Country and hire date stay as they are; pay has its own action.
          </SheetDescription>
        </SheetHeader>
        {open && (
          <EditForm
            profile={profile}
            etag={etag}
            onDone={() => onOpenChange(false)}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

function EditForm({
  profile,
  etag,
  onDone,
}: {
  profile: EmployeeProfile;
  etag: string;
  onDone: () => void;
}) {
  const lookups = useEmployeeLookups();
  if (!lookups.ready) {
    return <p className="px-4 text-muted-foreground">Loading…</p>;
  }
  return <LoadedEditForm profile={profile} etag={etag} onDone={onDone} />;
}

function LoadedEditForm({
  profile,
  etag,
  onDone,
}: {
  profile: EmployeeProfile;
  etag: string;
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const update = useUpdateEmployee(profile.id);
  const [alert, setAlert] = useState<{
    message: string;
    conflict: boolean;
  } | null>(null);
  const initial = valuesOf(profile);
  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeFormSchema('edit', () => undefined)),
    defaultValues: initial,
  });

  async function submit(values: EmployeeFormValues) {
    setAlert(null);
    const changes: Record<string, unknown> = {};
    for (const key of EDITABLE) {
      if (
        values[key] !== initial[key] &&
        !(key === 'gender' && values[key] === '')
      ) {
        changes[key] = values[key];
      }
    }
    if (values.managerCode !== initial.managerCode) {
      const managerId = await managerIdFor(values.managerCode);
      if (managerId === undefined) {
        form.setError('managerCode', {
          message: 'There is no current employee with this code',
        });
        return;
      }
      changes['managerId'] = managerId;
    }
    if (Object.keys(changes).length === 0) {
      toast('No changes to save');
      onDone();
      return;
    }
    try {
      await update.mutateAsync({
        request: UpdateEmployeeRequestSchema.parse(changes),
        etag,
      });
      toast.success('Details saved');
      onDone();
    } catch (error) {
      const problem = formProblem(error, {
        fields: API_FIELDS,
        ruleFields: { reporting_cycle: 'managerId' },
      });
      showFieldProblems(form, problem);
      if (problem.message !== null) {
        setAlert({ message: problem.message, conflict: problem.conflict });
      }
    }
  }

  return (
    <form
      noValidate
      onSubmit={form.handleSubmit(submit)}
      className="flex flex-col gap-5 px-4"
    >
      <EmployeeFields form={form} mode="edit" />
      {alert !== null && (
        <FormAlert
          message={alert.message}
          onReload={
            alert.conflict
              ? () => {
                  setAlert(null);
                  void queryClient.invalidateQueries({
                    queryKey: employeeKeys.profile(profile.id),
                  });
                }
              : undefined
          }
        />
      )}
      <SheetFooter className="flex-row justify-end gap-2 px-0">
        <SheetClose asChild>
          <Button type="button" variant="ghost">
            Cancel
          </Button>
        </SheetClose>
        <Button type="submit" disabled={form.formState.isSubmitting}>
          Save details
        </Button>
      </SheetFooter>
    </form>
  );
}
