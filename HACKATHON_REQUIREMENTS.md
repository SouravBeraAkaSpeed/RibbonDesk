# Convex All Gas Hackathon requirements

Verified on 2026-08-31 IST from the official Convex event page, the Luma event
page, linked sponsor documentation, and the Vibe Apps submission page. The live
event pages remain the source of truth if any detail changes.

## At a glance

- **Build window:** New apps only, started on or after August 25, 2026 at
  12:00 PM PT (August 26 at 12:30 AM IST).
- **Submission deadline:** September 22, 2026 at 12:00 PM PT (September 23 at
  12:30 AM IST).
- **Winners:** September 25, 2026; no announcement time is published.
- **Team:** Solo or a team of up to four. Only one team member needs to register
  on Luma.
- **Core product:** A new everyday full-stack app with Convex as its backend.
- **Submission:** Public repository, root `hackathon.md`, public live app, and a
  video under three minutes, submitted through the exact Vibe Apps event link.
- **Published judging weights:** None. The organizers list criteria, but no
  numeric weighting.

## Eligibility and rules

- Participants must be at least 18.
- Employees of Convex, OpenAI, Firecrawl, or AgentMail, and their immediate
  family members, are ineligible.
- The event excludes people or organizations where US or local law prohibits
  participation or receipt of a prize. The official text specifically lists
  Quebec, Russia, Crimea, Cuba, Iran, North Korea, Syria, and jurisdictions
  designated by the US Treasury's Office of Foreign Assets Control.
- The app must be original and must not violate intellectual-property rights.
- Only apps started on or after August 25 at 12:00 PM PT qualify.
- Multiple submissions are allowed, but each qualifying app must meet the
  requirements.
- The repository must be public at submission time.

## What we must build

- Convex must do real backend work: database, functions, and real-time sync.
- Use Codex or another coding agent/IDE with the Convex integration.
- The competition page evaluates OpenAI, Firecrawl, and AgentMail as a sponsor
  stack and says they must generate, crawl, or send rather than merely appear in
  documentation. The safest competitive interpretation is to give all three a
  visible, necessary role in the user workflow.
- Build an everyday product that a real person could use now. Developer-only
  tooling, thin hosted frontends, and obvious copies are explicitly weak fits.
- Convex Auth is optional. The linked Auth v2 build is super-alpha and warns
  that APIs can change; avoid it unless the product genuinely needs auth and we
  accept that risk.
- The Convex AI Gateway is optional and only available to paid Convex teams.
  Direct provider calls from Convex actions remain possible with deployment
  environment variables.

## Judging criteria translated into build checks

### Everyday app, creativity, and usefulness

- Pick a concrete user and painful workflow in a real domain.
- Demonstrate an end-to-end task, not a prompt wrapper or developer utility.
- Make the value legible in the first minute of the demo.

### Convex depth

- Show evidence-backed queries and mutations.
- Use live updates/realtime subscriptions in a visible part of the product.
- Use actions, HTTP actions, scheduling, search, file storage, auth, or maintained
  Convex components where they belong.
- Avoid a static frontend with Convex added only nominally.

### Sponsor stack

- OpenAI should generate, decide, classify, extract, or otherwise perform a
  central AI task.
- Firecrawl should scrape, map, search, or run a durable crawl that feeds the
  product's actual workflow.
- AgentMail should receive, thread, or durably send product email; an inbox in a
  README is not enough.
- Surface the handoffs among these systems in the live product and video.

### Presentation and proof

- Keep `hackathon.md` factual, current, public-safe, and written in the builder's
  first-person voice.
- Include the final stack, live URL, repo, and demo link in the log.
- Publish a live `convex.site` or `chatgpt.site` page that judges can open
  without an invite or login.
- Post the build on X or LinkedIn and tag `@convex`, `@OpenAI`, `@firecrawl`, and
  `@agentmail`. Engagement counts.
- Keep the demo under three minutes and click through the real app more than we
  talk about it.

## Required participation and submission flow

1. Register on the official Luma event page. Only one registration is needed
   per team.
2. Configure the Convex integration for the coding agent.
3. Build a new app with Convex as the backend and keep `hackathon.md` current.
4. Choose exactly one approved public frontend host:
   - `convex.site` using `@convex-dev/static-hosting`, or
   - `chatgpt.site` using ChatGPT Sites.
