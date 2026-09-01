# Hackathon log

- **Project:** RibbonDesk
- **Event:** Convex All Gas Hackathon
- **What it does:** A collaborative compliance operations desk that helps local businesses open and stay open by turning official requirements and agency correspondence into a live action plan.
- **Live app:** https://ribbondesk.souravberaakagralius.chatgpt.site
- **Repo:** https://github.com/SouravBeraAkaSpeed/RibbonDesk
- **Frontend:** Codex Sites
- **Convex deployment:** https://steady-sockeye-84.convex.cloud
- **Components:** @convex-dev/agent, @convex-dev/better-auth, @convex-dev/rate-limiter, @convex-dev/workflow, @firecrawl/firecrawl-convex, @agentmail/convex
- **Convex features:** schema, indexes, full-text search, queries, mutations, actions, HTTP actions, scheduled functions, realtime queries, file storage
- **Auth:** Other (Better Auth passkeys on Convex)
- **AI models:** openai/gpt-5.6-terra and openai/gpt-5.6-luna through OpenRouter
- **Started:** 2026-08-30T20:40:25Z
- **Last updated:** 2026-08-31T17:32:00Z

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

### 2026-08-31 - 0fcde1b

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

### 2026-08-31 - 5855381

I extended the workspace from opening preparation into recurring stay-open
operations (`convex/operations.ts`, `convex/crons.ts`,
`app/app/operations-lifecycle-panel.tsx`). Moving a location to operating now
preserves its opening history and activates confirmed recurring requirements.
I can schedule an inspection, record a supported outcome, create blocking
corrective work after a failure, track an explicit renewal cycle, start and
complete it, and roll the same requirement into its next cycle. Convex
schedules the 90/60/30/14/7/1-day reminder cadence durably, an hourly job marks
overdue cycles, and expiring checked documents use the same in-app notification
path. Per-user read state and opt-in email/digest preferences are stored; live
notification email delivery is not yet verified. The authenticated browser
smoke proves the operating transition, failed-inspection task, dated evidence,
near-term reminder, saved preference, and renewal roll-forward. Convex
deployment, lint, TypeScript, and the production build pass.

### 2026-08-31 - 28b80fb

I added Ribbon Assistant as a durable, private workspace thread grounded in
confirmed requirements, tasks, applications, agency messages, inspections,
renewals, and preserved source evidence (`convex/assistant.ts`,
`app/app/assistant-sources-panel.tsx`). It cites official sources when present,
labels uncertainty, and has no tools that can send, approve, delete, or change
compliance state. I also added indexed weekly opening and monthly operating
source checks with before/after snapshots and an owner/admin review gate
(`convex/sourceMonitor.ts`, `convex/research.ts`, `convex/crons.ts`). Accepting a
change creates blocking review work instead of silently rewriting a confirmed
requirement. The authenticated browser smoke proves a grounded answer and the
complete replay detection-to-approval loop; live OpenAI and Firecrawl calls
remain pending credentials. Convex deployment, lint, TypeScript, and the
production build pass.

### 2026-08-31 - aea7d0f

I hardened the authenticated workspace for real collaboration and data control.
Owners and admins can create expiring private invitations that bind to the
invitee's exact passkey-account email; the two-account browser test proves
acceptance, the contributor role, and the absence of owner/admin approval
controls (`convex/organizations.ts`, `app/app/team-panel.tsx`). I added indexed
workspace search with a keyboard command palette, cancellable research, a
paginated owner JSON export, and exact-name-confirmed deletion that clears app
records, stored files, inbox mappings, and Agent threads in bounded batches
(`convex/search.ts`, `convex/dataControls.ts`). The export is downloaded and
parsed in the browser smoke; permanent deletion is implemented but intentionally
not run against the shared development workspace. CI now runs focused unit tests
for role boundaries, requirement approval, citation safety, dependency cycles,
reminder cadence, recurrence, and readiness math. Convex deployment, lint,
TypeScript, unit tests, the production build, and the full browser smoke pass.

### 2026-08-31 - 4696e2f

I created the production Convex deployment and reserved RibbonDesk's preferred
`ribbondesk` ChatGPT Sites slug, then persisted the Sites project identity in
the repository (`.openai/hosting.json`). The production backend contains the
same verified schema, indexes, components, functions, HTTP routes, and scheduled
jobs as the development build. I generated a separate production auth secret
without writing it to source and left provider mode on the safe replay setting;
I copied the existing Firecrawl credential into production without exposing or
persisting it; live mode stays disabled until the complete provider loop can be
tested. OpenAI and AgentMail production credentials and all controlled sponsor
smoke tests remain pending. I deployed the exact verified source as an owner-only Site
at `https://ribbondesk.souravberaakagralius.chatgpt.site`, then rebound the
production auth origin and Sites metadata to that assigned URL. At this commit,
public access and signed-out verification were still pending.

