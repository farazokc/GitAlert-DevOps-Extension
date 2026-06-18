# Groomed Feature Document

## Overview

This document restates the requested features for the Azure DevOps extension in a groomed format, using the clarified product decisions from this discussion.

## Product Context

The extension is a Manifest V3 browser extension for Azure DevOps pull request tracking, notifications, and reminders.

## Goals

1. Distribute the extension through supported browser channels without relying on `Load unpacked`
2. Reintroduce urgent PR support using Azure DevOps labels and PR title matching
3. Add admin-controlled reminder policy alongside personal reminders, with clear suppression modes for focused work
4. Introduce automated unit testing to protect core logic in the absence of strong manual and E2E coverage
5. Distinguish reviewed PRs from unreviewed PRs and surface unresolved discussion follow-up without overloading Azure DevOps polling

## Confirmed Decisions

- Distribution will use a **store-first model**
- Release artifacts will be generated first; publishing automation is future scope
- Urgency is determined by:
  - Azure DevOps PR labels
  - PR title matching
- Title matching will use **simple case-insensitive substring matching**
- Urgent reviewer notifications apply **only to PRs assigned to me**
- Admin reminders apply equally to all users
- Notification suppression should include both:
  - `Mute all notifications`
  - `Focus mode`
- In `Focus mode`, the only notification allowed is the **last effective reminder time of the day**
- Admin config should stay **GitHub-only** if practical
- GitHub Pages is preferred over Gist for remote reminder config
- Unit testing will use the **Node built-in test runner only** for now
- Manual refresh only refreshes core pull request data
- The refresh button hover label should read `Refresh pull request data`
- Review-state awareness is determined from the current user's Azure DevOps reviewer vote
- Unresolved discussion state should be fetched on a slower cadence than core PR polling
- Unresolved discussion enrichment should run every 5 minutes
- Unresolved discussion enrichment should apply only to:
  - `assignedToMe`
  - `myPRsPending`
  - `changesRequested`
- If relevant PRs exceed the enrichment cap, coverage should rotate fairly across cycles
- `Deep refresh` is future scope and not part of the initial implementation

## Open Questions

1. None required to groom the current scope further
2. Store accounts and publication credentials still need to exist before automation can be implemented
3. Final UI naming can still be refined during implementation

---

# Epic 1: Distribution

## Feature Name

Store-first extension distribution with release packaging now and publishing automation later

## Problem Statement

The extension should be installable by end users through supported browser distribution channels, without requiring `Load unpacked` or unsupported `.crx` side-loading flows on Windows/macOS.

## Goal

Ship the extension through official browser stores while using GitHub releases to generate clean submission-ready packages. Add store publishing automation in a later phase.

## Users

- Maintainers who prepare releases
- End users who install the extension from supported stores

## Primary Outcome

A maintainer can create a release artifact once and use it to submit the extension to the Chrome Web Store and Microsoft Edge Add-ons.

## Scope

### In Scope

- Create store-ready `.zip` release artifact(s)
- Attach artifacts to GitHub releases
- Document manual submission flow for official stores
- Keep versioning consistent across source, release, and store package
- Prepare for future publishing automation

### Out of Scope

- `.crx` as the main end-user distribution mechanism
- Drag-and-drop/manual `.crx` install as a supported user path
- Enterprise-managed deployment
- Fully automated publishing in the initial phase

## Requirements

1. A GitHub release must generate a valid `.zip` package
2. The package must contain only runtime-required files
3. The package must be suitable for manual upload to Chrome Web Store
4. The package must be suitable for manual upload to Edge Add-ons
5. Release documentation must describe how maintainers use the package
6. Version numbers must remain consistent and easy to validate

## Acceptance Criteria

1. Creating a release produces a valid `.zip` package artifact
2. The artifact can be uploaded to Chrome Web Store without package restructuring
3. The artifact can be uploaded to Microsoft Edge Add-ons without package restructuring
4. The package excludes repo-only files and development-only materials
5. The release process documents which artifact is intended for store submission
6. `manifest.json` version and release version are aligned by rule

## Dependencies

- GitHub Actions
- Chrome Web Store developer account
- Microsoft Edge Partner Center account
- Store listing assets and metadata
- Privacy policy and disclosure requirements for stores

