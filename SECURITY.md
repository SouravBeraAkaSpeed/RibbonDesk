# Security policy

RibbonDesk handles business records, documents, regulatory research, and email.
Please report security problems privately and responsibly.

## Supported versions

Security fixes are applied to the latest commit on `main` and the currently
published RibbonDesk Site. Older commits and forks are not supported releases.

## Reporting a vulnerability

Use **Security → Report a vulnerability** in this GitHub repository to open a
private vulnerability report. If that option is unavailable, contact the
maintainer through a private channel listed on the maintainer's GitHub profile.
Do not open a public issue for an unpatched vulnerability and do not include
real customer or provider data in a report.

Please include:

- The affected route, function, or workflow
- Reproduction steps using synthetic data
- Expected and observed behavior
- Potential impact and any suggested mitigation

The maintainer will acknowledge a complete report as soon as practical,
coordinate a fix, and credit the reporter unless anonymity is requested.

## Security boundaries

- Client-supplied identity and organization IDs are never trusted.
- AI, crawled pages, uploaded documents, and email bodies are untrusted input.
- AI suggestions cannot confirm requirements or send external email by
  themselves.
- Provider secrets belong only in runtime environments and must never be
  committed.
- Public demonstrations must use synthetic data and must not expose paid
  integrations.