### 2026-08-31 - 6800352

I published RibbonDesk for anyone on the internet after explicit approval. I
verified the landing page, isolated demo, passkey entry, privacy, terms, and
disclaimer routes without authentication; all returned successfully with their
expected content. The production runtime reported no worker errors during the
check. The authenticated product remains in replay mode until the controlled
OpenAI, Firecrawl, and AgentMail live tests are complete.

### 2026-08-31 - working tree

I rebuilt the public landing experience around a spacious, friendly 3D visual
system. The page now uses a soft peach outer frame, a generous white canvas,
editorial typography, original 3D business-owner and storefront artwork, and
restrained floating/parallax motion. The long-form story now explains the
problem, guided research, daily command center, connected agency inbox,
human-approval boundary, stay-open lifecycle, supported business types, public
demo, and core FAQs without turning the first viewport into a dense dashboard
(`app/page.tsx`, `app/globals.css`, `public/art/`). I also replaced the social
preview with the same peach, indigo, coral-ribbon, and friendly 3D character
language. The experience remains responsive and preserves the reduced-motion
path. TypeScript, lint, unit tests, the local landing route, and the production
build pass.

I refined the hero trust language after reviewing the first impression. The
opening line now says “Your opening, clearly organized” instead of leading with
institutional compliance terminology; the detailed regulatory explanation
remains further down the page where the product has established context.

I recorded and documented the complete public evaluation journey at full HD:
the long-form landing story, interactive demo, teammate update, task completion,
agency inbox, human approval, requirements plan, official sources, search,
notifications, and both passkey entry states. The recording uses 2560×1440
source captures rendered to a sharp 1920×1080 H.264 video, with public-safe
captions and a timestamped test report (`artifacts/flow-recording/`). The manual
test also identified three honest demo gaps for the next slice: secondary
workspace navigation, notification content, and stronger search results.

I rejected and removed the slideshow-style recording and the synthetic public
workspace after reviewing them as the wrong representation of the product. The
current source now sends `/demo` to the real passkey workspace, removes every
demo call to action, defaults provider behavior to live, and blocks external
research or inbox provisioning when genuine credentials are absent instead of
manufacturing replacement data. I removed the global glass/3D layer from all
working surfaces and rebuilt the passkey and onboarding cards with solid,
high-contrast rendering so forms and text remain sharp. I also added a
Convex-backed live operating plan where a real user can enter cited requirements,
approve them with role checks, create and link tasks, and move both records
through realtime statuses (`app/app/work-plan-panel.tsx`,
`convex/integrations.ts`). At that point, genuine OpenAI, Firecrawl, and
AgentMail credentials remained the explicit blocker for end-to-end live
provider verification.

### 2026-08-31 - working tree

I replaced the unverified provider boundary with two controlled live acceptance
journeys. RibbonDesk now calls OpenRouter from Convex actions using
`openai/gpt-5.6-terra` for requirement synthesis and grounded answers and
`openai/gpt-5.6-luna` for routine classification. A real Firecrawl run captured
official NYC guidance into owned Convex storage, produced five cited proposals,
opened the captured text in the safe in-app source reader, accepted one through
the owner review gate, updated a second browser in realtime, and answered a
grounded Assistant question (`convex/lib/aiProvider.ts`,
`scripts/smoke-live-research.mjs`).

I also completed the real AgentMail loop. A location can provision its own live
case inbox; the signed webhook preserves an inbound message; OpenRouter proposes
a deadline task; an owner approves the proposal; the user edits a reply; and a
separate owner/admin approval snapshot is required before AgentMail sends it.
The controlled recipient received the reply. The test then permanently deleted
the temporary workspace and verified that RibbonDesk removed its provider inbox
as well (`convex/lib/agentMailClient.ts`, `convex/http.ts`, `convex/inbox.ts`,
`convex/dataControls.ts`, `scripts/smoke-live-agentmail.mjs`).

