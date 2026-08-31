import { cronJobs } from 'convex/server';

import { internal } from './_generated/api';

const crons = cronJobs();

crons.hourly('mark overdue renewals', { minuteUTC: 7 }, internal.operations.markOverdueRenewals, {});

export default crons;
