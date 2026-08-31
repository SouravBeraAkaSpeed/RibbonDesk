'use client';

import {
  CheckCircle2,
  ClipboardCheck,
  ExternalLink,
  LoaderCircle,
  Plus,
  ShieldCheck,
} from 'lucide-react';
import { type SyntheticEvent, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';

import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

type WorkspaceRole = 'owner' | 'admin' | 'contributor' | 'viewer';
type FormSubmitEvent = SyntheticEvent<HTMLFormElement, SubmitEvent>;
type RequirementStatus =
  | 'proposed'
  | 'confirmed'
  | 'not_started'
  | 'in_progress'
  | 'waiting_on_agency'
  | 'needs_attention'
  | 'approved'
  | 'renewal_due'
  | 'completed'
  | 'not_applicable'
  | 'conflicted';
type TaskStatus =
  | 'not_started'
  | 'in_progress'
  | 'blocked'
  | 'waiting'
  | 'completed'
  | 'cancelled';

function messageFrom(error: unknown) {
  return error instanceof Error
    ? error.message
    : 'The record could not be saved. Please try again.';
}

function dateValue(value: string) {
  return value ? new Date(`${value}T12:00:00`).getTime() : undefined;
}

function statusLabel(value: string) {
  return value.replaceAll('_', ' ');
}

export function WorkPlanPanel({
  locationId,
  role,
}: {
  locationId: Id<'locations'>;
  role: WorkspaceRole;
}) {
  const requirements = useQuery(api.requirements.list, {
    locationId,
    paginationOpts: { numItems: 50, cursor: null },
  });
  const tasks = useQuery(api.tasks.list, {
    locationId,
    paginationOpts: { numItems: 50, cursor: null },
  });
  const createRequirement = useMutation(api.requirements.createManual);
  const updateRequirement = useMutation(api.requirements.updateStatus);
  const createTask = useMutation(api.tasks.create);
  const updateTask = useMutation(api.tasks.updateStatus);

  const [requirementOpen, setRequirementOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [requirement, setRequirement] = useState({
    title: '',
    description: '',
    agency: '',
    sourceTitle: '',
    sourceUrl: '',
    deadline: '',
    officialSource: true,
  });
  const [task, setTask] = useState({
    title: '',
    description: '',
    priority: 'normal' as 'blocking' | 'high' | 'normal' | 'low',
    dueAt: '',
    requirementId: '',
  });

  const canContribute = role !== 'viewer';
  const canApprove = role === 'owner' || role === 'admin';

  async function submitRequirement(event: FormSubmitEvent) {
    event.preventDefault();
    setPending('requirement:create');
    setError(null);
    setNotice(null);
    try {
      await createRequirement({
        locationId,
        title: requirement.title,
        description: requirement.description,
        requirementType: 'manual',
        agency: requirement.agency,
        sourceUrl: requirement.sourceUrl,
        sourceTitle: requirement.sourceTitle,
        officialSource: requirement.officialSource,
        confidence: requirement.officialSource ? 'high' : 'medium',
        deadline: dateValue(requirement.deadline),
      });
      setRequirement({
        title: '',
        description: '',
        agency: '',
        sourceTitle: '',
        sourceUrl: '',
        deadline: '',
        officialSource: true,
      });
      setRequirementOpen(false);
      setNotice('Requirement saved to the review queue with its source.');
    } catch (caught) {
      setError(messageFrom(caught));
    } finally {
      setPending(null);
    }
  }

  async function submitTask(event: FormSubmitEvent) {
    event.preventDefault();
    setPending('task:create');
    setError(null);
    setNotice(null);
    try {
      await createTask({
        locationId,
        title: task.title,
        description: task.description || undefined,
        priority: task.priority,
        dueAt: dateValue(task.dueAt),
        requirementId: task.requirementId
          ? (task.requirementId as Id<'requirements'>)
          : undefined,
      });
      setTask({
        title: '',
        description: '',
        priority: 'normal',
        dueAt: '',
        requirementId: '',
      });
      setTaskOpen(false);
      setNotice('Task added to the live workspace.');
    } catch (caught) {
      setError(messageFrom(caught));
    } finally {
      setPending(null);
    }
  }

  async function changeRequirement(
    requirementId: Id<'requirements'>,
    status: RequirementStatus,
  ) {
    const key = `requirement:${requirementId}:${status}`;
    setPending(key);
    setError(null);
    setNotice(null);
    try {
      await updateRequirement({ requirementId, status });
      setNotice(`Requirement marked ${statusLabel(status)}.`);
    } catch (caught) {
      setError(messageFrom(caught));
    } finally {
      setPending(null);
    }
  }

  async function changeTask(taskId: Id<'tasks'>, status: TaskStatus) {
    const key = `task:${taskId}:${status}`;
    setPending(key);
    setError(null);
    setNotice(null);
    try {
      await updateTask({ taskId, status });
      setNotice(`Task marked ${statusLabel(status)}.`);
    } catch (caught) {
      setError(messageFrom(caught));
    } finally {
      setPending(null);
    }
  }

  const activeTasks = tasks?.page.filter(
    (item) => !['completed', 'cancelled'].includes(item.status),
  );

  return (
    <section
      id="today"
      className="mt-7 overflow-hidden rounded-[1.5rem] border bg-background"
      aria-labelledby="work-plan-title"
    >
      <div className="border-b bg-[var(--ink)] px-5 py-6 text-white sm:px-6">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <Badge className="bg-white/10 text-white">
              <ClipboardCheck /> Live operating plan
            </Badge>
            <h2
              id="work-plan-title"
              className="mt-4 font-heading text-2xl font-semibold"
            >
              Record the real work. Move it forward.
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/65">
              Add requirements from official guidance, create actionable work,
              and update every status in realtime.
            </p>
          </div>
          {canContribute ? (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                className="border-white/25 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                onClick={() => setRequirementOpen((value) => !value)}
              >
                <Plus /> Add requirement
              </Button>
              <Button
                className="bg-[var(--ribbon)] text-white hover:bg-[var(--ribbon-dark)]"
                onClick={() => setTaskOpen((value) => !value)}
              >
                <Plus /> Add task
              </Button>
            </div>
          ) : null}
        </div>
      </div>

      {(requirementOpen || taskOpen) && canContribute ? (
        <div className="grid border-b lg:grid-cols-2">
          {requirementOpen ? (
            <form
              onSubmit={submitRequirement}
              className="grid gap-4 border-b p-5 sm:p-6 lg:border-r lg:border-b-0"
            >
              <div>
                <p className="font-semibold">New cited requirement</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  This starts as proposed. An owner or admin confirms it.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="manual-requirement-title">Requirement</Label>
                  <Input
                    id="manual-requirement-title"
                    value={requirement.title}
                    onChange={(event) =>
                      setRequirement((value) => ({
                        ...value,
                        title: event.target.value,
                      }))
                    }
                    required
                    maxLength={180}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="manual-requirement-agency">Agency</Label>
                  <Input
                    id="manual-requirement-agency"
                    value={requirement.agency}
                    onChange={(event) =>
                      setRequirement((value) => ({
                        ...value,
                        agency: event.target.value,
                      }))
                    }
                    required
                    maxLength={160}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="manual-requirement-description">
                  What the business must do
                </Label>
                <Textarea
                  id="manual-requirement-description"
                  value={requirement.description}
                  onChange={(event) =>
                    setRequirement((value) => ({
                      ...value,
                      description: event.target.value,
                    }))
                  }
                  required
                  maxLength={2_000}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="manual-source-title">Source title</Label>
                  <Input
                    id="manual-source-title"
                    value={requirement.sourceTitle}
                    onChange={(event) =>
                      setRequirement((value) => ({
                        ...value,
                        sourceTitle: event.target.value,
                      }))
                    }
                    required
                    maxLength={240}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="manual-requirement-deadline">
                    Deadline
                  </Label>
                  <Input
                    id="manual-requirement-deadline"
                    type="date"
                    value={requirement.deadline}
                    onChange={(event) =>
                      setRequirement((value) => ({
                        ...value,
                        deadline: event.target.value,
                      }))
                    }
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="manual-source-url">Source URL</Label>
                <Input
                  id="manual-source-url"
                  type="url"
                  placeholder="https://agency.gov/..."
                  value={requirement.sourceUrl}
                  onChange={(event) =>
                    setRequirement((value) => ({
                      ...value,
                      sourceUrl: event.target.value,
                    }))
                  }
                  required
                />
              </div>
              <Label className="flex items-center gap-3">
                <Checkbox
                  checked={requirement.officialSource}
                  onCheckedChange={(checked) =>
                    setRequirement((value) => ({
                      ...value,
                      officialSource: checked === true,
                    }))
                  }
                />
                I verified this is an official government or agency source
              </Label>
              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={pending === 'requirement:create'}
                >
                  {pending === 'requirement:create' ? (
                    <LoaderCircle className="animate-spin" />
                  ) : (
                    <ShieldCheck />
                  )}
                  Save for review
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setRequirementOpen(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          ) : null}

          {taskOpen ? (
            <form onSubmit={submitTask} className="grid content-start gap-4 p-5 sm:p-6">
              <div>
                <p className="font-semibold">New task</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Add work from an agency call, inspection, application, or your
                  own operating plan.
                </p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="task-title">Task</Label>
                <Input
                  id="task-title"
                  value={task.title}
                  onChange={(event) =>
                    setTask((value) => ({ ...value, title: event.target.value }))
                  }
                  required
                  maxLength={180}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="task-description">Notes</Label>
                <Textarea
                  id="task-description"
                  value={task.description}
                  onChange={(event) =>
                    setTask((value) => ({
                      ...value,
                      description: event.target.value,
                    }))
                  }
                  maxLength={2_000}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="task-priority">Priority</Label>
                  <Select
                    value={task.priority}
                    onValueChange={(selected) =>
                      setTask((current) => ({
                        ...current,
                        priority: selected as typeof task.priority,
                      }))
                    }
                  >
                    <SelectTrigger id="task-priority" className="w-full bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="blocking">Blocking</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="task-due">Due date</Label>
                  <Input
                    id="task-due"
                    type="date"
                    value={task.dueAt}
                    onChange={(event) =>
                      setTask((value) => ({
                        ...value,
                        dueAt: event.target.value,
                      }))
                    }
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="task-requirement">Linked requirement</Label>
                <Select
                  value={task.requirementId || 'none'}
                  onValueChange={(selected) =>
                    setTask((current) => ({
                      ...current,
                      requirementId:
                        selected && selected !== 'none' ? selected : '',
                    }))
                  }
                >
                  <SelectTrigger id="task-requirement" className="w-full bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No linked requirement</SelectItem>
                    {requirements?.page.map((item) => (
                      <SelectItem key={item._id} value={item._id}>
                        {item.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={pending === 'task:create'}>
                  {pending === 'task:create' ? (
                    <LoaderCircle className="animate-spin" />
                  ) : (
                    <Plus />
                  )}
                  Add task
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setTaskOpen(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <p
          role="alert"
          className="mx-5 mt-5 rounded-xl bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger)] sm:mx-6"
        >
          {error}
        </p>
      ) : null}
      {notice ? (
        <output className="mx-5 mt-5 block rounded-xl bg-[var(--sage-soft)] px-3 py-2 text-sm text-[var(--sage)] sm:mx-6">
          {notice}
        </output>
      ) : null}

      <div className="grid lg:grid-cols-2">
        <div className="border-b p-5 sm:p-6 lg:border-r lg:border-b-0">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.17em] text-muted-foreground">
                Requirements
              </p>
              <h3 className="mt-2 font-semibold">Cited operating record</h3>
            </div>
            <Badge variant="outline">{requirements?.page.length ?? 0}</Badge>
          </div>
          <div className="mt-4 grid gap-3">
            {requirements?.page.length ? (
              requirements.page.map((item) => (
                <article key={item._id} className="rounded-xl border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">{item.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {item.agency}
                      </p>
                    </div>
                    <Badge variant="outline">{statusLabel(item.status)}</Badge>
                  </div>
                  <p className="mt-3 text-xs leading-5 text-muted-foreground">
                    {item.description}
                  </p>
                  <a
                    href={item.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[var(--ribbon)] hover:underline"
                  >
                    {item.sourceTitle} <ExternalLink className="size-3" />
                  </a>
                  {canApprove && item.status === 'proposed' ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        onClick={() =>
                          void changeRequirement(item._id, 'confirmed')
                        }
                        disabled={pending?.startsWith(`requirement:${item._id}`)}
                      >
                        <CheckCircle2 /> Confirm
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          void changeRequirement(item._id, 'not_applicable')
                        }
                        disabled={pending?.startsWith(`requirement:${item._id}`)}
                      >
                        Not applicable
                      </Button>
                    </div>
                  ) : canContribute &&
                    !['proposed', 'completed', 'not_applicable'].includes(
                      item.status,
                    ) ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          void changeRequirement(item._id, 'in_progress')
                        }
                      >
                        Start
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          void changeRequirement(item._id, 'waiting_on_agency')
                        }
                      >
                        Waiting on agency
                      </Button>
                      <Button
                        size="sm"
                        onClick={() =>
                          void changeRequirement(item._id, 'completed')
                        }
                      >
                        Complete
                      </Button>
                    </div>
                  ) : null}
                </article>
              ))
            ) : (
              <p className="rounded-xl border border-dashed p-5 text-center text-sm text-muted-foreground">
                Add your first requirement from an official source.
              </p>
            )}
          </div>
        </div>

        <div className="p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.17em] text-muted-foreground">
                Action queue
              </p>
              <h3 className="mt-2 font-semibold">Open work</h3>
            </div>
            <Badge variant="outline">{activeTasks?.length ?? 0}</Badge>
          </div>
          <div className="mt-4 grid gap-3">
            {activeTasks?.length ? (
              activeTasks.map((item) => (
                <article key={item._id} className="rounded-xl border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">{item.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {item.priority} priority
                        {item.dueAt
                          ? ` · due ${new Date(item.dueAt).toLocaleDateString()}`
                          : ''}
                      </p>
                    </div>
                    <Badge variant="outline">{statusLabel(item.status)}</Badge>
                  </div>
                  {item.description ? (
                    <p className="mt-3 text-xs leading-5 text-muted-foreground">
                      {item.description}
                    </p>
                  ) : null}
                  {canContribute ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {item.status !== 'in_progress' ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void changeTask(item._id, 'in_progress')}
                        >
                          Start
                        </Button>
                      ) : null}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void changeTask(item._id, 'waiting')}
                      >
                        Waiting
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => void changeTask(item._id, 'completed')}
                      >
                        <CheckCircle2 /> Complete
                      </Button>
                    </div>
                  ) : null}
                </article>
              ))
            ) : (
              <p className="rounded-xl border border-dashed p-5 text-center text-sm text-muted-foreground">
                Add the next concrete action for this location.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