During that verification I fixed two provider-specific failures instead of
hiding them behind replay data: RFC message IDs wrapped in angle brackets were
being stripped by the message-body HTML sanitizer, and newly created AgentMail
inboxes can briefly be listed before their route is available. Provider IDs now
use a separate opaque normalizer, email addresses are canonicalized, and live
send/deletion checks handle propagation safely. Webhook receipts are retained
only for RibbonDesk-owned events and expire after 30 days. I also updated the
Cloudflare runtime dependency set; the production dependency audit now reports
zero vulnerabilities. Convex development deployment, TypeScript, lint, unit
tests, both live sponsor journeys, and the Sites production build pass locally.

I then promoted the verified Convex source to the existing production
deployment without replacing its separate production auth secret. I configured
production-only OpenRouter, Firecrawl, AgentMail, model, and live-mode values,
created a production AgentMail webhook with its own signing secret, and confirmed
all three provider health checks from production. The complete AgentMail browser
acceptance journey also passes through the existing public Site against
production Convex, including passkey onboarding and provider-side cleanup. The
temporary sender and workspace were removed; no test inbox remains. The public
Site still serves the earlier frontend commit, so publishing this current
spacious landing page, live-only copy, safe source reader, and hardening work is
the remaining release action.

I prepared the repository as a public production project before the final Site
release. I added an MIT license under my name, a Contributor Covenant, security
reporting policy, contribution guide, issue and pull-request templates,
Dependabot configuration, package author/repository metadata, and detailed
architecture and deployment runbooks. I rebuilt the README around RibbonDesk's
actual logo and social artwork, documented the complete owner journey and trust
model, and attributed the project to me as Saurabh Bera, Head of Tech at Quark
Labs and previously CEO of Dot Labs. I also changed the live-research acceptance
script to permanently remove its uniquely named test workspace after a
successful run. Convex validation, strict TypeScript, lint, five domain tests,
passkey registration/sign-in/onboarding with controlled deletion, the production
build, and the production dependency audit all pass; the audit reports zero
known production vulnerabilities. The owner has explicitly approved public
publication of this verified source.

The first version-4 production browser gate caught a deployment-specific defect
before I treated the release as finished: the locally packaged client bundle
contained the development Convex URL, so the production passkey request was
correctly rejected by CORS. I preserved the browser error evidence, added a
cross-platform `build:production` gate that refuses missing, localhost, or
non-HTTPS public URLs, and documented the exact production promotion check. I am
rebuilding and republishing with explicit production Convex and Site origins;
the failed passkey gate is not counted as a successful release.

### 2026-09-01 - working tree

I expanded authentication after reviewing the public entry experience as a real
business user. RibbonDesk now exposes verified email/password registration and
sign-in, one-hour email confirmation, password reset, Google and Apple provider
slots, existing-passkey sign-in, and passkey enrollment from an authenticated
account (`convex/auth.ts`, `app/app/auth-workspace.tsx`). I removed the old
unauthenticated passkey-registration shortcut because it could attempt to attach
a new credential to an account located only by an entered email address;
passkeys can now be added only after another trusted sign-in proves account
ownership.

I created a dedicated AgentMail security inbox through the connected provider
and configured its public inbox identifier separately in development and
production Convex environments. Repeated controlled acceptance runs exposed
two provider realities: brand-new AgentMail recipient routes need propagation,
and sustained sends can return `429`. Verification and reset mail now enters an
indexed, bounded Convex delivery queue before the auth endpoint returns. The
queue retries transient `404`, `408`, `409`, `429`, and server failures with
backoff and deletes the token-bearing record after delivery, terminal failure,
or before its one-hour token expires (`convex/authEmail.ts`). TypeScript, lint,
Convex schema deployment, and domain tests pass. The automated browser journey
has proved verified registration, password sign-in, authenticated passkey
enrollment, passkey sign-in, and actual security-message receipt in separate
runs; the full single-run reset and cleanup gate is still pending after the
current AgentMail rate limit clears. Google and Apple provider slots and secure
server configuration are implemented.

I configured the Google OAuth client credentials supplied by the owner in both
Convex development and production without exposing either value to the client,
repository, or logs. Both deployments now report Google enabled and Apple
disabled. From the public production `/app` route, I verified that the Google
button reaches Google's real account chooser using the exact
`https://steady-sockeye-84.convex.site/api/auth/callback/google` callback and
only the `openid`, `email`, and `profile` scopes, with no browser console errors.
After receiving the owner's action-time approval, I selected the authorized
Google identity, reviewed the first-time consent screen, and completed the live
callback. RibbonDesk returned to the public production `/app` route as an
authenticated user at the real four-step workspace onboarding flow. A full page
reload preserved the authenticated session and returned to the same onboarding
state. I stopped before creating an organization or synthetic business data.
Apple is intentionally deferred because the owner does not currently have the
needed Apple Developer account or device.

