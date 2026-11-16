import { zodResolver } from '@hookform/resolvers/zod';
import {
  EMPLOYEE_STATUSES,
  type EmployeeProfile,
  EmployeeStatusChangeRequestSchema,
} from '@paylens/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import {
  controlProps,
  Field,
  FormAlert,
  inputClass,
} from '../../components/form-parts';
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
import { formatDate } from '../../lib/format';
import { formProblem } from '../../lib/form-problems';
import { STATUS_LABELS } from '../../lib/labels';
import { employeeKeys } from './use-employee';
import { useChangeStatus } from './use-employee-changes';

const StatusFormSchema = z.object({
  status: z.enum(EMPLOYEE_STATUSES),
  effectiveDate: z.string().min(1, 'Choose the date it takes effect'),
  confirmCode: z.string(),
});
type StatusForm = z.infer<typeof StatusFormSchema>;

/** Domain rules (ADR-013) and the field each one is about. */
const RULE_FIELDS = {
  status_date_before_hire: 'effectiveDate',
  termination_before_current_salary: 'effectiveDate',
  status_unchanged: 'status',
  employee_terminated: 'status',
} as const;

/**
 * Leave, return or termination (F-11). A termination is final (ADR-013), so it asks for the
 * employee code to be typed before it can be sent (ui.md → Confirmation).
 */
export function StatusSheet({
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
  const queryClient = useQueryClient();
  const changeStatus = useChangeStatus(profile.id);
  const [alert, setAlert] = useState<{
    message: string;
    conflict: boolean;
  } | null>(null);
  const choices = EMPLOYEE_STATUSES.filter(
    (status) => status !== profile.status,
  );
  const form = useForm<StatusForm>({
    resolver: zodResolver(StatusFormSchema),
    defaultValues: {
      status: choices[0] ?? 'active',
      effectiveDate: '',
      confirmCode: '',
    },
  });
  const { errors } = form.formState;
  const status = form.watch('status');
  const confirmCode = form.watch('confirmCode');
  const terminating = status === 'terminated';
  const confirmed = !terminating || confirmCode.trim() === profile.employeeCode;

  async function submit(values: StatusForm) {
    setAlert(null);
    const request = EmployeeStatusChangeRequestSchema.parse({
      status: values.status,
      effectiveDate: values.effectiveDate,
    });
    try {
      await changeStatus.mutateAsync({ request, etag });
      toast.success(
        `Status changed to ${STATUS_LABELS[request.status]} — from ${formatDate(request.effectiveDate)}`,
      );
      form.reset();
      onOpenChange(false);
    } catch (error) {
      const problem = formProblem(error, {
        fields: ['status', 'effectiveDate'],
        ruleFields: RULE_FIELDS,
      });
      for (const { field, message } of problem.fields) {
        if (field === 'status' || field === 'effectiveDate') {
          form.setError(field, { message });
        }
      }
      if (problem.message !== null) {
        setAlert({ message: problem.message, conflict: problem.conflict });
      }
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-[480px]">
        <SheetHeader>
          <SheetTitle>
            Change status — {profile.firstName} {profile.lastName}
          </SheetTitle>
          <SheetDescription>
            Currently {STATUS_LABELS[profile.status].toLowerCase()}.
          </SheetDescription>
        </SheetHeader>
        <form
          noValidate
          onSubmit={form.handleSubmit(submit)}
          className="flex flex-col gap-5 px-4"
        >
          <fieldset className="flex flex-col gap-1">
            <legend className="mb-1 font-medium">New status</legend>
            {choices.map((choice) => (
              <label key={choice} className="flex items-center gap-1.5">
                <input
                  type="radio"
                  value={choice}
                  {...form.register('status')}
                />
                {STATUS_LABELS[choice]}
              </label>
            ))}
            {errors.status?.message !== undefined && (
              <p className="text-sm text-danger">{errors.status.message}</p>
            )}
          </fieldset>

          <Field
            id="status-effectiveDate"
            label="Effective date"
            hint={
              terminating
                ? 'The last day of employment; their current salary ends on it.'
                : undefined
            }
            error={errors.effectiveDate?.message}
          >
            <input
              type="date"
              className={inputClass}
              {...controlProps(
                'status-effectiveDate',
                errors.effectiveDate?.message,
                terminating,
              )}
              {...form.register('effectiveDate')}
            />
          </Field>

          {terminating && (
            <Field
              id="status-confirm"
              label={`Type ${profile.employeeCode} to confirm`}
              hint="Terminated is final: someone rehired is added as a new employee."
            >
              <input
                type="text"
                autoComplete="off"
                className={inputClass}
                {...controlProps('status-confirm', undefined, true)}
                {...form.register('confirmCode')}
              />
            </Field>
          )}

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
            <Button
              type="submit"
              variant={terminating ? 'destructive' : 'default'}
              disabled={!confirmed || changeStatus.isPending}
            >
              {terminating ? 'Terminate' : 'Change status'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