## Risks

- Store review delays
- Store policy rejection due to permissions or privacy disclosures
- Manual submission overhead until automation exists
- Packaging drift if release contents are not validated

## Suggested Stories

1. Define package contents and exclusions
2. Add GitHub release packaging workflow
3. Add package validation checklist
4. Document Chrome Web Store manual submission steps
5. Document Edge Add-ons manual submission steps
6. Prepare store metadata and privacy disclosures
7. Design Chrome Web Store automation approach
8. Design Edge Add-ons automation approach

## Future Automation Phase

### Goal

Reduce release effort by automating store submission and, where possible, publishing.

### Future Scope

- Upload package to Chrome Web Store programmatically
- Upload package to Edge Add-ons programmatically
- Surface submission/publishing errors in CI
- Support staged publication where store review still applies

---

# Epic 2: Review State And Discussion Awareness

## Feature Name

Reviewer-state awareness and unresolved-discussion visibility

## Problem Statement

The extension currently treats all assigned review requests similarly when the current user is a reviewer, even if the user has already voted on some PRs and not on others. It also does not surface whether a PR still has unresolved discussions that may require follow-up. This makes the dashboard less accurate and forces users to open PRs manually to determine what still needs attention.

## Goal

Differentiate `awaiting my review` from `reviewed by me`, and surface unresolved discussion state for actionable PRs using a slower, rate-conscious enrichment cycle.

## Users

- Reviewers who need to see which assigned PRs still need their review
- Authors who need visibility into unresolved discussions on their own PRs
- Senior reviewers handling many active PRs at once

## Primary Outcome

A user can tell at a glance whether a PR still needs their vote, whether they already reviewed it, and whether unresolved discussions still exist.

## Scope

### In Scope

- Derive current-user review state from Azure DevOps reviewer vote
- Distinguish unreviewed vs reviewed PRs in the popup UI
- Keep manual refresh limited to core PR data
- Update refresh tooltip text to `Refresh pull request data`
- Fetch unresolved discussion state on a separate 5-minute cadence
- Restrict discussion enrichment to:
  - `assignedToMe`
  - `myPRsPending`
  - `changesRequested`
- Dedupe PRs before discussion enrichment
- Cap per-cycle discussion enrichment
- Rotate discussion enrichment fairly across cycles when relevant PR count exceeds the cap
- Persist only lightweight unresolved-discussion aggregates per PR

### Out of Scope

- Full thread or comment rendering in the popup
- Manual deep refresh in v1
- Using unresolved discussions to increase the browser badge count
- Reclassifying a reviewed PR back into `awaiting my review` purely because unresolved discussions exist

## Requirements

1. The extension must identify the current user's review state from reviewer vote data already present on the PR
2. A PR assigned to the current user with vote `0` must be distinguishable from a PR where the current user has already voted
3. Manual refresh must refresh only core PR data
4. The refresh button hover label must read `Refresh pull request data`
5. Unresolved discussion enrichment must run separately from core PR polling
6. Unresolved discussion enrichment must run every 5 minutes
7. Unresolved discussion enrichment must only target PRs in `assignedToMe`, `myPRsPending`, and `changesRequested`
8. If relevant PRs exceed the per-cycle cap, different PRs must be enriched across successive cycles using fair rotation
9. The browser badge count must continue to represent PRs awaiting the current user's review, not unresolved discussions
10. If discussion enrichment fails or is throttled, core PR polling must continue to work and previously cached discussion state may remain in place

## Review State Rules

- `awaiting my review`: current user is a reviewer and vote is `0`
- `reviewed by me`: current user is a reviewer and vote is non-zero
- More detailed vote states may be normalized internally, such as:
  - `approved`
  - `approved_with_suggestions`
  - `waiting_for_author`
  - `rejected`

## Discussion State Rules

- Unresolved discussion state is derived from Azure DevOps PR thread status
- Discussion state is a parallel signal, not a replacement for review state
- A PR may be:
  - `Needs review`
  - `Reviewed`
  - `Needs review` with open discussions
  - `Reviewed` with open discussions

## Acceptance Criteria

