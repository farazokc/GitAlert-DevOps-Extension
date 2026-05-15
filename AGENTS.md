# AGENTS

## Verify First

- There is no real test suite yet. `npm test` is a placeholder that always exits with an error.
- The only automated pre-commit check is `.husky/pre-commit`, which runs `npx lint-staged` on staged files.
- `lint-staged` behavior lives in `package.json`: `*.{js,mjs}` runs `eslint --fix` then `prettier --write`; `*.{html,css,json,md}` runs `prettier --write`.
- Before finishing JS changes, run `npx eslint .`. Before finishing formatting-sensitive changes, run `npx prettier --check .` or the narrower file set you touched.

## Repo Shape

- This is a plain Manifest V3 Chrome extension, not a bundled app. Source files are loaded directly by Chrome; there is no build step.
- `manifest.json` is the runtime source of truth. The popup entrypoint is `src/popup/popup.html`; the background service worker entrypoint is `src/background/background.js` with `"type": "module"`.
- `src/popup/` is the popup UI layer. `popup.js` wires DOM events, `ui.js` renders HTML, and `storage.js` is a thin wrapper over `chrome.storage.local`.
- `src/background/` owns polling, alarms, GitHub API calls, notifications, and persisted extension state.

## Runtime Gotchas

- Popup-only edits can usually be checked by closing and reopening the extension popup.
- Background edits require reloading the extension in `chrome://extensions` so the service worker restarts.
- The extension polls GitHub every 2 minutes via `pollPRs` and also maintains 1-minute reminder alarms plus 5-minute urgent PR reminder alarms. Changes around alarms or notifications should be verified in the reloaded extension, not just by reading code.
- Auth/session state is stored in `chrome.storage.local`; invalid GitHub tokens are cleared by the background code.

## API And State Notes

- GitHub REST calls are used for `/user` and `/user/repos`; PR data comes from GraphQL in `src/background/api.js`.
- Repo selections are stored as `owner/name` strings in local storage and split later by background polling logic. Preserve that format.
- Urgent PR matching is case-insensitive against `urgentTags` from storage.

## Style Constraints From Current Code

- The package is CommonJS in `package.json`, but the extension source uses ESM files directly in Chrome. Follow the existing per-file module style instead of trying to normalize the whole repo.
- Keep the current modular split between popup UI/rendering helpers and background service-worker logic; avoid introducing a build tool or framework unless explicitly requested.
