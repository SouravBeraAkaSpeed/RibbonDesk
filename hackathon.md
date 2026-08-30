# Hackathon log

- **Project:** RibbonDesk
- **Event:** Convex All Gas Hackathon
- **What it does:** A collaborative compliance operations desk that helps local businesses open and stay open by turning official requirements and agency correspondence into a live action plan.
- **Live app:** not deployed
- **Repo:** https://github.com/SouravBeraAkaSpeed/RibbonDesk
- **Frontend:** Codex Sites
- **Convex deployment:** not deployed
- **Components:** @convex-dev/agent, @convex-dev/better-auth, @convex-dev/rate-limiter, @convex-dev/workflow
- **Convex features:** schema, indexes, full-text search, queries, mutations, HTTP actions, realtime queries
- **Auth:** Other (Better Auth passkeys on Convex)
- **AI models:** none
- **Started:** 2026-08-30T20:40:25Z
- **Last updated:** 2026-08-30T23:02:28Z

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

### 2026-08-30 - working tree
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