5. Publish the social post with all four sponsor tags.
6. Sign up or sign in to Vibe Apps and submit through the event's exact URL
   before the deadline.
7. Submit the public repository, public live-app URL, and demo video. Confirm
   the repository-root `hackathon.md` is present and current.

The public submission page is currently gated by Vibe Apps sign-up/sign-in, so
its authenticated form fields cannot yet be verified. Recheck them well before
the deadline rather than discovering extra fields during the final hour.

## Setup status in this workspace

- **Environment:** Codex in the ChatGPT desktop app on Windows.
- **Repository:** Initialized on `main`, connected to the public GitHub
  repository, and pushed through the collaboration, authorization, search,
  export, deletion, accessibility, and provider-contract hardening milestone.
  The root now includes an MIT license, author metadata, contribution and
  conduct policies, private security-reporting guidance, architecture and
  deployment runbooks, issue/PR templates, Dependabot, CI, and a product-led
  README using the actual RibbonDesk brand assets.
- **Convex application:** A development deployment is active. The app has an
  indexed domain schema, authenticated queries and mutations, HTTP auth routes,
  activity events, and a realtime command-center query. The production
  deployment is bound to the final public Site origin and now runs this verified
  backend source in live mode. OpenRouter, Firecrawl, and AgentMail production
  health checks pass, and the complete production AgentMail acceptance journey
  passes through the existing public Site. Authenticated organization, business,
  and location edits are role-checked, audited, and deployed to production.
- **Convex plugin:** Installed. The current Codex session exposes the official
  Convex skills. Recheck availability after a restart or in a new task before
  relying on it.
- **Hackathon skill:** Installed project-locally at
  `.agents/skills/convex-hackathon-skill/` with both required Markdown files.
- **Build log:** Created at the Git root and updated from repository evidence.
- **Frontend:** ChatGPT Sites (`chatgpt.site`) selected.
- **Sites project:** Scaffolded with the required Sites starter and shadcn
  add-on. The preferred `ribbondesk` slug is reserved, its opaque Sites project
  identity is persisted in `.openai/hosting.json`, and the local development
  preview and production build both run. The verified source is deployed at
  `https://ribbondesk.souravberaakagralius.chatgpt.site` with public access.
  The landing experience detects authenticated sessions, and the saved four-step
  onboarding flow supports revisiting completed steps before jurisdiction
  confirmation. The Google callback gate now hydrates from identical server and
  client markup so it cannot create a framework error overlay during startup.
  Sites version 11 is the current production release. An authenticated production
  walkthrough verified session-aware landing actions, reversible saved setup,
  dynamic coverage for a non-food NYC office, a live cited research proposal,
  and an active AgentMail case inbox without sending external mail. The operating
  desk is split into eight URL-backed workspaces whose links, browser history,
  and direct reloads were verified in production. Existing Ribbon Assistant
  output renders as safe semantic Markdown with a working official-source link
  instead of exposing Markdown syntax. Production runtime checks report no
  browser errors.
- **Public product path:** The synthetic workspace has been removed from the
  current source. `/demo` now redirects to the real passkey workspace at `/app`.
  Judges will evaluate the same persistent product path a business owner uses;
  a separate recorded walkthrough must be captured from the real app after live
  provider credentials are configured.
- **Authentication:** Better Auth on Convex supports verified email/password,
  password reset, and passkeys that can only be enrolled from an authenticated
  account. The public release intentionally renders no Google or Apple control;
  the release smoke test fails if either one appears. AgentMail security mail
  is persisted into a bounded Convex retry queue before delivery. The automated
  authentication journey is designed to cover registration, email verification, password
  sign-in/reset, authenticated passkey enrollment/sign-in, onboarding,
  jurisdiction confirmation, and controlled workspace cleanup. Google remains
  an operator-only regression configuration and Apple is deferred. A dedicated
  verified owner account and isolated workspace have been provisioned for
  judges; the production email confirmation and full four-step onboarding both
  completed. Its credentials are confined to private submission notes and never
  committed or rendered on the public Site. AgentMail's current three-inbox plan
  is full, so creating an additional judge case inbox requires removing an
  existing owner-approved inbox or upgrading the provider plan.