1. A PR assigned to the current user with vote `0` is shown as needing review
2. A PR assigned to the current user with non-zero vote is visually distinct from an unreviewed PR
3. The refresh button tooltip reads `Refresh pull request data`
4. Manual refresh does not trigger unresolved-discussion thread enrichment
5. Unresolved discussion state appears only after the separate discussion enrichment cycle runs
6. Discussion enrichment only targets PRs from `assignedToMe`, `myPRsPending`, and `changesRequested`
7. When relevant PR count exceeds the enrichment cap, successive cycles enrich different PRs rather than always the same first subset
8. Browser badge count continues to reflect only PRs awaiting the current user's review
9. Thread-fetch failures or rate limiting do not break normal PR polling

## Dependencies

- Azure DevOps PR list API
- Azure DevOps PR reviewers data
- Azure DevOps PR threads API
- Background alarm scheduling
- Popup dashboard rendering
- Local extension storage for enrichment cursor and cached discussion state

## Risks

- Per-PR thread fetches can increase polling cost if many actionable PRs exist
- Discussion state may be slightly stale compared with core PR data because it is intentionally slower
- Incorrect mapping of thread status could misreport unresolved discussions
- Heavy reviewer workloads may require tuning the enrichment cap later

## Suggested Stories

1. Normalize current-user review state from reviewer vote
2. Update badge counting to reflect only PRs awaiting review
3. Add reviewed-state indicators to PR rows
4. Change refresh tooltip to `Refresh pull request data`
5. Add 5-minute discussion enrichment alarm
6. Fetch and aggregate unresolved discussion counts for relevant PRs only
7. Add capped fair-rotation enrichment cursor
8. Render unresolved discussion badges/counts in the popup
9. Handle throttling and thread-fetch failures safely
10. Add `Deep refresh` to future backlog for later grooming

## Recommended Non-Functional Checks

- Validate acceptable API usage when many actionable PRs exist
- Confirm thread enrichment is skipped when no relevant PRs exist
- Confirm rotation covers different PRs across cycles above the cap
- Confirm cached unresolved-discussion state remains stable during transient thread-fetch failures

---

# Epic 3: Urgent PR Support

## Feature Name

Urgent PR detection, grouping, and notification support

## Problem Statement

Urgent PR handling is currently deferred in the extension. Users can configure urgent tags in the UI, but the background logic treats all PRs as non-urgent.

## Goal

Detect urgent PRs using Azure DevOps labels and PR title matching, display them in a dedicated urgent bucket, and notify reviewers when appropriate.

## Users

- Reviewers who need to prioritize urgent PRs
- Maintainers who want consistent urgency behavior across teams

## Primary Outcome

Urgent PRs become visible, actionable, and optionally interruptive when they are assigned to the current user.

## Scope

### In Scope

- Retrieve Azure DevOps PR labels
- Match urgency by label names
- Match urgency by PR title substring
- Store and use configured urgent keywords
- Add urgent dashboard grouping
- Re-enable urgent reminder/notification behavior
- Only notify for urgent PRs assigned to me

### Out of Scope

- Regex-based title matching
- PR description/body keyword matching
- Admin-managed urgent rules in v1
- Repo-scoped or user-scoped urgent rule sets

## Requirements

1. The extension must fetch labels for active PRs
2. A PR must be urgent if:
   - any label matches configured urgent keywords, or
   - the title contains a configured urgent keyword, case-insensitively
3. Urgent matching must be case-insensitive
4. Urgent PRs must appear in a separate urgent bucket in the UI
5. Urgent notifications must only apply to PRs assigned to the current verified user
6. Existing non-urgent PR behavior must remain unchanged

## Matching Rules

### Label Matching

- Compare each Azure DevOps PR label name to configured urgent keywords
- Use case-insensitive exact string comparison on label names

### Title Matching

- Compare each configured urgent keyword against the PR title
- Use case-insensitive substring matching
- No regex or tokenization in v1

### Final Urgency Rule

A PR is urgent if either label match or title match returns true.

## Acceptance Criteria

1. A PR with a matching Azure DevOps label is marked urgent after polling
2. A PR with a matching title keyword is marked urgent after polling
3. Case differences do not affect matching
4. Urgent PRs are displayed in a dedicated urgent UI section
5. Urgent reminder notifications only fire for urgent PRs assigned to the current user
6. Turning off urgent notifications suppresses those alerts without affecting other PR buckets

