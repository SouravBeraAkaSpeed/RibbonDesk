# RibbonDesk full-flow recording and test description

## Scope

This walkthrough tests the complete signed-out journey and the safe public demo at `http://localhost:3000`. It records the redesigned landing story, interactive demo changes, evidence and approval flow, cited plan and sources, workspace search, and passkey entry states.

Source frames were captured at 2560 × 1440 and rendered to a 1920 × 1080 recording for clear evaluation. The temporary responsive viewport was reset immediately after capture. The demo uses synthetic data and does not send email, upload private files, or consume provider credits.

## Recorded user journey

| Time | Surface | What the user sees | What the test verifies | Result |
| --- | --- | --- | --- | --- |
| 00:00 | Landing hero | “Open right. Stay ready.”, opening-readiness preview, live-demo and passkey actions | The first viewport explains the promise without leading with institutional compliance terminology | Pass |
| 00:03 | Problem | Scattered files, email, deadlines, and one resolved desk | The problem and product transition are understandable | Pass |
| 00:06 | How it works | Business profile → cited requirements → live desk | The three-step mental model is visible | Pass |
| 00:08 | Research | Storefront, jurisdiction, official-source tiles, confidence and conflict language | Research is presented as cited and reviewable | Pass |
| 00:11 | Daily desk preview | 68% readiness, next action, inbox, deadline, source monitor | The landing page previews the actual product hierarchy | Pass |
| 00:14 | Connected inbox | Agency message, linked record, assistant proposal, human approval note | AI is visibly advisory, not autonomous | Pass |
| 00:17 | Stay ready | Application, inspection, opening, renewal lifecycle | The product remains useful after opening day | Pass |
| 00:20 | Business coverage | Eight representative business categories | NYC cafés are shown as the first verified pack, not the product limit | Pass |
| 00:22 | Demo invitation | Safe synthetic-workspace explanation | A guest can understand what the demo will and will not do | Pass |
| 00:25 | FAQ | Coverage, filing, AI authority, and ongoing lifecycle questions | Core objections are answered in-page | Pass |
| 00:28 | Expanded FAQ | “Does RibbonDesk submit applications for me?” | Native disclosure interaction works and states “prepared, not filed” behavior | Pass |
| 00:31 | Demo Today | 68% readiness, three blockers, fees, prioritized tasks, proposed inspection | Demo starts with useful operational information | Pass |
| 00:34 | Realtime simulation | Maya completes a task; readiness becomes 70%, blockers become two | Connected state reacts immediately and shows collaborator presence | Pass |
| 00:36 | Task completion | A blocking task is completed and the queue updates | Task status is interactive and affects the workspace | Pass |
| 00:39 | Agency evidence | Verified sender, linked requirement, message body, unsent draft, extracted proposal | Evidence remains attached to the proposed change | Pass |
| 00:42 | Human approval | The proposed inspection is approved; unread and plan state update | No consequential AI proposal applies silently | Pass |
| 00:45 | Plan | 12 confirmed and two proposed items, dependencies, confidence, evidence, unanswered questions | Requirement planning is explainable and source-backed | Pass |
| 00:48 | Sources | Verified official pack, current-source timestamps, monitoring cadence, review-required policy | Source provenance and unsupported-coverage honesty are visible | Pass |
| 00:50 | Search | Workspace query for “permit” | Search control accepts a real product query | Pass, result presentation needs stronger visual treatment |
| 00:53 | Notifications | Notification control enters its active state | Control is reachable | Partial: detailed notification drawer/content is not yet rendered in the public demo |
| 00:56 | Passkey registration | Name/email form and supported device-verification methods | Passwordless account-creation entry is clear | Pass for entry state; final account creation was not triggered during this signed-out recording |
| 00:59 | Passkey sign-in | Returning-user passkey unlock state | Registration and sign-in states switch correctly | Pass |

## Visible content coverage

The recording includes every major landing-page content group: product promise, problem, three-step workflow, official-source research, daily command center, connected inbox, human approval, recurring readiness, supported business types, public demo, FAQ, and passkey entry.

The public demo recording covers the four implemented primary views—Today, Plan, Inbox, and Sources—and the most important state transitions: realtime collaborator update, task completion, agency-email review, proposal approval, readiness/blocker changes, dependency evidence, and source monitoring.

## Gaps found during testing

1. **Secondary public-demo navigation:** Documents, Applications, Inspections, Calendar, and Activity become visually active but currently remain on the Sources content. These destinations should either receive real demo views or be hidden/disabled until implemented.
2. **Notifications:** The control receives active styling, but the public demo does not display a notification panel or list.
3. **Search presentation:** The query is accepted, but the recording does not show a strong result overlay or filtered-results state.
4. **Account creation:** The recording deliberately stops before creating a persistent passkey account. The repository’s existing automated passkey smoke test covers registration, sign-out, sign-in, onboarding, and the authenticated workspace separately.

## Safety assertions observed

- The demo explicitly states that it does not send email, upload files, or consume provider credits.
- The draft agency reply is labeled “not sent.”
- The extracted inspection remains a proposal until an authorized person approves it.
- Plan readiness excludes uncertain and proposed requirements.
- Dynamic research outside verified coverage is labeled for review.
- The product states that application packets are prepared and tracked, not autonomously filed.
