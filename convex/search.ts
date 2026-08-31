import { v } from 'convex/values';

import { query } from './_generated/server';
import { requireMembership } from './lib/permissions';

const searchResultValidator = v.object({
  id: v.string(),
  kind: v.union(
    v.literal('requirement'),
    v.literal('task'),
    v.literal('document'),
    v.literal('application'),
    v.literal('message'),
    v.literal('location'),
  ),
  title: v.string(),
  subtitle: v.string(),
  locationId: v.optional(v.string()),
  status: v.optional(v.string()),
});

export const workspace = query({
  args: { organizationId: v.id('organizations'), term: v.string() },
  returns: v.array(searchResultValidator),
  handler: async (ctx, args) => {
    await requireMembership(ctx, args.organizationId);
    const term = args.term.trim().slice(0, 120);
    if (term.length < 2) return [];
    const [requirements, tasks, documents, applications, messages, locations] =
      await Promise.all([
        ctx.db
          .query('requirements')
          .withSearchIndex('search_title', (search) =>
            search
              .search('title', term)
              .eq('organizationId', args.organizationId),
          )
          .take(8),
        ctx.db
          .query('tasks')
          .withSearchIndex('search_title', (search) =>
            search
              .search('title', term)
              .eq('organizationId', args.organizationId),
          )
          .take(8),
        ctx.db
          .query('documents')
          .withSearchIndex('search_fileName', (search) =>
            search
              .search('fileName', term)
              .eq('organizationId', args.organizationId),
          )
          .take(6),
        ctx.db
          .query('applications')
          .withSearchIndex('search_name', (search) =>
            search
              .search('name', term)
              .eq('organizationId', args.organizationId),
          )
          .take(6),
        ctx.db
          .query('caseMessages')
          .withSearchIndex('search_subject', (search) =>
            search
              .search('subject', term)
              .eq('organizationId', args.organizationId),
          )
          .take(6),
        ctx.db
          .query('locations')
          .withSearchIndex('search_name', (search) =>
            search
              .search('name', term)
              .eq('organizationId', args.organizationId),
          )
          .take(6),
      ]);
    return [
      ...requirements.map((item) => ({
        id: item._id as string,
        kind: 'requirement' as const,
        title: item.title,
        subtitle: item.agency,
        locationId: item.locationId as string,
        status: item.status,
      })),
      ...tasks.map((item) => ({
        id: item._id as string,
        kind: 'task' as const,
        title: item.title,
        subtitle: `${item.priority} priority`,
        locationId: item.locationId as string,
        status: item.status,
      })),
      ...documents.map((item) => ({
        id: item._id as string,
        kind: 'document' as const,
        title: item.fileName,
        subtitle: item.classification ?? item.contentType,
        locationId: item.locationId as string,
        status: item.status,
      })),
      ...applications.map((item) => ({
        id: item._id as string,
        kind: 'application' as const,
        title: item.name,
        subtitle: item.agency,
        locationId: item.locationId as string,
        status: item.status,
      })),
      ...messages.map((item) => ({
        id: item._id as string,
        kind: 'message' as const,
        title: item.subject,
        subtitle:
          item.direction === 'inbound' ? 'Agency inbox' : 'Sent message',
        locationId: item.locationId as string,
        status: item.status,
      })),
      ...locations.map((item) => ({
        id: item._id as string,
        kind: 'location' as const,
        title: item.name,
        subtitle: item.jurisdictionLabel ?? `${item.city}, ${item.region}`,
        locationId: item._id as string,
        status: item.lifecycleStage,
      })),
    ].slice(0, 40);
  },
});
