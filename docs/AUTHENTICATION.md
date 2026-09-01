# Authentication operations

RibbonDesk uses Better Auth on Convex. The public release supports
email/password, email verification, password reset, authenticated passkey
enrollment, and existing-passkey sign-in. Provider secrets never reach the
browser.

Current production policy: no social-login control is rendered. Google remains
configured only for maintainer-controlled regression testing and Apple is
deferred. A release fails its authentication gate if either provider appears on
the public sign-in or registration screen.

## Public production endpoints

- Application origin: `https://ribbondesk.souravberaakagralius.chatgpt.site`
- Auth server origin: `https://steady-sockeye-84.convex.site`
- Google redirect URI: `https://steady-sockeye-84.convex.site/api/auth/callback/google`

The callback host is the Convex HTTP deployment, not the ChatGPT Site. This is
required by the Convex + Better Auth cross-domain installation.

## Private Google OAuth regression setup

1. Open [Google Cloud credentials](https://console.cloud.google.com/apis/credentials)
   and select or create the RibbonDesk project.
2. Configure the OAuth consent screen with the RibbonDesk name, public homepage,
   privacy URL, terms URL, and support/developer contacts.
3. Create **OAuth client ID → Web application**.
4. Add authorized JavaScript origin
   `https://steady-sockeye-84.convex.site`.
5. Add the exact authorized redirect URI
   `https://steady-sockeye-84.convex.site/api/auth/callback/google`.
6. Copy the client ID and client secret into the ignored local `.env` as
   `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`. A maintainer must then set both
   values separately on development and production Convex deployments.

Keep the consent screen in testing mode and limit it to maintainer accounts.
Do not publish the OAuth app for the hackathon release; Google is not a public
RibbonDesk authentication method.
The production callback uses a one-time cross-domain token. RibbonDesk disables
the client session cache during this handoff and completes the token exchange
before rendering authenticated or unauthenticated content, preventing a slower
pre-callback request from restoring a stale signed-out state.

The cross-domain handoff remains covered as an operator-only regression path,
but the public Site intentionally provides no way to initiate it.

## Deferred Apple OAuth

Apple web sign-in is not part of the current release and no Apple control is
rendered. The following operator notes are retained for a future release; Apple
requires an active Apple Developer membership.

1. Open [Certificates, Identifiers & Profiles](https://developer.apple.com/account/resources/identifiers/list).
2. Enable **Sign in with Apple** on a primary App ID.
3. Create a **Services ID** for RibbonDesk and associate it with that App ID.
4. Configure the web domain `steady-sockeye-84.convex.site` and exact return URL
   `https://steady-sockeye-84.convex.site/api/auth/callback/apple`.
5. Create a Sign in with Apple private key and record the Team ID, Key ID,
   Services ID, and downloaded `.p8` key.
6. Generate the Apple client-secret JWT according to the Better Auth Apple
   guide. Its lifetime must stay below Apple's six-month maximum.
7. Put the Services ID in `APPLE_CLIENT_ID` and the generated JWT in
   `APPLE_CLIENT_SECRET` in the ignored local `.env`; a maintainer must then set
   both on development and production Convex deployments.
8. Schedule secret rotation before the JWT expires.

Never commit the Google secret, Apple JWT, Team private key, or the AgentMail
API key. The `.env.example` file contains names only.

## Email and password

- Minimum password length is 10 characters; Better Auth hashes passwords in its
  isolated Convex component tables.
- Registration creates no usable password session until the email is verified.
- Verification and reset links expire after one hour.
- AgentMail security messages are first persisted to a bounded retry queue.
- Transient provider failures honor AgentMail's `Retry-After` response and retry
  with exponential backoff; token-bearing queue records
  are deleted after delivery, terminal failure, or expiry.
- Password reset revokes the account's other sessions.

## Passkeys

Passkeys are optional. A user first proves account ownership with a verified
email and password, then chooses **Add passkey** inside the authenticated
workspace. Unauthenticated passkey enrollment is deliberately disabled.
Existing passkeys remain available on the sign-in screen.

## Judge account

Judges receive one dedicated owner-level email/password account in the private
submission notes. The account uses an isolated workspace and a controlled
AgentMail inbox so email verification is real. Its email address and password
must never be placed in the README, public Site, issue tracker, commit history,
CI variables, screenshots, or `hackathon.md`.

Provision or replace the account from a trusted maintainer machine:

```powershell
$env:JUDGE_ACCOUNT_PASSWORD='<private value of at least 14 characters>'
$env:JUDGE_BASE_URL='https://ribbondesk.souravberaakagralius.chatgpt.site'
npm run provision:judge
Remove-Item Env:JUDGE_ACCOUNT_PASSWORD
```

When the AgentMail plan has no free inbox slot, set
`JUDGE_ACCOUNT_EMAIL` to a maintainer-controlled inbox before running the
provisioner. If a run was interrupted after account creation, also set
`JUDGE_ACCOUNT_EXISTING=1`; the script signs in and resumes the saved onboarding
step instead of creating duplicate data.

The script creates and verifies a real account, grants ownership by creating a
new organization, and prepares a NYC café workspace without running paid
research or sending external mail. It prints the controlled inbox address but
never prints the password. Supply both values only in the hackathon platform's
private judge instructions. Rotate the password or delete the workspace after
judging.

## Release checks

```powershell
npm run test:auth
```

The controlled test uses a temporary AgentMail recipient and virtual WebAuthn
authenticator, verifies real message receipt, exercises password and passkey
sign-in, asserts that Google and Apple are absent, resets the password, deletes
the test workspace, and removes the temporary inbox. Provider `429` responses
are treated as a failed acceptance gate, not as success.
