# RibbonDesk

**Open right. Stay ready.**

RibbonDesk is a collaborative compliance operations desk for local businesses.
It turns official requirements, applications, inspections, agency email,
evidence, and renewals into one live, cited action plan.

The first verified coverage pack focuses on New York City cafés and restaurants.
Any business and location can also run dynamic research, with unsupported or
uncertain coverage clearly marked for human review.

## Product principles

- Official sources before generated claims.
- AI proposes; people approve consequential changes.
- Convex powers the database, functions, realtime sync, workflows, and storage.
- Firecrawl supplies durable official-source research.
- AgentMail provides the location case inbox and durable delivery.
- RibbonDesk prepares and tracks applications; it never impersonates the user
  or files with a government portal.

## Local development

```powershell
npm install
npm run dev
```

Copy `.env.example` to an ignored local environment file and configure only the
values needed for the feature being tested. Provider secrets belong in the
Convex deployment environment and must never be committed.

## Verification

```powershell
npm run typecheck
npm run lint
npm run build
```

The judge-facing build history is maintained in [`hackathon.md`](hackathon.md),
and the current event compliance checklist is in
[`HACKATHON_REQUIREMENTS.md`](HACKATHON_REQUIREMENTS.md).
