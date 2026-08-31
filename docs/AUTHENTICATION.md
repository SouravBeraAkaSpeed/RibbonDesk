# Authentication operations

RibbonDesk uses Better Auth on Convex. Email/password, email verification,
password reset, and authenticated passkey enrollment are implemented. Google
and Apple become active only when both credentials for that provider exist in
the Convex deployment environment; secrets never reach the browser.

Current production status: Google is enabled in both Convex development and
production. The public sign-in button, Google account chooser, exact callback
URI, and the minimal `openid`, `email`, and `profile` scopes have been verified.
Apple is intentionally deferred and its sign-in button remains disabled.

## Public production endpoints

- Application origin: `https://ribbondesk.souravberaakagralius.chatgpt.site`
- Auth server origin: `https://steady-sockeye-84.convex.site`
- Google redirect URI: `https://steady-sockeye-84.convex.site/api/auth/callback/google`
- Apple return URL: `https://steady-sockeye-84.convex.site/api/auth/callback/apple`

The callback host is the Convex HTTP deployment, not the ChatGPT Site. This is
required by the Convex + Better Auth cross-domain installation.

## Google OAuth setup

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

If Google keeps the consent screen in testing mode, only listed test users can
sign in. Publish the OAuth app before opening sign-in to hackathon visitors.
Selecting an account and completing the production callback must be tested with
an explicitly authorized test identity before release.

## Apple OAuth setup

Apple web sign-in requires an active Apple Developer membership and cannot be
created through the available Codex connectors.

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

Passkeys are optional. A user first proves account ownership with verified
email, Google, or Apple, then chooses **Add passkey** inside the authenticated
workspace. Unauthenticated passkey enrollment is deliberately disabled.
Existing passkeys remain available on the sign-in screen.

## Release checks

```powershell
npm run test:auth
```

The controlled test uses a temporary AgentMail recipient and virtual WebAuthn
authenticator, verifies real message receipt, exercises password and passkey
sign-in, resets the password, deletes the test workspace, and removes the
temporary inbox. Provider `429` responses are treated as a failed acceptance
gate, not as success.
