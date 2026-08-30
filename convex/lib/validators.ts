import { v } from 'convex/values';

export const roleValidator = v.union(
  v.literal('owner'),
  v.literal('admin'),
  v.literal('contributor'),
  v.literal('viewer'),
);

export const lifecycleStageValidator = v.union(
  v.literal('planning'),
  v.literal('opening'),
  v.literal('operating'),
  v.literal('paused'),
  v.literal('closed'),
);

export const requirementStatusValidator = v.union(
  v.literal('proposed'),
  v.literal('confirmed'),
  v.literal('not_started'),
  v.literal('in_progress'),
  v.literal('waiting_on_agency'),
  v.literal('needs_attention'),
  v.literal('approved'),
  v.literal('renewal_due'),
  v.literal('completed'),
  v.literal('not_applicable'),
  v.literal('conflicted'),
);

export const jobStatusValidator = v.union(
  v.literal('queued'),
  v.literal('running'),
  v.literal('needs_review'),
  v.literal('completed'),
  v.literal('partial'),
  v.literal('rate_limited'),
  v.literal('failed'),
  v.literal('cancelled'),
);

export const proposalStatusValidator = v.union(
  v.literal('pending'),
  v.literal('accepted'),
  v.literal('edited'),
  v.literal('rejected'),
  v.literal('superseded'),
);

export const confidenceValidator = v.union(
  v.literal('low'),
  v.literal('medium'),
  v.literal('high'),
);

export const taskStatusValidator = v.union(
  v.literal('not_started'),
  v.literal('in_progress'),
  v.literal('blocked'),
  v.literal('waiting'),
  v.literal('completed'),
  v.literal('cancelled'),
);

export const paginationArgsValidator = {
  cursor: v.union(v.string(), v.null()),
  numItems: v.number(),
};

export const businessTriggersValidator = v.object({
  employees: v.boolean(),
  construction: v.boolean(),
  food: v.boolean(),
  alcohol: v.boolean(),
  signage: v.boolean(),
  seating: v.boolean(),
  delivery: v.boolean(),
  hazardousMaterials: v.boolean(),
  regulatedServices: v.boolean(),
  other: v.array(v.string()),
});
