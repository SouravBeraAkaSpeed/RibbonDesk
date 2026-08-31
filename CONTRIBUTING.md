# Contributing to RibbonDesk

Thank you for helping make RibbonDesk more useful and trustworthy for local
business owners. Contributions are welcome as issues, documentation, tests,
design improvements, verified coverage sources, and code.

By participating, you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Before you start

1. Search existing issues and pull requests to avoid duplicate work.
2. Open an issue for a substantial feature, data-model change, new provider, or
   new jurisdiction pack before implementing it.
3. Never submit secrets, real agency email, customer records, private inbox
   addresses, or copyrighted source dumps.
4. Treat regulatory claims as high-stakes data. A coverage contribution must
   identify the official agency, exact source URL, jurisdiction, captured date,
   and what was verified.

## Local development

Requirements: Node.js 22.13 or newer, npm, a Convex account, and a Chromium
browser for the passkey smoke test.

```powershell
git clone https://github.com/SouravBeraAkaSpeed/RibbonDesk.git
cd RibbonDesk
npm install
npx convex dev
npm run dev
```

Copy `.env.example` to `.env.local` for public client configuration. Provider
secrets belong in the Convex deployment environment, never in a client-side
file or commit. Replay mode is the safe default for development without paid
provider credentials.

## Development standards

- Keep TypeScript strict and avoid `any` at trust boundaries.
- Every Convex function must validate arguments and return values, enforce
  organization ownership server-side, and use indexed pagination for growing
  lists.
- AI output is a proposal. Consequential requirements, deadlines, and outbound
  email must retain a human approval gate.
- Preserve citations and source snapshots; do not present uncertain guidance as
  verified.
- Add or update tests for authorization, workflow transitions, and provider
  failure paths.
- Maintain keyboard access, visible focus states, responsive layouts, and
  reduced-motion behavior.
- Update `hackathon.md` with public-safe, first-person evidence for meaningful
  hackathon work.

## Verification

Run the complete local gate before opening a pull request:

```powershell
npx convex dev --once
npm run typecheck
npm run lint
npm run test:unit
npm run test:passkey
npm run build
npm audit --omit=dev
```

Live provider tests consume external services. Run them only against controlled
test workspaces and credentials:

```powershell
npm run test:live-research
npm run test:live-agentmail
```

## Pull requests

Use a focused branch and a conventional commit such as `feat:`, `fix:`,
`docs:`, `test:`, or `chore:`. A pull request should explain the user outcome,
security and data implications, verification performed, screenshots for UI
changes, and any deployment or migration steps. CI must pass before merge.

By contributing, you agree that your contribution is licensed under the
project's [MIT License](LICENSE).
