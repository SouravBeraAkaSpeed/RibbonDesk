export type WorkspaceRole = 'owner' | 'admin' | 'contributor' | 'viewer';
export type RequirementState =
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

const roleRank: Record<WorkspaceRole, number> = {
  viewer: 0,
  contributor: 1,
  admin: 2,
  owner: 3,
};
export const reminderDays = [90, 60, 30, 14, 7, 1] as const;
export const dayMilliseconds = 24 * 60 * 60 * 1_000;

export function hasMinimumRole(actual: WorkspaceRole, minimum: WorkspaceRole) {
  return roleRank[actual] >= roleRank[minimum];
}

export function canTransitionRequirement(
  from: RequirementState,
  to: RequirementState,
  role: WorkspaceRole,
) {
  if (
    from === 'proposed' &&
    !['confirmed', 'not_applicable', 'conflicted'].includes(to)
  )
    return false;
  if (to === 'confirmed' && !hasMinimumRole(role, 'admin')) return false;
  return true;
}

export function nextRecurrence(base: number, recurrenceRule: string) {
  const date = new Date(base);
  const interval = Math.max(
    1,
    Math.min(120, Number(/INTERVAL=(\d+)/.exec(recurrenceRule)?.[1] ?? '1')),
  );
  const day = date.getUTCDate();
  date.setUTCDate(1);
  if (recurrenceRule.includes('FREQ=MONTHLY'))
    date.setUTCMonth(date.getUTCMonth() + interval);
  else date.setUTCFullYear(date.getUTCFullYear() + 1);
  const lastDay = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0),
  ).getUTCDate();
  date.setUTCDate(Math.min(day, lastDay));
  return date.getTime();
}

export function reminderCadences(dueAt: number, now: number) {
  const future = reminderDays.filter(
    (days) => dueAt - days * dayMilliseconds > now,
  );
  if (dueAt <= now + dayMilliseconds && !future.includes(1))
    return [...future, dueAt <= now ? 0 : 1];
  return future;
}

export function isHttpsCitation(value: string) {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

export function dependencyWouldCycle(
  edges: Array<{ from: string; to: string }>,
  from: string,
  to: string,
) {
  if (from === to) return true;
  const frontier = [to];
  const visited = new Set<string>();
  while (frontier.length) {
    const current = frontier.shift()!;
    if (current === from) return true;
    if (visited.has(current)) continue;
    visited.add(current);
    frontier.push(
      ...edges.filter((edge) => edge.from === current).map((edge) => edge.to),
    );
  }
  return false;
}

export function readinessSummary(records: Array<{ status: RequirementState }>) {
  const confirmed = records.filter(
    (record) => record.status !== 'proposed' && record.status !== 'conflicted',
  );
  const complete = confirmed.filter((record) =>
    ['approved', 'completed', 'not_applicable'].includes(record.status),
  );
  return {
    confirmed: confirmed.length,
    complete: complete.length,
    score: confirmed.length
      ? Math.round((complete.length / confirmed.length) * 100)
      : 0,
  };
}

export function hasVerifiedNycFoodServicePack(input: {
  countryCode: string;
  region: string;
  city: string;
  businessType: string;
  servesFood: boolean;
}) {
  const isNyc =
    input.countryCode.toUpperCase() === 'US' &&
    ['NY', 'NEW YORK'].includes(input.region.toUpperCase()) &&
    ['NEW YORK', 'NYC'].includes(input.city.toUpperCase());
  const isFoodService =
    input.servesFood ||
    /\b(caf[eé]|coffee|restaurant|bakery|food|deli|bar|kitchen|catering)\b/i.test(
      input.businessType,
    );
  return isNyc && isFoodService;
}
