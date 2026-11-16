import { EmployeeDirectoryPageSchema } from '@paylens/shared';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '../components/ui/command';
import { apiRequest } from '../lib/api-client';
import { SECTIONS } from './sections';

/** Waits until typing pauses, so the API is asked once per pause rather than per key. */
function useSettled(value: string, delayMs = 200): string {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return settled;
}

/**
 * ⌘K / Ctrl+K from anywhere (ui.md → Keyboard): go to a section, or find a person by name,
 * code or email (the directory's server-side search, so cmdk's own filtering is off).
 */
export function CommandPalette() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const query = useSettled(text.trim());

  useEffect(() => {
    function toggle(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen((current) => !current);
      }
    }
    window.addEventListener('keydown', toggle);
    return () => window.removeEventListener('keydown', toggle);
  }, []);

  const people = useQuery({
    queryKey: ['employees', 'palette', query],
    queryFn: async () =>
      (
        await apiRequest(
          `/employees?${new URLSearchParams({ q: query, pageSize: '8' })}`,
          EmployeeDirectoryPageSchema,
        )
      ).data.data,
    enabled: open && query.length >= 2,
  });

  const lower = text.trim().toLowerCase();
  const sections = SECTIONS.filter((section) =>
    section.label.toLowerCase().includes(lower),
  );

  function go(path: string) {
    setOpen(false);
    setText('');
    navigate(path);
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title="Go to or find someone"
      description="Type a section, or a person's name, code or email."
    >
      <Command shouldFilter={false}>
        <CommandInput
          placeholder="Go to a section or find someone…"
          value={text}
          onValueChange={setText}
        />
        <CommandList>
          <CommandEmpty>Nothing matches.</CommandEmpty>
          {sections.length > 0 && (
            <CommandGroup heading="Go to">
              {sections.map((section) => (
                <CommandItem
                  key={section.path}
                  value={`section ${section.path}`}
                  onSelect={() => go(section.path)}
                >
                  {section.label}
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {(people.data?.length ?? 0) > 0 && (
            <CommandGroup heading="People">
              {people.data?.map((person) => (
                <CommandItem
                  key={person.id}
                  value={`person ${person.id}`}
                  onSelect={() => go(`/people/${person.id}`)}
                >
                  {person.firstName} {person.lastName}{' '}
                  <span className="ml-auto text-muted-foreground">
                    {person.employeeCode}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