- **Core workspace:** Organization ownership, role enforcement, business and
  location setup, explicit jurisdiction confirmation, a real cited-requirement
  and task editor, the command center, source preview, live-only research, cited
  proposal review, approval-gated task creation, safe evidence uploads, document
  expiry capture, reusable application answers, readiness checks, and versioned
  PDF/ZIP application packets are deployed to development. A location-owned
  case inbox now adds sanitized reactive threads, AI-proposed deadline work,
  editable drafts, reviewed attachments, immutable send approvals, and delivery
  state tracking. The operating lifecycle now adds inspections, corrective
  tasks, renewal cycles, durable reminder scheduling, document-expiry reminders,
  per-user notification state, and recurrence roll-forward. A durable,
  teammate-private Ribbon Assistant thread now answers from the bounded
  workspace record without state-changing tools. Indexed weekly/monthly source
  monitoring preserves before/after evidence and requires owner/admin review
  before linked requirements move to needs-attention. Expiring email-bound
  invitations, member role management, indexed command search, cancellable
  research, owner export, and bounded owner-confirmed deletion now cover the
  core collaboration and data-control paths.
- **Evidence verification:** Authenticated browser automation proves accepted
  uploads, active-content PDF rejection, evidence linking, packet generation,
  and private PDF/ZIP downloads. Both pages of a generated PDF were rendered
  and inspected; the packet carries the explicit prepared-not-filed boundary.
  The same browser suite downloads and parses a paginated organization export.
  Permanent deletion is now executed only against a temporary controlled
  workspace and proves bounded app-data deletion plus remote inbox removal; the
  shared development workspace is never used as the destructive test target.
- **Sponsor components:** AgentMail and Firecrawl components are registered,
  along with Agent, Workflow, and Rate Limiter. A controlled live Firecrawl run
  captures official source text into Convex storage; OpenRouter models generate
  cited proposals and a grounded Assistant answer; and a second browser observes
  the accepted work in realtime. The signed AgentMail webhook receives a real
  controlled message, OpenRouter proposes follow-up work, an owner approves it,
  and a separately approved reply reaches the controlled recipient. Workspace
  deletion also removes its provider inbox. These tests use real provider
  credentials and no replay or synthetic provider data. Production provider
  health and the complete production AgentMail journey are also verified.
- **Operations verification:** Authenticated browser automation proves the
  opening-to-operating transition, a failed-inspection blocker, expiring
  evidence, a near-term in-app reminder, saved notification preferences, and
  renewal completion that creates the next cycle. The same smoke proves a
  grounded Assistant answer and a replayed source change that produces
  before/after evidence, an approval record, a needs-attention requirement, and
  blocking review work. A second virtual passkey account proves invitation
  acceptance, contributor access, and hidden owner/admin controls. Focused CI
  unit tests cover role rank, approval transitions, citation protocol,
  dependency cycles, reminder cadence, end-of-month recurrence, and readiness
  scoring. Live opt-in scheduled reminder-email delivery remains a separate
  pending acceptance check; the case-inbox AgentMail flow itself is verified.
- **Policy routes:** Privacy, terms, and the legal-information disclaimer are
  publicly deployed and verified without authentication.
- **Accounts/external actions:** Luma registration is complete. Development
  credentials, both controlled live-provider smoke tests, production provider
  configuration, and the production AgentMail browser journey are complete.
  Vibe Apps sign-in, the final public Site deployment, the social post, and
  submission are still pending. The currently
  published Site predates this verified live-provider source and must not be
  treated as the final judging build until the production release gate passes.

### Convex plugin verification and recovery

The plugin is available in this session. If a later task cannot see the Convex
skills, inspect the current marketplaces and plugins, add the Convex marketplace
if absent, reinstall the full plugin, verify it, and restart Codex:

```powershell
codex plugin marketplace list
codex plugin list --json
codex plugin marketplace add get-convex/convex-codex-plugin
codex plugin add convex@convex-codex-plugin
codex plugin marketplace list
codex plugin list --json
```

The current CLI accepts JSON for `codex plugin list`, but not for
`codex plugin marketplace list`; the plain marketplace list is the verified
equivalent in this environment.

The project now meets the Convex-app detection conditions. Recheck managed AI
files after component or Convex CLI upgrades:

