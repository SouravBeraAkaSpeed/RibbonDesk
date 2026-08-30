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
  repository, and pushed through the passkey/authenticated-workspace milestone.
- **Convex application:** A development deployment is active. The app has an
  indexed domain schema, authenticated queries and mutations, HTTP auth routes,
  activity events, and a realtime command-center query. Production deployment
  is still pending.
- **Convex plugin:** Installed. The current Codex session exposes the official
  Convex skills. Recheck availability after a restart or in a new task before
  relying on it.
- **Hackathon skill:** Installed project-locally at
  `.agents/skills/convex-hackathon-skill/` with both required Markdown files.
- **Build log:** Created at the Git root and updated from repository evidence.
- **Frontend:** ChatGPT Sites (`chatgpt.site`) selected.
- **Sites project:** Scaffolded with the required Sites starter and shadcn
  add-on. The local development preview and production build both run.
- **Public demo:** Implemented locally with synthetic data, interactive task and
  proposal state, responsive navigation, and no provider calls or external
  side effects. Public deployment is still pending.
- **Authentication:** Passkey-first registration and sign-in are implemented
  with a local Better Auth Convex component. An automated virtual-authenticator
  smoke test proves registration, sign-out, sign-in, authenticated onboarding,
  jurisdiction confirmation, and access to the realtime desk.
- **Core workspace:** Organization ownership, role enforcement, business and
  location setup, explicit jurisdiction confirmation, requirement/task data
  foundations, the command center, source preview, replay research, cited
  proposal review, and approval-gated task creation are deployed to development.
- **Sponsor components:** AgentMail and Firecrawl components are registered,
  along with Agent, Workflow, and Rate Limiter. The durable Firecrawl callback
  and structured OpenAI extraction paths are implemented behind explicit live
  mode; the default synthetic replay and human-approval loop pass in a browser.
  Live sponsor credentials and end-to-end provider calls are not yet verified.
- **Policy routes:** Privacy, terms, and the legal-information disclaimer are
  implemented locally.
- **Accounts/external actions:** Luma registration is complete. Vibe Apps
  sign-in, live sponsor credentials, live provider smoke tests, the social
  post, production deployment, and submission are still pending.

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
