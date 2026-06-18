# Prioritized Backlog

Nothing critical remains ungroomed for epic-level planning. The only external prerequisites are store accounts and credentials for later distribution automation, but they do not block backlog prioritization.

## Prioritized Backlog

| Priority | Epic                                  | Why Now                                                                                                                                               | Depends On                                         | Suggested First Deliverable                                                                                                                                                |
| -------- | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1        | Unit Testing Foundation               | Reduces regression risk for all upcoming feature work and compensates for weak manual and E2E coverage                                                | None                                               | Real `npm test` safety net covering `azure.mjs` and `popup/utils.js`                                                                                                       |
| 2        | Review State And Discussion Awareness | Fixes a core dashboard accuracy gap by distinguishing reviewed vs unreviewed PRs and adds actionable discussion follow-up without overloading polling | Unit testing recommended                           | Differentiate `awaiting my review` vs `reviewed by me`, add `Refresh pull request data` tooltip, and add 5-minute unresolved discussion enrichment for actionable PRs only |
| 3        | Urgent PR Support                     | High user-visible value and already has partial scaffolding in storage, alarms, and UI                                                                | Unit testing recommended                           | Real urgent detection from Azure DevOps labels and PR title matching                                                                                                       |
| 4        | Reminder Controls                     | Strong product value, but more rules and state interactions than urgent support                                                                       | Unit testing recommended                           | Admin reminder config fetch plus effective schedule merge                                                                                                                  |
| 5        | Distribution Packaging                | Important for release readiness, but less tied to day-to-day runtime behavior                                                                         | None for packaging; store accounts help validation | GitHub release `.zip` artifact suitable for Chrome Web Store and Edge Add-ons                                                                                              |
| 6        | Publishing Automation                 | Valuable operationally, but depends on working packaging and external store credentials and policies                                                  | Distribution packaging, store accounts, secrets    | CI-driven store submission workflow design                                                                                                                                 |

## Recommended Execution Order

| Order | Workstream                            | Outcome                                                                                 |
| ----- | ------------------------------------- | --------------------------------------------------------------------------------------- |
| 1     | Unit test foundation phase 1          | Stable tests for pure helpers and utilities                                             |
| 2     | Unit test foundation phase 2          | Tests for `api.js` and `alarms.js` decision logic                                       |
| 3     | Review state and discussion awareness | Reviewer vote awareness, reviewed-state UI, and slower unresolved-discussion enrichment |
| 4     | Urgent PR support                     | Urgent bucket, matching rules, assigned-to-me notifications                             |
| 5     | Reminder controls                     | Admin and personal reminder layering plus suppression modes shipped                     |
| 6     | Distribution packaging                | Release-ready store submission artifact                                                 |
| 7     | Publishing automation                 | Reduced release overhead                                                                |

## Epic Readiness

| Epic                                  | Groomed Status     | Notes                                                                              |
| ------------------------------------- | ------------------ | ---------------------------------------------------------------------------------- |
| Unit Testing Foundation               | Ready              | Node built-in runner confirmed                                                     |
| Review State And Discussion Awareness | Ready              | Poll cadence, scope limits, fair-coverage rotation, and refresh behavior confirmed |
| Urgent PR Support                     | Ready              | Matching rules and notification scope confirmed                                    |
| Reminder Controls                     | Ready              | GitHub Pages, mute and focus mode, final reminder behavior confirmed               |
| Distribution Packaging                | Ready              | Store-first model confirmed                                                        |
| Publishing Automation                 | Partially deferred | Ready to plan, but implementation depends on external credentials and accounts     |

## Suggested Sprint Breakdown

| Sprint   | Focus                                 | Success Criteria                                                                      |
| -------- | ------------------------------------- | ------------------------------------------------------------------------------------- |
| Sprint 1 | Unit Testing Foundation               | `npm test` trusted, core helper coverage in place                                     |
| Sprint 2 | Review State And Discussion Awareness | Reviewed-vs-unreviewed PR distinction shipped, unresolved discussions surfaced safely |
| Sprint 3 | Urgent PR Support                     | Urgent detection and UI grouping shipped safely                                       |
| Sprint 4 | Reminder Controls                     | Admin and personal reminder layering plus suppression modes shipped                   |
| Sprint 5 | Distribution Packaging                | Release artifact workflow working and documented                                      |
| Sprint 6 | Publishing Automation                 | Store submission automation scoped or implemented                                     |