## Dependencies

- Azure DevOps PR list API
- Azure DevOps PR labels API
- Background polling pipeline
- Popup dashboard rendering

## Risks

- Label fetching may require one extra request per PR and increase polling cost
- Busy repositories could amplify polling latency
- False positives are possible if common keywords are configured too broadly

## Suggested Stories

1. Add Azure DevOps label fetch support for PRs
2. Normalize label data into the PR object
3. Add urgency matcher for labels and title
4. Extend stored `prData` with urgent bucket or urgent grouping
5. Render urgent section in popup UI
6. Re-enable urgent reminder alarm behavior
7. Remove “urgent deferred” messaging from popup/about copy
8. Verify performance with larger PR counts

## Recommended Non-Functional Checks

- Validate acceptable polling latency with label fetch enabled
- Confirm no duplicate urgent notifications
- Confirm urgent state updates when labels or titles change

---

# Epic 4: Reminder Controls

## Feature Name

Admin and personal reminder layering with mute and focus modes

## Problem Statement

The extension currently supports only local personal reminder times. There is no admin-controlled global reminder policy, and there is no focused notification suppression model beyond existing toggles.

## Goal

Support admin-configured global reminders and personal reminders together, while giving users strong control over interruption through `Mute all notifications` and `Focus mode`.

## Users

- Developers who need personalized reminder schedules
- Teams that want one common reminder policy
- Developers who need uninterrupted focus time

## Primary Outcome

Users receive reminders from a merged effective schedule, unless notification suppression is active.

## Scope

### In Scope

- Global admin reminder config
- Personal reminder config
- GitHub-hosted admin reminder policy
- Effective schedule merge logic
- `Mute all notifications`
- `Focus mode`
- Final daily reminder passthrough in focus mode
- UI separation between admin, personal, and effective reminder behavior

### Out of Scope

- Per-user admin targeting
- Repo/team-specific reminder policy
- Private backend service
- Authenticated remote policy fetch
- Complex scheduling rules like weekdays/timezones per office in v1 unless explicitly needed later

## Admin Config Source

### Preferred Source

**GitHub Pages static JSON**

### Reason

- Low effort
- Easy updates through repo workflow
- Stable project-owned URL
- Sufficient for non-sensitive org-wide reminder config

### Rejected/Not Preferred

- GitHub Gist as the primary config source
- Custom backend
- Private authenticated API for this phase

## Reminder Model

### Admin Reminders

- Same for all users
- Fetched from GitHub-hosted JSON
- Not editable in the extension UI

### Personal Reminders

- Stored locally by the user
- Editable in the extension UI

### Effective Reminders

- Merge admin reminders and personal reminders
- Deduplicate identical times
- Sort ascending by time
- Use this merged set as the effective daily reminder schedule

## Notification Suppression Modes

### Mode 1: Mute All Notifications

- Suppress all extension notifications
- Includes:
  - assignment notifications
  - urgent notifications
  - scheduled reminders
  - admin reminders
  - personal reminders
- No exceptions while enabled

### Mode 2: Focus Mode

- Suppress all extension notifications except one
- The only allowed notification is the final effective reminder of the day
- “Final” means the latest reminder time in the merged effective schedule for that day

## Requirements

1. The extension must fetch admin reminder config from GitHub Pages
2. The extension must cache the last valid admin config locally
3. If remote fetch fails, the last valid config must remain usable
4. Personal reminders must still work if admin config is unavailable
5. Effective reminders must be the merged deduplicated union of admin and personal reminders
6. `Mute all notifications` must suppress all extension notifications
7. `Focus mode` must suppress all extension notifications except the final effective reminder of the day
8. UI must clearly distinguish:
   - admin reminders
   - personal reminders
   - suppression state
   - effective schedule

## Acceptance Criteria

1. Admin reminder config can be fetched successfully from GitHub Pages
2. Invalid remote config fails safely without breaking personal reminders
3. Personal reminders continue to function when remote config is absent
4. Duplicate reminder times are shown only once in the effective schedule
5. `Mute all notifications` blocks every extension notification
6. `Focus mode` allows only the final effective reminder of the day
7. Assignment and urgent notifications are also suppressed during `Focus mode`, except the final daily reminder exception
8. The UI clearly communicates active suppression mode

