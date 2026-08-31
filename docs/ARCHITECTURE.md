# RibbonDesk architecture

This document describes the production boundaries that make RibbonDesk useful
without allowing automation to quietly become a regulatory decision-maker.

## System responsibilities

| Layer | Responsibility |
| --- | --- |
| ChatGPT Site | Responsive interface, email/OAuth/passkey ceremonies, safe source viewing, optimistic interaction, and realtime subscriptions |
| Better Auth component | Verified email/password, Google/Apple OAuth, authenticated passkey enrollment, sessions, and identity |
| Convex application | Authorization, durable data, indexed queries, workflow state, files, schedules, callbacks, quotas, and audit events |
| Firecrawl component | Durable official-source capture and progress |
| OpenRouter | Structured OpenAI-model extraction, classification, summaries, conflicts, drafts, and grounded answers |
| AgentMail | Location-owned inboxes, messages, attachments, signed events, delivery, and bounce state |

Convex is the source of truth. Provider records are mirrored only where the
application needs ownership, status, evidence, deduplication, or recovery.

## Core data domains

- **Identity:** profiles, organizations, memberships, and email-bound invitations
- **Business:** businesses, locations, structured operating profiles, and lifecycle state
- **Coverage:** versioned packs, trusted official domains, and jurisdiction questions
- **Research:** durable runs, crawl references, snapshots, citations, changes, and provider health
- **Work:** requirements, dependency edges, tasks, applications, packets, inspections, and renewals
- **Evidence:** stored documents, links, extracted proposals, expirations, and exports
- **Communication:** inbox bindings, threads, app-owned message links, drafts, approvals, and delivery state
- **AI governance:** runs, model/prompt versions, structured proposals, confidence, citations, and human decisions
- **Operations:** notifications, preferences, immutable activity, quotas, and cleanup jobs

Growing list queries use indexes and pagination. Protected operations derive the
actor from `ctx.auth`; they never accept a client user ID as proof of identity.

## Durable workflows

### Requirement research

```text
business profile
  → trusted-domain preview
  → explicit owner approval
  → Firecrawl capture
  → normalized source snapshot
  → structured AI extraction
  → citation and ownership validation
  → proposed requirements
  → human decision
  → confirmed plan and tasks
```

The UI shows `queued`, `running`, `needs_review`, `completed`, `partial`,
`rate_limited`, `failed`, and `cancelled` states. A provider timeout or partial
crawl remains recoverable; it never becomes an empty success.

### Inbound and outbound email

```text
signed AgentMail event
  → deduplication
  → owned-inbox lookup
  → safe normalization
  → AI summary/proposal
  → owner/admin review
  → linked task or status change

editable draft
  → recipient/subject/attachment preview
  → approval snapshot
  → durable AgentMail send
  → delivery/bounce event
  → immutable activity
```

An assistant response cannot call the send or approval transition directly.

### Operating lifecycle

Confirmed recurrence generates reminders at the configured cadence. Source
monitoring compares content hashes before asking AI for a meaningful-change
explanation. A changed page creates a proposal and notification; it does not
rewrite the owner's confirmed record.

## Role model

| Capability | Owner | Admin | Contributor | Viewer |
| --- | :---: | :---: | :---: | :---: |
| Read workspace | Yes | Yes | Yes | Yes |
| Edit work and evidence | Yes | Yes | Yes | No |
| Draft email | Yes | Yes | Yes | No |
| Approve requirement/status proposal | Yes | Yes | No | No |
| Approve external send | Yes | Yes | No | No |
| Invite and change operational roles | Yes | Yes | No | No |
| Export/delete organization or transfer ownership | Yes | No | No | No |

Invitations bind to a normalized, provider-verified account email. Membership,
location ownership, document ownership, quotas, and role are rechecked inside
every protected server operation.

## Trust boundaries

1. Crawled pages, messages, attachments, extracted text, and model output are data—not instructions.
2. Official sources may support a high-confidence proposal; only a human can confirm it for the business.
3. Nonofficial sources remain references and are marked for review.
4. Source URLs are validated before retrieval and captured text is shown in a non-executing reader.
5. Webhook signatures and provider event IDs are verified and deduplicated.
6. Private data, tokens, messages, and inbox addresses are excluded from public fixtures, logs, analytics, and hackathon evidence.

Verification and password-reset emails enter a bounded Convex queue. Transient
AgentMail `404`, `409`, `429`, and server failures honor `Retry-After` and retry
with backoff; the
token-bearing job is deleted after delivery, terminal failure, or expiry.

## Data deletion

Deletion is a bounded, retryable server workflow. It removes the remote
AgentMail inbox, app-owned message links, scheduled work, stored Convex files,
and organization tables before returning the account to onboarding. A provider
failure stays visible and is retried rather than silently orphaning a resource.
