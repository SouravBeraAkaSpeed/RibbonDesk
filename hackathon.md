# Hackathon log

- **Project:** RibbonDesk
- **Event:** Convex All Gas Hackathon
- **What it does:** A collaborative compliance operations desk that helps local businesses open and stay open by turning official requirements and agency correspondence into a live action plan.
- **Live app:** not deployed
- **Repo:** https://github.com/SouravBeraAkaSpeed/RibbonDesk
- **Frontend:** Codex Sites
- **Convex deployment:** not deployed
- **Components:** @convex-dev/agent, @convex-dev/better-auth, @convex-dev/rate-limiter, @convex-dev/workflow, @firecrawl/firecrawl-convex, @agentmail/convex
- **Convex features:** schema, indexes, full-text search, queries, mutations, actions, HTTP actions, scheduled functions, realtime queries, file storage
- **Auth:** Other (Better Auth passkeys on Convex)
- **AI models:** gpt-5.6-terra
- **Started:** 2026-08-30T20:40:25Z
- **Last updated:** 2026-08-31T00:17:04Z

## Log

### 2026-08-30
I started the project by reviewing the official event rules, judging criteria,
submission flow, setup prompt, and sponsor resources. I installed the official
project-local build-log skill and captured a requirements checklist before
choosing the product or implementation (`hackathon.md`,
`HACKATHON_REQUIREMENTS.md`, `.agents/skills/convex-hackathon-skill/`).

### 2026-08-30
I registered for the event on Luma, confirmed that the Convex plugin is
installed, and selected ChatGPT Sites for the public frontend. I also clarified
that `allgas` is the hackathon workspace; the actual app will live in a named
child folder after I choose the product concept.

### 2026-08-30
I chose RibbonDesk as the product direction: a daily operating desk for local
businesses to manage requirements, agency correspondence, applications,
inspections, evidence, deadlines, and renewals from opening onward. I narrowed
the differentiator away from one-time permit checklists and toward a persistent,
collaborative, source-backed compliance case file.

### 2026-08-30 - 4d219c5
I initialized RibbonDesk as a ChatGPT Sites project in its public repository and
built the first recognizable product surface. The landing experience now shows
the calm civic-studio brand, the opening-readiness desk, cited-work positioning,
and clear paths into the public demo and passkey app (`app/page.tsx`,
`app/globals.css`, `app/layout.tsx`). I generated and wired a matching social
preview, added public-safe environment and setup documentation, and configured
CI for lint, type checking, and production builds (`public/og.png`,
`.env.example`, `README.md`, `.github/workflows/ci.yml`). All three local checks
pass before the first commit.

### 2026-08-30 - 32fd01a
I shipped the first complete judge-facing product path: a public, isolated demo
of an NYC café workspace with a reactive task queue, readiness scoring,
requirements and dependencies, official-source evidence, an agency inbox, and a
human approval gate for an AI-proposed inspection update (`app/demo/`). The demo
uses synthetic browser-local state and cannot upload, send mail, or invoke paid
providers. I also added the passkey entry surface and plain-language privacy,
terms, and legal-disclaimer routes (`app/app/`, `app/privacy/`, `app/terms/`,
`app/disclaimer/`). I verified desktop and mobile layouts in a browser, exercised
the proposal state transition, confirmed a clean browser console, and reran
lint, TypeScript, and the production build successfully.

### 2026-08-30 - 6d87efc
I connected the real authenticated product path to a Convex development
deployment. I added passkey-first registration and sign-in, server-enforced
organization roles, indexed business and location records, explicit
jurisdiction confirmation, requirements and task foundations, immutable
activity events, and a live command-center query (`convex/`, `app/app/`). I
registered the Agent, Better Auth, Rate Limiter, Workflow, Firecrawl, and
AgentMail components; provider credentials and live sponsor calls are still
pending. An automated Chromium smoke test with a virtual hardware authenticator
now proves registration, sign-out, sign-in, onboarding, NYC coverage selection,
and the authenticated realtime desk (`scripts/smoke-passkey.mjs`). Convex
deployment, lint, TypeScript, and the production build all pass.

### 2026-08-30 - b49230e
I shipped the cited requirement-research and human-review loop in the
authenticated workspace (`convex/research.ts`, `convex/proposals.ts`,
`app/app/research-panel.tsx`). A user can preview the official source scope,
start a quota-controlled durable research run, watch its state reactively, and
accept, edit, reject, or mark a cited proposal not applicable. Only an owner or
admin can turn a proposal into a confirmed requirement and next-action task;
the decision and source snapshot stay in the activity record. The default
provider mode uses a clearly labeled synthetic NYC replay, while live mode is
wired for Firecrawl completion callbacks and structured OpenAI extraction but
has not yet been exercised with sponsor credentials. The browser smoke test now
proves replay research, human approval, and realtime task creation, and Convex
deployment, lint, TypeScript, and the production build pass again.

### 2026-08-30 - 7a89c7f
I added the evidence locker and application-preparation workflow
(`convex/documents.ts`, `convex/applications.ts`,
`app/app/evidence-applications-panel.tsx`). I can now upload an owned file to
Convex storage, have its actual content checked before use, confirm its type and
optional expiry, attach it to a cited requirement or application, reuse
structured business answers, complete readiness checks, and record an external
submission reference. RibbonDesk generates versioned PDF summaries and ZIP
attachment bundles in Convex storage, with every packet explicitly labeled
“prepared, not filed.” I rendered and visually inspected both pages of a
generated packet, confirmed it contains no embedded JavaScript, and verified
the authenticated download bytes. The browser smoke also proves that a file
with active PDF content is rejected. Convex deployment, lint, TypeScript, and
the production build pass with this slice.

### 2026-08-31 - working tree
I built the location case-inbox workflow on the AgentMail component
(`convex/inbox.ts`, `convex/http.ts`, `app/app/case-inbox-panel.tsx`). The app
now keeps an owned inbox binding, a reactive sanitized message thread, editable
outbound drafts, safety-checked attachments, immutable approval snapshots, and
visible delivery states. Inbound mail is wired to a structured OpenAI
classification action that can propose a deadline task but cannot apply it;
owners or admins must accept or reject the proposal. Outbound delivery is also
locked behind an owner/admin approval record. The default provider mode uses a
clearly labeled safe replay and does not contact an external recipient; live
AgentMail webhook, durable-send, delivery-status, and OpenAI classification
paths are implemented but have not yet been exercised with sponsor credentials.
The browser smoke proves the complete replay loop and observes the new proposal
reactively in a second authenticated browser context. Convex deployment, lint,
TypeScript, and the production build pass again.