```powershell
npx convex ai-files status
npx convex ai-files install
npx convex ai-files status
```

The generated Convex guidance is present under `convex/_generated/ai/`.

## Hosting notes

### `convex.site`

```powershell
npm install @convex-dev/static-hosting
npx @convex-dev/static-hosting setup
npm run deploy
```

The setup command registers the component and adds a deploy script without
overwriting an existing Convex config or deploy script. First production
deployment requires Convex CLI authentication (`npx convex login`). The final
URL is `https://<deployment>.convex.site`.

### `chatgpt.site`

ChatGPT Sites is managed from ChatGPT web or desktop. A new Site is restricted
to its owner and workspace admins until its access changes. Before submission,
set the audience to **Anyone on the internet** and verify the final URL without
an authenticated session. Enterprise workspaces may require an administrator
to enable public publishing.

## Sponsor integration notes

### Firecrawl

- Package: `@firecrawl/firecrawl-convex`.
- Supports scrape, map, search, and durable crawls from Convex actions.
- Durable crawls store pages/progress in Convex for reactive UI updates.
- A Firecrawl API key is required. Webhook mode should also use a webhook
  secret; local development can use polling.
- Guard paid endpoints in app-owned functions because the component cannot see
  the app's auth context.

### AgentMail

- Package: `@agentmail/convex`.
- Stores inboxes, inbound/outbound messages, events, delivery status, labels,
  and thread relationships in isolated Convex tables.
- Supports reactive inbox queries, durable sends with retries, webhook
  deduplication, and message callbacks.
- Requires `AGENTMAIL_API_KEY`; webhook handling also requires
  `AGENTMAIL_WEBHOOK_SECRET`. Keep values only in Convex deployment environment
  variables, never in source or `hackathon.md`.

### OpenAI

- Use OpenAI for an indispensable product capability, not only for project
  generation.
- If the paid Convex AI Gateway is unavailable, call the provider from a Convex
  action using a secret stored as a Convex deployment environment variable.

## Build-log policy

- Treat `hackathon.md` as public and judge-facing.
- Write in first person as the builder, direct and factual.
- Update it after meaningful work, using `/hackathon` or
  `$convex-hackathon-skill` in a new Codex session once the installed skill is
  discovered.
- Tie claims to code, configuration, commits, tests, or verified deployment
  evidence. Installing a package does not prove the integration works.
- Never include secrets, tokens, deployment keys, private database records,
  inbox addresses, personal data, or copied message content.
- A no-change run must not add a duplicate entry.

## Prize summary

- Overall: $10,000 cash, $5,000 Codex credits, 3 months Firecrawl Growth,
  6 months AgentMail Startup, and sponsor swag.
- Second: $5,000 cash, $2,500 Codex credits, 3 months Firecrawl Growth,
  3 months AgentMail Startup, and swag.
- Third: $1,500 cash, $1,000 Codex credits, 3 months Firecrawl Growth,
  3 months AgentMail Startup, and swag.
- The event describes $25,000 as cash plus Codex credits. The Luma page calls
  the broader package $45,000 when it also counts $20,000 in Firecrawl credits
  available to each participant during the build.
- No OpenAI API credits or Convex credits are supplied during the hackathon or
  as prizes.

## Official links

- Event page: https://www.convex.dev/hackathons/all-gas
- Registration: https://luma.com/convex-allgas-hackathon
- Submission: https://vibeapps.dev/judging/convex-all-gas-hackathon-openai/submit
- Setup instructions: https://www.convex.dev/agent-setup.md
- Hackathon skill: https://github.com/get-convex/convex-hackathon-skill
- Codex + Convex: https://docs.convex.dev/ai/using-codex
- Convex agent plugins: https://docs.convex.dev/ai/overview#plugins
- Static hosting: https://www.convex.dev/components/static-hosting
- Firecrawl component: https://www.convex.dev/components/firecrawl/firecrawl-convex
- AgentMail component: https://www.convex.dev/components/agentmail/convex
- Auth v2 alpha: https://auth-v2.previews.convex.dev/getting-started
- Convex AI Gateway: https://docs.convex.dev/ai-gateway/overview
- ChatGPT Sites: https://learn.chatgpt.com/docs/sites?surface=app
- Discord/community: https://convex.dev/community
