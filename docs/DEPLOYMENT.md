# Deployment guide

RibbonDesk uses separate Convex development and production deployments and a
public ChatGPT Site. Production promotion is intentionally ordered so the user
interface never points at a missing backend capability.

## 1. Verify the source

From a clean checkout:

```powershell
npm ci
npx convex dev --once
npm run typecheck
npm run lint
npm run test:unit
npm run test:auth
npm audit --omit=dev
```

Set the three public production URLs explicitly, then use the fail-fast release
build instead of packaging a development build:

```powershell
$env:NEXT_PUBLIC_CONVEX_URL='https://<production-deployment>.convex.cloud'
$env:NEXT_PUBLIC_CONVEX_SITE_URL='https://<production-deployment>.convex.site'
$env:NEXT_PUBLIC_SITE_URL='https://<site-slug>.<account>.chatgpt.site'
npm run build:production
```

The release build rejects missing, localhost, or non-HTTPS public values and
uses `NEXT_PUBLIC_SITE_URL` for canonical metadata. After building, inspect the
client bundle to confirm it contains the production Convex host and does not
contain the development host.

Run live-provider checks only with controlled credentials and quotas. Both
scripts create uniquely named resources and delete them after verification.

## 2. Configure production secrets

Set provider values with the Convex CLI or dashboard. Never copy them into a
committed file, shell transcript, issue, or build log.

- `BETTER_AUTH_SECRET`
- `OPENAI_API_KEY`
- `EXA_API_KEY`
- `FIRECRAWL_API_KEY`
- `AGENTMAIL_API_KEY`
- `AGENTMAIL_WEBHOOK_SECRET`
- `AUTH_EMAIL_INBOX_ID`
- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` only when maintainers are
  running private OAuth tests; no social provider is rendered publicly
- `RIBBONDESK_PROVIDER_MODE=live`
- `SITE_URL`

Use separate secrets for development and production. Configure AgentMail's
production webhook to the production Convex HTTP route and verify the signature
secret before enabling live mail.

## 3. Promote Convex

Deploy the exact verified commit to production. Confirm schema/index completion,
scheduled jobs, auth origin, component health, and provider health before
publishing the frontend.

## 4. Publish the Site

The Sites project identity lives in `.openai/hosting.json`. Push the same clean
commit to the Sites source repository, package the verified `dist/` output, save
a new Site version linked to that commit, and deploy it publicly only after
explicit owner confirmation.

Do not redeploy a stale local build. If source changes after the build, rerun the
gate and create a new version.

## 5. Production acceptance

Verify in a signed-out browser:

- Landing, privacy, terms, and disclaimer routes
- Responsive layout and social metadata
- Verified email registration, password sign-in/reset, authenticated passkey
  enrollment/sign-in, and absence of Google/Apple controls
- Business/location onboarding and explicit jurisdiction confirmation
- One complete Exa → Firecrawl → Terra legal/tax → Luna journey run
- Must-do versus Smart-to-consider evidence classification
- Current-step, roadmap, proof upload, portal preflight, and direct-window fallback
- Grounded specialist answer using the current step and saved citations
- Explicit screen-share preview and banking capture refusal
- Step completion reflected in a second browser session
- One controlled AgentMail inbound event, approved proposal, approved reply, and delivery state
- Export and bounded workspace deletion, including provider cleanup

Review deployment logs for worker errors and confirm that no controlled test
resource remains.

## Rollback

If a frontend regression appears, redeploy the last known-good Sites version.
If a backend regression appears, stop provider-triggering actions, preserve the
visible job state, and deploy a forward fix. Do not destructively reset Convex
data or force-push Git history.