I removed OpenRouter application attribution at the owner's request. The shared
OpenRouter provider no longer supplies either `appName` or `appUrl`, which means
the SDK no longer emits `X-OpenRouter-Title` or `HTTP-Referer` on RibbonDesk AI
requests (`convex/lib/aiProvider.ts`). I searched the repository for alternate
OpenRouter attribution headers, ran strict TypeScript, lint, and domain tests,
deployed the change to production Convex, and completed a live provider-health
request successfully through the anonymous request path. Historical OpenRouter
dashboard activity may retain its original attribution, but new backend calls
do not send the RibbonDesk name or Site URL.

I hardened authentication-email throttling after a clean end-to-end run exposed
AgentMail `429` responses during rapid controlled sends. The AgentMail client now
captures the provider's `Retry-After` header, and the durable Convex job schedules
the next attempt no earlier than that provider-directed delay instead of relying
only on a local backoff (`convex/lib/agentMailClient.ts`,
`convex/authEmail.ts`). I also made the browser acceptance test distinguish a
new AgentMail test-address propagation race from real user delivery by proving
the temporary route before registration. All stale controlled jobs and inboxes
were removed. Convex deployment, strict TypeScript, lint, domain tests, and the
production dependency audit pass. The AgentMail send path is currently
provider-degraded—direct and connector sends have alternated between success,
`429`, and timeout—so I am not recording the latest full email/reset journey as
passed even though the application queue and retry behavior are working.

I exported the established RibbonDesk app mark as a dedicated Google OAuth
branding asset (`public/brand/ribbondesk-google-oauth-logo.png`). The PNG is an
exact 120 × 120 square, uses the production ink, coral, and sage brand colors,
and is only 2 KB, satisfying Google's consent-screen recommendation and 1 MB
upload limit without introducing a second logo direction.

I removed Apple from every authentication screen because it is intentionally
outside this release. After the owner reported that a normal browser could
return from Google to the signed-out screen, I traced the cross-domain handoff
and found a browser-timing risk: a slower pre-callback `get-session` response
could outlive the one-time-token exchange and restore stale signed-out state.
RibbonDesk now disables that client session cache and completes the one-time
Google token exchange behind a dedicated “Finishing your Google sign-in” gate
before mounting the authenticated application. The gate also presents a clear,
recoverable error if a temporary token is expired or already used. Strict
TypeScript, lint, unit tests, and the production Sites build pass. I published
the corrected release as Sites version 7, signed out on the public `/app`, and
retested the real Google journey. The live screen contained no Apple control;
Google returned to authenticated workspace onboarding, and the session remained
authenticated after a full reload. I created no organization or sample data.

I made the public landing page session-aware and rebuilt onboarding as a saved,
reversible four-step flow. An authenticated visitor now sees one clear “Open
dashboard” action instead of sign-in/sign-up prompts; `/app` continues directly
to the earliest incomplete setup step or the operating desk. During setup, each
available step is visible and clickable, a Back control returns to the prior
step, and saved organization, business, and location details reopen for editing
without deleting or duplicating records. Organization, business, and location
edits use authenticated, role-checked Convex mutations and immutable activity
events. A jurisdiction-shaping location edit intentionally resets jurisdiction
confirmation before research can proceed. While testing the route, I also found
and removed a server/client mismatch in the Google callback gate that could
surface React's development error overlay. Convex production deployment, strict
TypeScript, lint, five domain tests, the production Sites build, and a local
browser check with no hydration/error overlay all pass for this release.

The production walkthrough caught and corrected a coverage-selection edge case
before I confirmed jurisdiction: an NYC technology office was being offered the
NYC food-service verified pack based on geography alone. Verified-pack selection
now requires both the NYC jurisdiction and a food-service business signal from
the business type or operational triggers. Other NYC businesses correctly enter
dynamic cited research with review-required labeling.

I published the corrected flow as ChatGPT Sites version 9 from commit `3b382c3`
and verified it against production Convex with an authenticated browser session.
The landing page resolved to “Open dashboard” with no sign-in controls or error
overlay; the dashboard routed to the saved location step; Back opened the
prefilled business record; and the stepper returned to location without data
loss. I completed a controlled NYC technology-office profile, confirmed dynamic
coverage, and opened the real command center. One live Firecrawl → OpenRouter →
Convex run produced a cited New York Department of State proposal and kept it in
the human review queue because the business's foreign-LLC status is unanswered.
I also provisioned the location's real AgentMail case inbox and verified its
active webhook-backed empty thread; I did not send an external message or write
the private inbox address to this public log.

