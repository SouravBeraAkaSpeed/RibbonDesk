'use client';

import {
  FileText,
  Inbox,
  ListChecks,
  MapPin,
  Search,
  ScrollText,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useQuery } from 'convex/react';

import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from '@/components/ui/command';

const icons = {
  requirement: ScrollText,
  task: ListChecks,
  document: FileText,
  application: FileText,
  message: Inbox,
  location: MapPin,
} as const;
const targets = {
  requirement: '#research-title',
  task: '#today',
  document: '[data-testid="evidence-applications"]',
  application: '[data-testid="evidence-applications"]',
  message: '[data-testid="case-inbox"]',
  location: 'main',
} as const;

export function WorkspaceSearch({
  organizationId,
}: {
  organizationId: Id<'organizations'>;
}) {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState('');
  const results = useQuery(
    api.search.workspace,
    open && term.trim().length >= 2 ? { organizationId, term } : 'skip',
  );

  useEffect(() => {
    function keydown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen((current) => !current);
      }
    }
    document.addEventListener('keydown', keydown);
    return () => document.removeEventListener('keydown', keydown);
  }, []);

  function select(kind: keyof typeof targets) {
    setOpen(false);
    setTerm('');
    window.setTimeout(
      () =>
        document
          .querySelector(targets[kind])
          ?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
      50,
    );
  }

  return (
    <>
      <Button
        data-testid="workspace-search"
        variant="outline"
        size="sm"
        className="hidden gap-2 sm:inline-flex"
        onClick={() => setOpen(true)}
      >
        <Search />
        Search desk
        <kbd className="rounded border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
          Ctrl K
        </kbd>
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        className="sm:hidden"
        aria-label="Search desk"
        onClick={() => setOpen(true)}
      >
        <Search />
      </Button>
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Search RibbonDesk"
        description="Search requirements, tasks, evidence, applications, messages, and locations."
      >
        <Command shouldFilter={false}>
          <CommandInput
            value={term}
            onValueChange={setTerm}
            placeholder="Search the workspace…"
          />
          <CommandList>
            <CommandEmpty>
              {term.trim().length < 2
                ? 'Type at least two characters.'
                : results === undefined
                  ? 'Searching…'
                  : 'No matching workspace records.'}
            </CommandEmpty>
            <CommandGroup heading="Workspace results">
              {results?.map((result) => {
                const Icon = icons[result.kind];
                return (
                  <CommandItem
                    key={`${result.kind}:${result.id}`}
                    value={`${result.kind}:${result.id}`}
                    onSelect={() => select(result.kind)}
                  >
                    <Icon />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">
                        {result.title}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {result.subtitle}
                        {result.status
                          ? ` · ${result.status.replaceAll('_', ' ')}`
                          : ''}
                      </span>
                    </span>
                    <CommandShortcut>{result.kind}</CommandShortcut>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}
