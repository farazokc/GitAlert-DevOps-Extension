# Current Issues

## High

### Re-assigned PRs can stop generating notifications permanently

- File: `src/background/api.js`
- Lines: `185-190`
- `knownAssignments` only grows and is never pruned when review requests disappear or PRs close.
- After a PR has notified once, later unassignment and re-assignment will not notify again for the same `owner/repo#number` key.

### Repository discovery stops at the first 100 repos

- File: `src/background/background.js`
- Lines: `40-45`
- The popup fetches `/user/repos?per_page=100&sort=updated` once with no pagination.
- Users with more than 100 accessible repos cannot discover or add the rest.

## Medium-High

### PR polling ignores open PRs beyond the first 50 per repo

- File: `src/background/api.js`
- Lines: `115-146`
- The GraphQL query requests `pullRequests(states: OPEN, first: 50, ...)` with no pagination.
- Busy repos can have assigned, urgent, or changes-requested PRs omitted from the extension state.

## Medium

### Notification click handlers accumulate globally

- File: `src/background/notifications.js`
- Lines: `1-21`
- Each notification with a URL adds a new `chrome.notifications.onClicked` listener.
- Listeners are removed only when that exact notification is clicked, so dismissed or expired notifications leave stale listeners behind.