I then exercised the post-onboarding owner loop entirely in production. I opened
the captured official-source evidence inside RibbonDesk and deliberately did
not confirm the foreign-LLC proposal because the workspace does not yet contain
the company's formation jurisdiction. Instead, I created a dated blocking task
to establish the New York operating entity, moved it into progress, and watched
the Today queue update through Convex realtime subscriptions. I started the
location's opening lifecycle, which activates its opening-stage monitoring
cadence. A new durable Ribbon Assistant thread answered “What blocks opening?”
from the current workspace: it identified the live task, linked an official New
York entity lookup, and clearly separated unknown requirements from confirmed
records. Global search returned the task by meaning and status, and the live
AgentMail case inbox remained active with no fabricated inbound messages or
outbound sends. This walkthrough used real production records and provider
calls; the controlled business profile remains demonstration data authorized by
the owner, not a claim that a government filing has occurred.

I reorganized the authenticated product from one long scrolling command center
into eight focused URL-backed workspaces: Today, Plan & research, Inbox,
Documents, Operations, Assistant, Team, and Settings. Desktop and mobile
navigation now perform real route changes, preserve browser history and reloads,
highlight the active page, and render only the selected operational surface.
Today retains readiness metrics and the live action queue; each specialist page
gets its own title, context, and working area. I also replaced plain-text AI
message output with safe GitHub-flavored Markdown rendering. Ribbon Assistant
answers now show semantic headings, lists, emphasis, blockquotes, code, and
clearly styled external links while raw HTML remains escaped.

I published this reorganization as ChatGPT Sites version 10 from commit
`67dcc72`. In a signed-in production browser I verified all eight sidebar links,
their distinct URLs and focused work surfaces, browser Back from Plan to Today,
and a direct reload of `/app/assistant`. The previously stored assistant answer
rendered with semantic headings, a list, emphasis, and a clickable New York
Department of State source; the raw Markdown markers were absent. The production
console reported no errors. Strict TypeScript, lint, seven domain tests, the
production Sites build, and the dependency audit also pass.

I changed the release authentication policy after deciding that a public Google
button would create unnecessary consent-screen and domain-verification friction
for judges. The public account surface now offers only verified email/password
and existing passkeys; neither Google nor Apple is rendered on sign-in or
registration. The controlled authentication test now fails if either social
provider reappears. I kept the already-proven Google callback configuration only
as a maintainer regression path, not a public product promise.

I also added a repeatable judge-account provisioner. It creates a real verified
owner account through the production email-confirmation path, prepares an
isolated NYC café workspace, and deliberately does not spend research credits or
send external mail. The provisioner never prints the password. The account
address and password belong only in the submission platform's private judge
instructions; I will not put them in this public log, source, screenshots, or
repository history.

I published the social-login-free account surface as ChatGPT Sites version 11
from commit `c0f7bd1`. The release archive came from the verified production
build, and the Site deployment succeeded at the existing public URL. I then
used the real production registration and AgentMail confirmation path to create
the private judge owner account. I resumed its saved onboarding after correcting
two stale button labels in the provisioner, and completed an isolated
“RibbonDesk Judge Workspace” with a NYC café profile. No password or controlled
inbox address is recorded here.

AgentMail reported that the current plan's three inbox slots are occupied. I
reused the maintainer-controlled security inbox only as the judge account's
verified identity; I did not delete or remap any existing location inbox. As a
result, judges can exercise the complete authenticated workspace, research,
review, task, document, application, operations, Assistant, team, export, and
deletion flows, but provisioning another live case inbox will remain visibly
blocked by the provider quota until the owner frees a slot or upgrades the
AgentMail plan.

I cleared the judge inbox-capacity blocker without touching production data. I
first verified that the generic AgentMail onboarding inbox contained zero
messages and that neither production `inboxBindings` record referenced it. The
only dependency was a message-only inbox-scoped onboarding key from the initial
AgentMail setup; it was not RibbonDesk's organization-level production key. I
revoked that scoped key, deleted the empty inbox, and listed the account again.
AgentMail now reports two occupied slots: the RibbonDesk security sender and the
active Quark Labs location inbox. One of the three plan slots is available for
the private judge workspace to provision its own live case inbox.
