# RibbonDesk

**Open right. Stay ready.**

RibbonDesk helps a local business owner understand what must be done to open a
business and keep it running. The owner describes the business and location;
RibbonDesk researches official sources, proposes a cited plan for human review,
organizes tasks and evidence, turns agency email into reviewed follow-up work,
and keeps renewals and inspections visible after opening.

NYC cafés and restaurants are the first verified coverage pack. Any business
and location can use dynamic official-source research, with unsupported or
uncertain results clearly labeled for review.

## What a real user can do

- Create a passkey account and a role-protected organization.
- Configure a business and explicitly confirm its jurisdiction.
- Run a live Firecrawl research job and review OpenRouter-generated proposals
  with preserved official-source evidence.
- Accept, edit, reject, or mark each proposal not applicable; AI never silently
  confirms a business requirement.
- Manage requirements, dependencies, tasks, evidence, application preparation,
  inspections, renewals, notifications, and source changes in realtime.
- Provision a location-owned AgentMail case inbox, receive agency messages,
  approve AI-proposed follow-up work, and approve an editable reply before it
  can leave the app.
- Ask Ribbon Assistant grounded questions about the workspace record.
- Export organization data or permanently delete it, including the remote case
  inbox and stored Convex files.

RibbonDesk prepares and tracks work. It does not file government applications,
make legal decisions, or send email without an owner/admin approval record.

## Stack

- ChatGPT Sites / Vinext, React, TypeScript, Tailwind, and shadcn
- Convex database, realtime queries, functions, HTTP actions, crons, components,
  and file storage
- Better Auth passkeys on Convex
- Firecrawl for official-source capture
- OpenRouter for `openai/gpt-5.6-terra` and `openai/gpt-5.6-luna`
- AgentMail for location case inboxes, signed webhooks, and delivery

## Local setup

```powershell
npm install
npx convex dev
npm run dev
```

The app opens at `http://localhost:3000`. Copy `.env.example` to an ignored
local environment file, and set provider secrets in the Convex deployment
environment. Never commit `.env`, `.env.local`, provider keys, webhook secrets,
private inbox addresses, or customer records.

Required live-provider variables:

- `OPENROUTER_API_KEY`
- `FIRECRAWL_API_KEY`
- `AGENTMAIL_API_KEY`
- `AGENTMAIL_WEBHOOK_SECRET`
- `BETTER_AUTH_SECRET`
- `RIBBONDESK_PROVIDER_MODE=live`
- `SITE_URL` and the public Convex/Sites URLs shown in `.env.example`

The model IDs, provider base URLs, and Firecrawl webhook variables are optional
overrides. The client receives only public site and Convex URLs.

## Verification

```powershell
npx convex dev --once
npm run typecheck
npm run lint
npm run test:unit
npm run test:passkey
npm run build
npm audit --omit=dev
```

Controlled live-provider checks create temporary passkey workspaces and
provider resources, then clean them up:

```powershell
npm run test:live-research
npm run test:live-agentmail
```

The AgentMail check proves inbox provisioning, signed inbound delivery,
OpenRouter classification, human approval, approved outbound delivery, and
provider-side inbox deletion. The research check proves live Firecrawl capture,
cited OpenRouter proposals, the safe source reader, human acceptance, realtime
updates in a second tab, and a grounded Assistant answer.

The judge-facing first-person build history is maintained in
[`hackathon.md`](hackathon.md), and the event checklist is in
[`HACKATHON_REQUIREMENTS.md`](HACKATHON_REQUIREMENTS.md).
