import { cronJobs } from 'convex/server';

import { internal } from './_generated/api';

const crons = cronJobs();

crons.hourly(
  'mark overdue renewals',
  { minuteUTC: 7 },
  internal.operations.markOverdueRenewals,
  {},
);
crons.daily(
  'queue official source refreshes',
  { hourUTC: 3, minuteUTC: 17 },
  internal.sourceMonitor.queueDueSourceRefreshes,
  {},
);
crons.daily(
  'remove expired provider webhook receipts',
  { hourUTC: 4, minuteUTC: 23 },
  internal.inbox.cleanupWebhookEvents,
  {},
);
crons.hourly(
  'remove expired authentication email jobs',
  { minuteUTC: 41 },
  internal.authEmail.cleanupExpired,
  {},
);

export default crons;
