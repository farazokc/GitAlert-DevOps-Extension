# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Lint (run before finishing any JS change)
npx eslint .

# Format check
npx prettier --check .

# Tests (placeholder only — always fails; real test exists at test/azure.test.mjs)
node --test

# Run a single test file
node --test test/azure.test.mjs

# Pre-commit (runs automatically via Husky on staged files)
npx lint-staged
```

There is no build step. Source files are loaded directly by Chrome.

## Loading the Extension

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** → select the repo root

**After popup changes:** close and reopen the popup.
**After background changes:** click **Reload** on the extension card in `chrome://extensions` to restart the service worker.

## Architecture

This is a Manifest V3 Chrome extension targeting **Azure DevOps** (not GitHub despite naming in some files). All API calls hit `dev.azure.com` and `app.vssps.visualstudio.com`.

### Background service worker (`src/background/`)

The service worker is the core of the extension. It owns all state, polling, and notifications. Entry point is `background.js`.

| File               | Responsibility                                                                                                                                                                                                                                        |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `background.js`    | Registers `onInstalled`, `onAlarm`, and `onMessage` listeners; calls `setupAlarms()`                                                                                                                                                                  |
| `api.js`           | `pollPullRequests()` — fetches all active PRs for the project, classifies them, fires notifications for new assignments, updates badge count; `fetchRepositories()` — lists available repos; `withRetry()` — exponential backoff wrapper (3 attempts) |
| `alarms.js`        | Three alarms: `pollPRs` (every 2 min), `checkReminders` (every 1 min for scheduled daily reminders), `urgentPRReminder` (every 5 min for re-notifying urgent PRs)                                                                                     |
| `azure.mjs`        | Pure functions: identity matching, PR classification, URL building, auth header construction. **No side effects, no Chrome APIs** — fully unit-testable                                                                                               |
| `storage.js`       | Thin `getConfig()`/`setConfig()`/`clearAuthSession()` wrappers over `chrome.storage.local`                                                                                                                                                            |
| `notifications.js` | `sendNotification()` wrapper over `chrome.notifications`                                                                                                                                                                                              |

### Popup (`src/popup/`)

The popup is a read/display layer. It does not poll — it sends messages to the background worker and renders the response.

| File         | Responsibility                                                                             |
| ------------ | ------------------------------------------------------------------------------------------ |
| `popup.js`   | DOM wiring, event handlers, message passing to background via `chrome.runtime.sendMessage` |
| `ui.js`      | HTML rendering helpers — builds PR cards, stats dashboard, settings panels                 |
| `storage.js` | Popup-side read/write to `chrome.storage.local` (distinct from background's storage.js)    |
| `utils.js`   | Small shared helpers                                                                       |

### Message protocol (popup → background)

| Message type       | Background action                                           |
| ------------------ | ----------------------------------------------------------- |
| `FETCH_PRS`        | Calls `pollPullRequests()`, returns PR data                 |
| `FETCH_REPOS`      | Calls `fetchRepositories()`, returns repo list              |
| `CONFIRM_IDENTITY` | Sets `identityVerificationState: "verified"`, triggers poll |

### Identity verification flow

On first use, the user enters their Azure DevOps PAT email. The background bootstraps a minimal identity from this email and scans PR reviewer/author fields to find a matching full identity object from the API. State machine in `chrome.storage.local`:

- `unverified` → `matched_unconfirmed` (background found a match, awaiting user confirmation)
- `matched_unconfirmed` → `verified` (user confirmed via `CONFIRM_IDENTITY` message)

PR classification (assigned-to-me, my-PRs-pending, changes-requested) is **only active when `identityVerificationState === "verified"`**. Before verification, the extension shows all PRs but no personalised stats.

### `chrome.storage.local` schema

Key fields set on install (see `background.js`):

```
organization, projectId, projectName, token          — Azure DevOps connection
userId, userDescriptor, username, userEmail           — verified identity
userIdentityEmail, identityVerificationState          — verification state machine
repos, availableRepos                                 — selected/available repo list
reminders                                             — HH:MM strings for daily reminders
urgentTags                                            — ["Important", "Urgent", "Critical"]
notificationsEnabled, urgentNotificationsEnabled      — notification toggles
prData, lastFetch                                     — cached PR data from last poll
knownAssignments                                      — Set of assignmentKeys seen (for new-assignment detection)
lastUrgentNotified                                    — Map of prKey → timestamp
```

`assignmentKey` format: `"{projectId}/{repositoryId}/{pullRequestId}"`

### Module system note

`package.json` declares `"type": "commonjs"` (for Node tooling), but the extension source uses native ESM (`import`/`export`) loaded directly by Chrome. `azure.mjs` uses `.mjs` extension explicitly for Node compatibility in tests. Do not introduce a bundler or normalize the module system.