## Proposed Remote Config Shape

Example conceptual fields:

- `enabled`
- `reminderTimes`
- `version`
- `updatedAt`

Optional future fields:

- `messageTemplate`
- `timezoneMode`
- `weekdays`

## Dependencies

- GitHub Pages static JSON
- Background fetch/caching logic
- Local storage schema updates
- Reminder calculation utilities
- Popup UI updates

## Risks

- Timezone interpretation can become ambiguous if requirements grow
- Fetch failures must not break reminder behavior
- Users may misunderstand the difference between mute and focus modes if UI copy is unclear
- Final daily reminder behavior must be deterministic and testable

## Suggested Stories

1. Define admin reminder config JSON schema
2. Add background fetch and cache logic for admin policy
3. Add local storage keys for admin policy state
4. Merge admin and personal reminders into effective schedule
5. Add `Mute all notifications`
6. Add `Focus mode`
7. Implement final daily reminder passthrough logic
8. Update settings UI to distinguish admin/personal/effective reminders
9. Add failure handling for invalid or unreachable config
10. Add user-facing copy explaining mute vs focus mode

---

# Epic 5: Unit Testing

## Feature Name

Core unit testing foundation for extension reliability

## Problem Statement

The extension currently lacks a reliable automated safety net for most logic. Manual testing is limited, and there is no E2E automation. As the extension grows, changes can silently break polling, identity matching, reminder logic, and notification behavior.

## Goal

Introduce a maintainable unit-testing layer that protects core business logic and critical decision paths, reducing regressions without requiring browser E2E setup.

## Users

- Maintainers changing extension behavior
- Contributors adding or refactoring logic
- Reviewers validating regressions before release

## Primary Outcome

A maintainer can run automated unit tests locally and in CI to verify core extension behavior before merging or releasing changes.

## Product Decisions

- Test runner: **Node built-in test runner only**
- No Jest
- No Vitest
- No browser E2E as part of this feature
- Prefer testing pure logic first, then decision logic with mocks
- Avoid heavy DOM testing in v1

## Scope

### In Scope

- Real unit test suite runnable via `npm test`
- Expanded coverage for pure helpers and core decision logic
- Minimal mocking strategy for `fetch`, time, and `chrome` APIs
- CI execution for tests
- Small refactors only where needed to improve testability

### Out of Scope

- Full popup/browser interaction testing
- Visual testing
- Full integration testing against live Azure DevOps
- End-to-end browser automation
- Coverage thresholds on every file in initial rollout

## Requirements

1. `npm test` must run a real unit test suite
2. Core PR classification logic must be covered
3. Reminder decision logic must be covered
4. Assignment tracking logic must be covered
5. Retry/auth error handling paths must be covered
6. New core logic should be added in testable form
7. CI must run unit tests automatically

## Acceptance Criteria

1. `npm test` passes with a real suite
2. Existing `test/azure.test.mjs` is expanded meaningfully
3. Utility tests exist for popup time helpers
4. Core background decision paths are covered with mocks or extracted helpers
5. CI runs unit tests and linting
6. Critical regressions in these areas are protected:
   - identity matching
   - PR classification
   - assignment tracking
   - reminder triggers
   - retry/auth handling

## Recommended Coverage Areas

### 1. Azure Helpers

File: `src/background/azure.mjs`

Test:

- auth header creation
- repository normalization
- PR URL creation
- identity key normalization
- identity matching
- bootstrap identity
- canonical identity mapping
- PR classification

### 2. Popup Utilities

File: `src/popup/utils.js`

Test:

- `formatTime`
- `getTimeAgo`
- boundary cases for minutes, hours, days

### 3. API Decision Logic

File: `src/background/api.js`

Test:

- retry behavior
- unauthorized short-circuit
- repo normalization from API responses
- assignment state updates
- poll bucket construction
- notification triggering for new assignments only

### 4. Alarm Logic

File: `src/background/alarms.js`

Test:

