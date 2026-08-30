# Hackathon log

- **Project:** RibbonDesk
- **Event:** Convex All Gas Hackathon
- **What it does:** A collaborative compliance operations desk that helps local businesses open and stay open by turning official requirements and agency correspondence into a live action plan.
- **Live app:** not deployed
- **Repo:** https://github.com/SouravBeraAkaSpeed/RibbonDesk
- **Frontend:** Codex Sites
- **Convex deployment:** not deployed
- **Components:** none
- **Convex features:** none yet
- **Auth:** none
- **AI models:** none
- **Started:** 2026-08-30T20:40:25Z
- **Last updated:** 2026-08-30T21:59:18Z

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

### 2026-08-30 - working tree
I initialized RibbonDesk as a ChatGPT Sites project in its public repository and
built the first recognizable product surface. The landing experience now shows
the calm civic-studio brand, the opening-readiness desk, cited-work positioning,
and clear paths into the public demo and passkey app (`app/page.tsx`,
`app/globals.css`, `app/layout.tsx`). I generated and wired a matching social
preview, added public-safe environment and setup documentation, and configured
CI for lint, type checking, and production builds (`public/og.png`,
`.env.example`, `README.md`, `.github/workflows/ci.yml`). All three local checks
pass before the first commit.
