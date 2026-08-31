import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

import {
  businessTriggersValidator,
  confidenceValidator,
  jobStatusValidator,
  lifecycleStageValidator,
  proposalStatusValidator,
  requirementStatusValidator,
  roleValidator,
  taskStatusValidator,
} from './lib/validators';

export default defineSchema({
  profiles: defineTable({
    tokenIdentifier: v.string(),
    normalizedEmail: v.optional(v.string()),
    displayName: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_tokenIdentifier', ['tokenIdentifier'])
    .index('by_normalizedEmail', ['normalizedEmail']),

  organizations: defineTable({
    name: v.string(),
    slug: v.string(),
    createdBy: v.string(),
    storedBytes: v.optional(v.number()),
    deletionStatus: v.union(
      v.literal('active'),
      v.literal('queued'),
      v.literal('deleting'),
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_slug', ['slug'])
    .index('by_createdBy', ['createdBy']),

  memberships: defineTable({
    organizationId: v.id('organizations'),
    userTokenIdentifier: v.string(),
    role: roleValidator,
    status: v.union(v.literal('active'), v.literal('suspended')),
    invitedBy: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_organizationId', ['organizationId'])
    .index('by_userTokenIdentifier', ['userTokenIdentifier'])
    .index('by_organizationId_and_userTokenIdentifier', [
      'organizationId',
      'userTokenIdentifier',
    ])
    .index('by_organizationId_and_role', ['organizationId', 'role']),

  invitations: defineTable({
    organizationId: v.id('organizations'),
    normalizedEmail: v.string(),
    tokenHash: v.string(),
    role: roleValidator,
    status: v.union(
      v.literal('pending'),
      v.literal('accepted'),
      v.literal('revoked'),
      v.literal('expired'),
    ),
    invitedBy: v.string(),
    acceptedBy: v.optional(v.string()),
    expiresAt: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_organizationId', ['organizationId'])
    .index('by_organizationId_and_status', ['organizationId', 'status'])
    .index('by_normalizedEmail_and_status', ['normalizedEmail', 'status'])
    .index('by_tokenHash', ['tokenHash']),

  businesses: defineTable({
    organizationId: v.id('organizations'),
    name: v.string(),
    businessType: v.string(),
    description: v.optional(v.string()),
    lifecycleStage: lifecycleStageValidator,
    createdBy: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_organizationId', ['organizationId'])
    .index('by_organizationId_and_lifecycleStage', [
      'organizationId',
      'lifecycleStage',
    ])
    .searchIndex('search_name', {
      searchField: 'name',
      filterFields: ['organizationId'],
    }),

  locations: defineTable({
    organizationId: v.id('organizations'),
    businessId: v.id('businesses'),
    name: v.string(),
    addressLine1: v.string(),
    addressLine2: v.optional(v.string()),
    city: v.string(),
    region: v.string(),
    postalCode: v.string(),
    countryCode: v.string(),
    timezone: v.string(),
    lifecycleStage: lifecycleStageValidator,
    openingTarget: v.optional(v.number()),
    jurisdictionStatus: v.union(
      v.literal('unconfirmed'),
      v.literal('confirmed'),
      v.literal('needs_review'),
    ),
    jurisdictionLabel: v.optional(v.string()),
    jurisdictionCountryCode: v.optional(v.string()),
    coverageMode: v.union(
      v.literal('verified_pack'),
      v.literal('dynamic_research'),
      v.literal('unselected'),
    ),
    coveragePackKey: v.optional(v.string()),
    lastSourceCheckAt: v.optional(v.number()),
    nextSourceCheckAt: v.optional(v.number()),
    activities: v.array(v.string()),
    triggers: businessTriggersValidator,
    createdBy: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_organizationId', ['organizationId'])
    .index('by_businessId', ['businessId'])
    .index('by_nextSourceCheckAt', ['nextSourceCheckAt'])
    .index('by_organizationId_and_lifecycleStage', [
      'organizationId',
      'lifecycleStage',
    ])
    .searchIndex('search_name', {
      searchField: 'name',
      filterFields: ['organizationId'],
    }),

  coveragePacks: defineTable({
    key: v.string(),
    name: v.string(),
    jurisdictionLabel: v.string(),
    businessTypes: v.array(v.string()),
    version: v.number(),
    status: v.union(
      v.literal('draft'),
      v.literal('verified'),
      v.literal('retired'),
    ),
    verifiedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_key_and_version', ['key', 'version'])
    .index('by_status', ['status']),

  trustedSourceDomains: defineTable({
    coveragePackId: v.optional(v.id('coveragePacks')),
    hostname: v.string(),
    organizationName: v.string(),
    jurisdictionLabel: v.optional(v.string()),
    official: v.boolean(),
    active: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_hostname', ['hostname'])
    .index('by_coveragePackId', ['coveragePackId'])
    .index('by_active', ['active']),

  researchRuns: defineTable({
    organizationId: v.id('organizations'),
    locationId: v.id('locations'),
    initiatedBy: v.string(),
    mode: v.union(
      v.literal('verified_pack'),
      v.literal('dynamic_research'),
      v.literal('source_refresh'),
    ),
    providerMode: v.union(v.literal('replay'), v.literal('live')),
    status: jobStatusValidator,
    workflowId: v.optional(v.string()),
    crawlId: v.optional(v.string()),
    totalSources: v.optional(v.number()),
    processedSources: v.number(),
    creditsUsed: v.optional(v.number()),
    errorCode: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_organizationId', ['organizationId'])
    .index('by_organizationId_and_createdAt', ['organizationId', 'createdAt'])
    .index('by_locationId_and_createdAt', ['locationId', 'createdAt'])
    .index('by_locationId_and_status', ['locationId', 'status']),

  sourceSnapshots: defineTable({
    organizationId: v.id('organizations'),
    locationId: v.id('locations'),
    researchRunId: v.optional(v.id('researchRuns')),
    url: v.string(),
    hostname: v.string(),
    title: v.string(),
    agency: v.optional(v.string()),
    official: v.boolean(),
    contentHash: v.string(),
    excerpt: v.optional(v.string()),
    storageId: v.optional(v.id('_storage')),
    crawlPageId: v.optional(v.string()),
    truncated: v.boolean(),
    capturedAt: v.number(),
    lastVerifiedAt: v.number(),
  })
    .index('by_organizationId', ['organizationId'])
    .index('by_locationId_and_capturedAt', ['locationId', 'capturedAt'])
    .index('by_locationId_and_url', ['locationId', 'url'])
    .index('by_researchRunId', ['researchRunId'])
    .index('by_organizationId_and_hostname', ['organizationId', 'hostname']),

  sourceChanges: defineTable({
    organizationId: v.id('organizations'),
    locationId: v.id('locations'),
    beforeSnapshotId: v.id('sourceSnapshots'),
    afterSnapshotId: v.id('sourceSnapshots'),
    status: proposalStatusValidator,
    significance: confidenceValidator,
    summary: v.string(),
    detectedAt: v.number(),
    decidedAt: v.optional(v.number()),
    decidedBy: v.optional(v.string()),
  })
    .index('by_organizationId', ['organizationId'])
    .index('by_locationId_and_detectedAt', ['locationId', 'detectedAt'])
    .index('by_locationId_and_status', ['locationId', 'status'])
    .index('by_organizationId_and_status', ['organizationId', 'status']),

  requirements: defineTable({
    organizationId: v.id('organizations'),
    locationId: v.id('locations'),
    title: v.string(),
    description: v.string(),
    requirementType: v.string(),
    status: requirementStatusValidator,
    agency: v.string(),
    sourceSnapshotId: v.optional(v.id('sourceSnapshots')),
    sourceUrl: v.string(),
    sourceTitle: v.string(),
    officialSource: v.boolean(),
    confidence: confidenceValidator,
    capturedAt: v.number(),
    lastVerifiedAt: v.number(),
    deadline: v.optional(v.number()),
    feeMinCents: v.optional(v.number()),
    feeMaxCents: v.optional(v.number()),
    recurrenceRule: v.optional(v.string()),
    ownerTokenIdentifier: v.optional(v.string()),
    confirmedBy: v.optional(v.string()),
    confirmedAt: v.optional(v.number()),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_organizationId', ['organizationId'])
    .index('by_locationId_and_createdAt', ['locationId', 'createdAt'])
    .index('by_locationId_and_status', ['locationId', 'status'])
    .index('by_locationId_and_sourceUrl', ['locationId', 'sourceUrl'])
    .index('by_locationId_and_deadline', ['locationId', 'deadline'])
    .index('by_organizationId_and_status', ['organizationId', 'status'])
    .index('by_ownerTokenIdentifier_and_status', [
      'ownerTokenIdentifier',
      'status',
    ])
    .searchIndex('search_title', {
      searchField: 'title',
      filterFields: ['organizationId', 'locationId', 'status'],
    }),

  requirementEdges: defineTable({
    organizationId: v.id('organizations'),
    locationId: v.id('locations'),
    fromRequirementId: v.id('requirements'),
    toRequirementId: v.id('requirements'),
    kind: v.union(
      v.literal('blocks'),
      v.literal('requires'),
      v.literal('related'),
    ),
    createdBy: v.string(),
    createdAt: v.number(),
  })
    .index('by_organizationId', ['organizationId'])
    .index('by_locationId', ['locationId'])
    .index('by_fromRequirementId', ['fromRequirementId'])
    .index('by_toRequirementId', ['toRequirementId'])
    .index('by_fromRequirementId_and_toRequirementId', [
      'fromRequirementId',
      'toRequirementId',
    ]),

  tasks: defineTable({
    organizationId: v.id('organizations'),
    locationId: v.id('locations'),
    requirementId: v.optional(v.id('requirements')),
    title: v.string(),
    description: v.optional(v.string()),
    status: taskStatusValidator,
    priority: v.union(
      v.literal('blocking'),
      v.literal('high'),
      v.literal('normal'),
      v.literal('low'),
    ),
    ownerTokenIdentifier: v.optional(v.string()),
    dueAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    createdBy: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_organizationId', ['organizationId'])
    .index('by_locationId_and_createdAt', ['locationId', 'createdAt'])
    .index('by_locationId_and_status', ['locationId', 'status'])
    .index('by_locationId_and_dueAt', ['locationId', 'dueAt'])
    .index('by_requirementId', ['requirementId'])
    .index('by_ownerTokenIdentifier_and_status', [
      'ownerTokenIdentifier',
      'status',
    ])
    .searchIndex('search_title', {
      searchField: 'title',
      filterFields: ['organizationId', 'locationId', 'status'],
    }),

  applications: defineTable({
    organizationId: v.id('organizations'),
    locationId: v.id('locations'),
    requirementId: v.id('requirements'),
    name: v.string(),
    agency: v.string(),
    status: v.union(
      v.literal('draft'),
      v.literal('ready'),
      v.literal('submitted'),
      v.literal('needs_attention'),
      v.literal('approved'),
      v.literal('denied'),
      v.literal('withdrawn'),
    ),
    officialPortalUrl: v.optional(v.string()),
    requiredAttachments: v.array(v.string()),
    unresolvedQuestions: v.array(v.string()),
    readinessChecks: v.array(
      v.object({ key: v.string(), label: v.string(), complete: v.boolean() }),
    ),
    submittedAt: v.optional(v.number()),
    referenceNumber: v.optional(v.string()),
    expectedResponseAt: v.optional(v.number()),
    outcomeNotes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_organizationId', ['organizationId'])
    .index('by_locationId_and_createdAt', ['locationId', 'createdAt'])
    .index('by_locationId_and_status', ['locationId', 'status'])
    .index('by_requirementId', ['requirementId'])
    .searchIndex('search_name', {
      searchField: 'name',
      filterFields: ['organizationId', 'locationId', 'status'],
    }),

  applicationAnswers: defineTable({
    organizationId: v.id('organizations'),
    locationId: v.id('locations'),
    applicationId: v.id('applications'),
    key: v.string(),
    label: v.string(),
    value: v.string(),
    reusable: v.boolean(),
    updatedBy: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_organizationId', ['organizationId'])
    .index('by_applicationId_and_key', ['applicationId', 'key'])
    .index('by_applicationId_and_updatedAt', ['applicationId', 'updatedAt'])
    .index('by_organizationId_and_key', ['organizationId', 'key']),

  applicationPackets: defineTable({
    organizationId: v.id('organizations'),
    locationId: v.id('locations'),
    applicationId: v.id('applications'),
    version: v.number(),
    status: v.union(
      v.literal('generating'),
      v.literal('prepared'),
      v.literal('failed'),
    ),
    errorMessage: v.optional(v.string()),
    pdfStorageId: v.optional(v.id('_storage')),
    zipStorageId: v.optional(v.id('_storage')),
    generatedBy: v.string(),
    generatedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index('by_organizationId', ['organizationId'])
    .index('by_applicationId_and_version', ['applicationId', 'version'])
    .index('by_locationId_and_createdAt', ['locationId', 'createdAt']),

  inspections: defineTable({
    organizationId: v.id('organizations'),
    locationId: v.id('locations'),
    requirementId: v.optional(v.id('requirements')),
    applicationId: v.optional(v.id('applications')),
    agency: v.string(),
    inspectionType: v.string(),
    scheduledAt: v.optional(v.number()),
    status: v.union(
      v.literal('proposed'),
      v.literal('scheduled'),
      v.literal('completed'),
      v.literal('passed'),
      v.literal('failed'),
      v.literal('reschedule_needed'),
    ),
    outcome: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_organizationId', ['organizationId'])
    .index('by_locationId_and_scheduledAt', ['locationId', 'scheduledAt'])
    .index('by_locationId_and_status', ['locationId', 'status'])
    .index('by_requirementId', ['requirementId']),

  renewalCycles: defineTable({
    organizationId: v.id('organizations'),
    locationId: v.id('locations'),
    requirementId: v.id('requirements'),
    sequence: v.number(),
    dueAt: v.number(),
    status: v.union(
      v.literal('upcoming'),
      v.literal('due'),
      v.literal('in_progress'),
      v.literal('completed'),
      v.literal('overdue'),
      v.literal('cancelled'),
    ),
    recurrenceRule: v.string(),
    outcomeNotes: v.optional(v.string()),
    completedAt: v.optional(v.number()),
    remindersScheduledAt: v.optional(v.number()),
    createdBy: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_organizationId', ['organizationId'])
    .index('by_locationId_and_dueAt', ['locationId', 'dueAt'])
    .index('by_requirementId_and_dueAt', ['requirementId', 'dueAt'])
    .index('by_status_and_dueAt', ['status', 'dueAt']),

  documents: defineTable({
    organizationId: v.id('organizations'),
    locationId: v.id('locations'),
    storageId: v.id('_storage'),
    fileName: v.string(),
    contentType: v.string(),
    sizeBytes: v.number(),
    status: v.union(
      v.literal('uploaded'),
      v.literal('processing'),
      v.literal('needs_review'),
      v.literal('ready'),
      v.literal('rejected'),
    ),
    rejectionReason: v.optional(v.string()),
    classification: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
    uploadedBy: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_organizationId', ['organizationId'])
    .index('by_locationId_and_createdAt', ['locationId', 'createdAt'])
    .index('by_storageId', ['storageId'])
    .index('by_organizationId_and_status', ['organizationId', 'status'])
    .index('by_locationId_and_expiresAt', ['locationId', 'expiresAt'])
    .searchIndex('search_fileName', {
      searchField: 'fileName',
      filterFields: ['organizationId', 'locationId', 'status'],
    }),

  documentLinks: defineTable({
    organizationId: v.id('organizations'),
    documentId: v.id('documents'),
    requirementId: v.optional(v.id('requirements')),
    applicationId: v.optional(v.id('applications')),
    inspectionId: v.optional(v.id('inspections')),
    linkType: v.union(
      v.literal('evidence'),
      v.literal('attachment'),
      v.literal('receipt'),
      v.literal('outcome'),
    ),
    createdBy: v.string(),
    createdAt: v.number(),
  })
    .index('by_organizationId', ['organizationId'])
    .index('by_documentId', ['documentId'])
    .index('by_requirementId', ['requirementId'])
    .index('by_applicationId', ['applicationId']),

  inboxBindings: defineTable({
    organizationId: v.id('organizations'),
    locationId: v.id('locations'),
    providerInboxId: v.string(),
    providerMode: v.union(v.literal('replay'), v.literal('live')),
    emailAddress: v.optional(v.string()),
    status: v.union(
      v.literal('provisioning'),
      v.literal('active'),
      v.literal('disabled'),
      v.literal('failed'),
    ),
    errorMessage: v.optional(v.string()),
    createdBy: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_organizationId', ['organizationId'])
    .index('by_locationId', ['locationId'])
    .index('by_emailAddress', ['emailAddress'])
    .index('by_providerInboxId', ['providerInboxId'])
    .index('by_organizationId_and_status', ['organizationId', 'status']),

  caseMessages: defineTable({
    organizationId: v.id('organizations'),
    locationId: v.id('locations'),
    inboxBindingId: v.id('inboxBindings'),
    providerInboxId: v.string(),
    providerMessageId: v.string(),
    providerThreadId: v.string(),
    direction: v.union(v.literal('inbound'), v.literal('outbound')),
    fromAddress: v.string(),
    toAddresses: v.array(v.string()),
    subject: v.string(),
    bodyText: v.string(),
    preview: v.string(),
    status: v.union(
      v.literal('received'),
      v.literal('needs_review'),
      v.literal('processed'),
      v.literal('sent'),
      v.literal('delivered'),
      v.literal('bounced'),
      v.literal('failed'),
    ),
    aiSummary: v.optional(v.string()),
    classification: v.optional(v.string()),
    attachments: v.array(
      v.object({
        fileName: v.string(),
        contentType: v.optional(v.string()),
        sizeBytes: v.optional(v.number()),
      }),
    ),
    receivedAt: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_organizationId', ['organizationId'])
    .index('by_providerMessageId', ['providerMessageId'])
    .index('by_locationId_and_receivedAt', ['locationId', 'receivedAt'])
    .index('by_locationId_and_providerThreadId', [
      'locationId',
      'providerThreadId',
    ])
    .index('by_inboxBindingId_and_receivedAt', ['inboxBindingId', 'receivedAt'])
    .searchIndex('search_subject', {
      searchField: 'subject',
      filterFields: ['organizationId', 'locationId', 'status'],
    }),

  outboundDrafts: defineTable({
    organizationId: v.id('organizations'),
    locationId: v.id('locations'),
    inboxBindingId: v.id('inboxBindings'),
    providerThreadId: v.optional(v.string()),
    replyToMessageId: v.optional(v.string()),
    toAddresses: v.array(v.string()),
    ccAddresses: v.array(v.string()),
    subject: v.string(),
    bodyText: v.string(),
    requirementId: v.optional(v.id('requirements')),
    attachmentDocumentIds: v.array(v.id('documents')),
    status: v.union(
      v.literal('draft'),
      v.literal('pending_approval'),
      v.literal('approved'),
      v.literal('sending'),
      v.literal('sent'),
      v.literal('delivered'),
      v.literal('bounced'),
      v.literal('failed'),
      v.literal('cancelled'),
    ),
    providerOutboundId: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
    createdBy: v.string(),
    requestedAt: v.optional(v.number()),
    approvedBy: v.optional(v.string()),
    approvedAt: v.optional(v.number()),
    sentAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_organizationId', ['organizationId'])
    .index('by_locationId_and_createdAt', ['locationId', 'createdAt'])
    .index('by_locationId_and_status', ['locationId', 'status'])
    .index('by_providerOutboundId', ['providerOutboundId']),

  sendApprovals: defineTable({
    organizationId: v.id('organizations'),
    locationId: v.id('locations'),
    outboundDraftId: v.id('outboundDrafts'),
    approvedBy: v.string(),
    toAddresses: v.array(v.string()),
    ccAddresses: v.array(v.string()),
    subject: v.string(),
    bodyText: v.string(),
    requirementId: v.optional(v.id('requirements')),
    attachmentDocumentIds: v.array(v.id('documents')),
    approvedAt: v.number(),
  })
    .index('by_organizationId', ['organizationId'])
    .index('by_outboundDraftId', ['outboundDraftId'])
    .index('by_locationId_and_approvedAt', ['locationId', 'approvedAt']),

  messageLinks: defineTable({
    organizationId: v.id('organizations'),
    locationId: v.id('locations'),
    providerMessageId: v.string(),
    providerThreadId: v.string(),
    requirementId: v.optional(v.id('requirements')),
    taskId: v.optional(v.id('tasks')),
    applicationId: v.optional(v.id('applications')),
    assignedTo: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_organizationId', ['organizationId'])
    .index('by_providerMessageId', ['providerMessageId'])
    .index('by_locationId_and_providerThreadId', [
      'locationId',
      'providerThreadId',
    ])
    .index('by_requirementId', ['requirementId']),

  providerWebhookEvents: defineTable({
    provider: v.literal('agentmail'),
    eventId: v.string(),
    eventType: v.string(),
    receivedAt: v.number(),
  })
    .index('by_provider_and_eventId', ['provider', 'eventId'])
    .index('by_receivedAt', ['receivedAt']),

  aiRuns: defineTable({
    organizationId: v.id('organizations'),
    locationId: v.optional(v.id('locations')),
    initiatedBy: v.string(),
    purpose: v.string(),
    model: v.string(),
    modelVersion: v.optional(v.string()),
    promptVersion: v.string(),
    status: jobStatusValidator,
    providerResponseId: v.optional(v.string()),
    inputTokens: v.optional(v.number()),
    outputTokens: v.optional(v.number()),
    errorCode: v.optional(v.string()),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index('by_organizationId', ['organizationId'])
    .index('by_organizationId_and_createdAt', ['organizationId', 'createdAt'])
    .index('by_locationId_and_createdAt', ['locationId', 'createdAt'])
    .index('by_organizationId_and_status', ['organizationId', 'status']),

  assistantThreads: defineTable({
    organizationId: v.id('organizations'),
    locationId: v.id('locations'),
    componentThreadId: v.string(),
    title: v.string(),
    status: v.union(v.literal('active'), v.literal('archived')),
    createdBy: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_organizationId', ['organizationId'])
    .index('by_componentThreadId', ['componentThreadId'])
    .index('by_locationId_and_createdAt', ['locationId', 'createdAt'])
    .index('by_locationId_and_createdBy_and_createdAt', [
      'locationId',
      'createdBy',
      'createdAt',
    ]),

  proposals: defineTable({
    organizationId: v.id('organizations'),
    locationId: v.id('locations'),
    aiRunId: v.optional(v.id('aiRuns')),
    proposalType: v.union(
      v.literal('requirement'),
      v.literal('task'),
      v.literal('deadline'),
      v.literal('application_status'),
      v.literal('inspection'),
      v.literal('source_change'),
      v.literal('draft_message'),
    ),
    status: proposalStatusValidator,
    title: v.string(),
    summary: v.string(),
    payload: v.any(),
    confidence: confidenceValidator,
    citations: v.array(
      v.object({
        sourceSnapshotId: v.optional(v.id('sourceSnapshots')),
        url: v.string(),
        title: v.string(),
        excerpt: v.optional(v.string()),
      }),
    ),
    requiresOwnerApproval: v.boolean(),
    decidedBy: v.optional(v.string()),
    decidedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_organizationId', ['organizationId'])
    .index('by_locationId_and_createdAt', ['locationId', 'createdAt'])
    .index('by_locationId_and_status', ['locationId', 'status'])
    .index('by_locationId_and_type_and_status', [
      'locationId',
      'proposalType',
      'status',
    ])
    .index('by_organizationId_and_status', ['organizationId', 'status']),

  notifications: defineTable({
    organizationId: v.id('organizations'),
    userTokenIdentifier: v.string(),
    locationId: v.optional(v.id('locations')),
    kind: v.string(),
    title: v.string(),
    body: v.string(),
    urgency: v.union(
      v.literal('informational'),
      v.literal('normal'),
      v.literal('urgent'),
    ),
    readAt: v.optional(v.number()),
    scheduledFor: v.optional(v.number()),
    deliveredEmailAt: v.optional(v.number()),
    dedupeKey: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index('by_organizationId', ['organizationId'])
    .index('by_userTokenIdentifier_and_createdAt', [
      'userTokenIdentifier',
      'createdAt',
    ])
    .index('by_userTokenIdentifier_and_locationId_and_createdAt', [
      'userTokenIdentifier',
      'locationId',
      'createdAt',
    ])
    .index('by_userTokenIdentifier_and_readAt', [
      'userTokenIdentifier',
      'readAt',
    ])
    .index('by_scheduledFor', ['scheduledFor'])
    .index('by_dedupeKey', ['dedupeKey']),

  notificationPreferences: defineTable({
    organizationId: v.id('organizations'),
    userTokenIdentifier: v.string(),
    urgentEmail: v.boolean(),
    dailyDigest: v.boolean(),
    digestHourLocal: v.number(),
    timezone: v.string(),
    updatedAt: v.number(),
  })
    .index('by_organizationId', ['organizationId'])
    .index('by_organizationId_and_userTokenIdentifier', [
      'organizationId',
      'userTokenIdentifier',
    ]),

  activityEvents: defineTable({
    organizationId: v.id('organizations'),
    locationId: v.optional(v.id('locations')),
    actorSubject: v.string(),
    action: v.string(),
    entityType: v.string(),
    entityId: v.string(),
    before: v.optional(v.any()),
    after: v.optional(v.any()),
    evidence: v.optional(
      v.array(v.object({ kind: v.string(), id: v.string() })),
    ),
    createdAt: v.number(),
  })
    .index('by_organizationId', ['organizationId'])
    .index('by_organizationId_and_createdAt', ['organizationId', 'createdAt'])
    .index('by_locationId_and_createdAt', ['locationId', 'createdAt'])
    .index('by_entityType_and_entityId', ['entityType', 'entityId']),

  usageMeters: defineTable({
    organizationId: v.id('organizations'),
    periodKey: v.string(),
    researchRuns: v.number(),
    aiOperations: v.number(),
    approvedSends: v.number(),
    storedBytes: v.number(),
    updatedAt: v.number(),
  })
    .index('by_organizationId', ['organizationId'])
    .index('by_organizationId_and_periodKey', ['organizationId', 'periodKey']),

  demoSessions: defineTable({
    sessionKeyHash: v.string(),
    state: v.any(),
    expiresAt: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_sessionKeyHash', ['sessionKeyHash'])
    .index('by_expiresAt', ['expiresAt']),
});