- scheduled reminders blocked for unverified users
- scheduled reminders blocked when notifications disabled
- scheduled reminders fire only at matching times
- urgent reminders only fire for urgent assigned PRs
- urgent reminder re-notify interval
- alarm dispatch by alarm name

### 5. Future Suppression Logic

Important for upcoming reminder feature work.

Test once implemented:

- mute blocks all notifications
- focus mode allows only final daily reminder
- final daily reminder uses last effective schedule time

## Recommended Rollout

### Phase 1

- Make `npm test` the authoritative suite
- Expand `test/azure.test.mjs`
- Add tests for `src/popup/utils.js`

### Phase 2

- Add shared mocks for `chrome`, `fetch`, and time
- Add tests for `api.js` decision helpers
- Add tests for `alarms.js`

### Phase 3

- Extract pure helpers from side-effect-heavy modules as needed
- Add tests for reminder merge, urgency matching, suppression rules

### Phase 4

- Add CI enforcement
- Document testing conventions for contributors

## Dependencies

- Node built-in test runner
- Small mocking utilities for globals
- CI workflow support
- Testability refactors where needed

## Risks

- Browser-global coupling makes some modules hard to test directly
- Over-mocking can hide real integration issues
- DOM-heavy popup logic will stay under-tested unless refactored
- Repo docs currently describe `npm test` inaccurately and will need cleanup later

## Suggested Stories

1. Standardize `npm test` as the real unit test entrypoint
2. Expand `test/azure.test.mjs`
3. Add tests for `src/popup/utils.js`
4. Add shared test mocks/utilities
5. Extract or expose API decision helpers for testing
6. Add tests for assignment tracking and polling logic
7. Add tests for scheduled and urgent reminder behavior
8. Add CI job for tests and lint
9. Document unit test conventions

## Definition Of Done

1. `npm test` runs a stable unit suite
2. Core logic has meaningful regression coverage
3. CI runs tests automatically
4. New core logic is added in testable form
5. Testing approach is documented for future contributors

---

# Cross-Epic Considerations

## Technical Considerations

1. Background polling cost may rise when urgent label fetches are enabled
2. Notification suppression must be centralized to avoid inconsistent behavior
3. Release packaging and store metadata should be prepared before store submission work begins
4. Remote config fetches should avoid introducing fragile startup behavior
5. Upcoming feature work should prefer pure helpers and dependency seams so it remains unit-testable
6. Slower unresolved-discussion enrichment should remain separate from core PR polling to control API cost

## Product Considerations

1. Store-first distribution is the only reliable non-enterprise install path for normal users
2. GitHub Pages config is suitable because admin reminders are global and non-sensitive
3. Focus mode is distinct from mute and should be presented that way in UI copy
4. Unit testing is an enabling feature that reduces release risk across all other epics
5. Review-state accuracy is a core dashboard UX concern and should not be deferred behind secondary notification enhancements

## Known Adjacent Risks In Current Codebase

1. Assignment tracking behavior should be rechecked to ensure re-assigned PRs can notify again
2. Notification click handling may need cleanup if notification volume increases
3. Large PR volumes may make per-PR label requests more expensive than the current polling flow
4. Browser-global coupling currently limits direct unit testing of some modules
5. PR-thread enrichment needs cap and rotation safeguards to avoid avoidable throttling under heavy reviewer workloads

---

# Prioritization Recommendation

## Recommended Delivery Order

1. Unit testing foundation
2. Review state and discussion awareness
3. Urgent PR support
4. Reminder controls
5. Distribution packaging
6. Publishing automation

## Why

- Unit testing is an enabling safety net for all upcoming feature work
- Review-state awareness fixes a core dashboard accuracy gap with lower API cost than broader enrichment features
- Urgent PR support has existing placeholders and is the next most visible capability after review-state improvements
- Reminder controls build naturally on the current reminder architecture
- Distribution packaging is important but less coupled to daily runtime behavior
- Publishing automation depends on store accounts, credentials, and release process maturity

---

# Definition Of Groomed

These features are considered groomed for implementation planning because:

1. User outcomes are defined
2. In-scope and out-of-scope boundaries are clear
3. Acceptance criteria are explicit
4. Risks and dependencies are identified
5. Product decisions needed for current scope are settled
