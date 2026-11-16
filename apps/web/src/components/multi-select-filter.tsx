import { Button } from './ui/button';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';

export interface FilterOption {
  readonly value: string;
  readonly label: string;
}

/**
 * One filter of the FilterBar (ui.md): a button that opens a list of checkboxes, so several
 * values can be chosen at once. The count of chosen values shows on the button; the chips
 * under the bar name them.
 */
export function MultiSelectFilter({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: readonly FilterOption[];
  selected: readonly string[];
  onToggle: (value: string) => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          // Says what it does and how many are chosen; table headers may share the bare label.
          aria-label={`Filter by ${label}${selected.length > 0 ? `, ${selected.length} chosen` : ''}`}
        >
          {label}
          {selected.length > 0 && (
            <span aria-hidden="true" className="text-teal tabular-nums">
              · {selected.length}
            </span>
          )}
          <span aria-hidden="true">▾</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-2">
        <fieldset className="flex max-h-72 flex-col gap-0.5 overflow-y-auto">
          <legend className="sr-only">{label}</legend>
          {options.map((option) => (
            <label
              key={option.value}
              className="flex h-8 items-center gap-2 rounded-md px-2 hover:bg-teal-soft"
            >
              <input
                type="checkbox"
                checked={selected.includes(option.value)}
                onChange={() => onToggle(option.value)}
              />
              {option.label}
            </label>
          ))}
        </fieldset>
      </PopoverContent>
    </Popover>
  );
}
