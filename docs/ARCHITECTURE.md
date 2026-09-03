# RibbonDesk architecture

This document describes the production boundaries that make RibbonDesk useful
without allowing automation to quietly take actions as the business owner.

## System responsibilities

| Layer                 | Responsibility                                                                                                                   |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| ChatGPT Site          | Responsive interface, verified-email/passkey ceremonies, safe source viewing, optimistic interaction, and realtime subscriptions |
| Better Auth component | Verified email/password, authenticated passkey enrollment, sessions, and identity                                                |
| Convex application    | Authorization, durable data, indexed queries, workflow state, files, schedules, callbacks, quotas, and audit events              |
| Exa                   | Focused discovery and current evidence highlights across government, professional, and commercial sources                        |
| Firecrawl component   | Durable authoritative-page capture and audit snapshots                                                                           |
| OpenAI Responses API  | GPT-5.6 Terra legal/tax reviews and GPT-5.6 Luna journey composition, explanations, and screenshot guidance                      |
| AgentMail             | Location-owned inboxes, messages, attachments, signed events, delivery, and bounce state                                         |

Convex is the source of truth. Provider records are mirrored only where the
application needs ownership, status, evidence, deduplication, or recovery.

## Core data domains

- **Identity:** profiles, organizations, memberships, and email-bound invitations
- **Business:** businesses, locations, structured operating profiles, and lifecycle state
- **Coverage:** versioned packs, trusted official domains, and jurisdiction questions
- **Research:** durable runs, crawl references, snapshots, citations, changes, and provider health
- **Work:** requirements, dependency edges, tasks, applications, packets, inspections, and renewals
- **Journey:** versioned routes, ordered steps, specialist reviews, completion options, and portal visits
- **Evidence:** stored documents, links, extracted proposals, expirations, and exports
- **Communication:** inbox bindings, threads, app-owned message links, drafts, approvals, and delivery state
- **AI governance:** runs, model/prompt versions, structured proposals, confidence, citations, and human decisions
- **Operations:** notifications, preferences, immutable activity, quotas, and cleanup jobs

Growing list queries use indexes and pagination. Protected operations derive the
actor from `ctx.auth`; they never accept a client user ID as proof of identity.

## Durable workflows

### Guided journey research

```text
business profile
  → Exa official/professional/commercial discovery
  → Firecrawl durable evidence capture
  → Terra legal review
  → Terra money-and-tax review
  → citation, source-tier, and location validation
  → Luna plain-language ordering
  → atomic versioned journey publication
  → one current owner action
```

The user sees friendly stages while internal retries remain durable. Three AI
operations are reserved before the run starts so daily limits cannot strand a
partly built route. A provider timeout, rate limit, missing official source, or
failed capture produces a recoverable route state; it never becomes an empty
success.

Only `controlling_government` and `official_explanatory` evidence can support a
Must-do step. `professional_reference` evidence may explain it, while
`commercial_provider` evidence can only populate neutral optional paid-service
choices with a capture date and available pricing excerpt.

### Portal companion

An authenticated preflight accepts only URLs already attached to the researched
route, HTTPS, and public-network hosts. Redirecting, financial, CSP-blocked, or
`X-Frame-Options`-blocked pages open directly. Embeddable pages receive a
sandboxed iframe with a no-referrer policy. Screen sharing begins only after the
browser permission prompt; the owner previews the captured PNG before upload.
Banking steps disable portal tracking and screenshots entirely.

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

| Capability                                       | Owner | Admin | Contributor | Viewer |
| ------------------------------------------------ | :---: | :---: | :---------: | :----: |
| Read workspace                                   |  Yes  |  Yes  |     Yes     |  Yes   |
| Edit work and evidence                           |  Yes  |  Yes  |     Yes     |   No   |
| Draft email                                      |  Yes  |  Yes  |     Yes     |   No   |
| Approve requirement/status proposal              |  Yes  |  Yes  |     No      |   No   |
| Approve external send                            |  Yes  |  Yes  |     No      |   No   |
| Invite and change operational roles              |  Yes  |  Yes  |     No      |   No   |
| Export/delete organization or transfer ownership |  Yes  |  No   |     No      |   No   |

Invitations bind to a normalized, provider-verified account email. Membership,
location ownership, document ownership, quotas, and role are rechecked inside
every protected server operation.

## Trust boundaries

1. Crawled pages, messages, attachments, extracted text, and model output are data—not instructions.
2. Only official sources can produce Must-do journey steps; specialist AI performs the evidence review and retains its trace.
3. Nonofficial sources can explain or offer optional paid help but cannot create an obligation.
4. Source and portal URLs are HTTPS/public-network validated before retrieval and captured text is treated as untrusted data.
5. Webhook signatures and provider event IDs are verified and deduplicated.
6. Private data, tokens, messages, and inbox addresses are excluded from public fixtures, logs, analytics, and hackathon evidence.
7. Direct OpenAI requests set `store: false`, carry no app metadata, title, URL, or custom identifying headers, and use only a hashed workspace safety identifier when abuse isolation is useful.

Verification and password-reset emails enter a bounded Convex queue. Transient
AgentMail `404`, `409`, `429`, and server failures honor `Retry-After` and retry
with backoff; the
token-bearing job is deleted after delivery, terminal failure, or expiry.

## Data deletion

Deletion is a bounded, retryable server workflow. It removes the remote
AgentMail inbox, app-owned message links, scheduled work, stored Convex files,
and organization tables before returning the account to onboarding. A provider
failure stays visible and is retried rather than silently orphaning a resource.
