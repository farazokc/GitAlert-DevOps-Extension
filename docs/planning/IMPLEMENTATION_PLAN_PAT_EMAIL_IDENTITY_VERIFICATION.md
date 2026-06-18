# Implementation Plan: PAT Plus Email Identity Verification

## Goal

Implement a PAT-based Azure DevOps auth flow that:

- removes PAT-incompatible Profile API usage
- uses an explicit email address as the bootstrap identity field
- avoids blind identity guessing
- requires identity confirmation before enabling personal PR tracking features

## Chosen Product Direction

The extension will use:

- `organization + PAT + email address`

The email address is a bootstrap identity hint only. It is not treated as authoritative until the extension finds an exact match in Azure DevOps pull request identity payloads and the user confirms that match.

After confirmation, the extension will promote the matched Azure DevOps identity into canonical stored identity fields and use that identity for classification, badge counts, and notifications.

## User-Facing Design

### New Setup Field

Add a required setup field:

- Label: `Your Azure DevOps email address`
- Help text: `Used to match your reviewer and author identity in pull requests. Usually your work email.`
- Example placeholder: `name@company.com`

### User Input Rules

The user should enter:

- their Azure DevOps email address

The field should not ask for:

- display name
- first and last name
- any free-form identifier other than email

### Verification UX

Flow:

1. User enters organization, PAT, and email address
2. Connect succeeds if PAT validation succeeds against PAT-compatible Azure DevOps endpoints
3. Extension fetches pull requests
4. Extension searches PR identity payloads for an exact match to the entered email
5. If a match is found, show a confirmation prompt such as:
   - `Matched Azure DevOps identity: Jane Doe <jane@company.com>`
   - button: `Confirm identity`
6. Personal tracking features remain disabled until confirmation
7. Once confirmed, the matched Azure DevOps identity becomes canonical

If no match is found:

- continue showing all open PRs
- show a status such as `Identity not verified in current PR set`
- keep personal buckets, badge, and notifications disabled

## UX States

Use an explicit identity verification state.

Recommended values:

- `unverified`
- `matched_unconfirmed`
- `verified`

Optional UI-only state:

- `no_match_found`

### State Semantics

#### `unverified`

- user entered organization, PAT, and email
- PAT validation succeeded
- no identity match found yet
- show all PRs only
- personal buckets disabled or empty
- badge disabled
- assignment notifications disabled

#### `matched_unconfirmed`

- exact email match found in PR payloads
- matched identity candidate discovered
- user has not confirmed it yet
- confirmation prompt shown
- personal buckets still disabled
- badge still disabled
- notifications still disabled

#### `verified`

- user confirmed the matched identity
- canonical Azure DevOps identity fields stored
- personal buckets enabled
- badge enabled
- assignment notifications enabled
- reminders enabled only when based on verified personal data

## Storage Model

### New Fields

Add:

- `userIdentityEmail`
- `identityVerificationState`

### Existing Canonical Identity Fields To Keep

Retain and repurpose as verified identity fields:

- `userId`
- `userDescriptor`
- `username`
- `userEmail`
- `userAvatarUrl`

### Recommended Semantics

- `userIdentityEmail`: raw email entered by the user during setup
- `identityVerificationState`: current verification state
- existing identity fields: blank until verified, then populated from matched Azure DevOps identity

This keeps schema changes minimal while making the state model explicit.

## Matching Rules

Use exact, case-insensitive matching only.

Primary identity fields to compare against PR payload identities:

1. `uniqueName`
2. `emailAddress`
3. `principalName`

Do not use:

- partial matches
- substring matches
- fuzzy matches

Do not use `displayName` as the primary matching key.

`displayName` may be shown in the confirmation UI only.

## Canonical Identity Promotion

During PR polling:

1. Build a bootstrap identity from `userIdentityEmail`
2. Attempt exact matching against PR identities
3. When a match is found, capture the full identity object from the PR payload
4. Set `identityVerificationState` to `matched_unconfirmed`
5. Only after the user confirms should the extension persist canonical identity fields

After confirmation, persist the matched identity into:

- `userId`
- `userDescriptor`
- `username`
- `userEmail`

Then future classification should prefer canonical identity fields over the raw email bootstrap value.

## Feature Gating Rules

Before `verified`:

- show all PRs
- keep personal buckets inactive
- clear badge text
- disable assignment notifications
- disable reminder notifications that rely on personal assignment counts

After `verified`:

- enable personal buckets
- enable badge counts
- enable assignment notifications
- enable reminder behavior tied to personal PR counts

## File-By-File Changes

### `src/popup/popup.html`

Add:

- new required input for `Your Azure DevOps email address`
- helper copy under the field
- status area for identity verification messages
- confirmation UI controls if a match is found

Suggested ids:

- `userIdentityEmailInput`
- `identityStatus`
- `confirmIdentityBtn`

### `src/popup/popup.js`

Update:

- `init()` storage reads to include:
  - `userIdentityEmail`
  - `identityVerificationState`
- `validateAndSaveToken()` to require:
  - organization
  - PAT
  - email address
- remove Profile API validation
- validate only with PAT-compatible repository discovery
- on successful connect, save:
  - `organization`
  - `token`
  - `userIdentityEmail`
  - `identityVerificationState: "unverified"`
- clear canonical identity fields on fresh connect
- add confirmation action handling
- add disconnect cleanup for new fields

If background confirmation messaging is used, add a runtime message such as:

- `CONFIRM_IDENTITY`

### `src/popup/ui.js`

Update:

- `showApp()` to handle verification states cleanly
- add rendering helpers for:
  - identity status
  - matched-unconfirmed prompt
  - unverified personal tracking state
- show user profile only when verified identity exists
- keep all-PR rendering separate from personal bucket rendering
- render explanatory text when identity is not yet verified

### `src/popup/storage.js`

No structural changes required.

### `src/background/background.js`

Update install defaults to include:

- `userIdentityEmail: ""`
- `identityVerificationState: "unverified"`

Add a runtime message handler if needed for identity confirmation.

### `src/background/storage.js`

Update config reads to include:

- `userIdentityEmail`
- `identityVerificationState`

Update `clearAuthSession()` to clear:

- `userIdentityEmail`
- `identityVerificationState`

### `src/background/api.js`

This is the main logic change.

#### Update `validateAzureSession()`

- remove the Profile API call entirely
- validate only with PAT-compatible repository discovery

#### Update `pollPullRequests()`

Implement:

1. bootstrap current user from `userIdentityEmail`
2. exact-match scan over PR reviewer and author identities
3. if a match is found and state is `unverified`, mark as `matched_unconfirmed`
4. if state is `verified`, classify with canonical identity
5. if state is not verified:
   - populate `allPRs`
   - populate `totalOpen`
   - keep personal buckets empty
   - do not send assignment notifications
   - do not set badge from personal counts

Add helpers as needed:

- `buildBootstrapIdentity(email)`
- `findMatchingIdentity(prs, email)`
- `buildCanonicalIdentity(identityRef)`
- `hasVerifiedIdentity(config)`

### `src/background/azure.mjs`

Keep:

- `getIdentityKeys()`
- `matchesCurrentUser()`

Optionally add helpers to:

- normalize a PR identity payload into canonical shape
- compare bootstrap email against identity fields

Do not add primary matching by display name.

### `src/background/alarms.js`

Gate reminder and notification behavior on verified identity state.

Suggested rule:

- no reminder/assignment behavior when `identityVerificationState !== "verified"`

### `test/azure.test.mjs`

Add tests for:

1. exact email match via `uniqueName`
2. exact email match via `emailAddress`
3. exact email match via `principalName`
4. no partial or fuzzy matching
5. unverified state leaves personal buckets empty
6. matched-unconfirmed state still leaves personal buckets empty
7. verified state enables classification
8. canonical identity promotion after confirmation
9. display name is not used as primary match key

## Behavior Rules To Enforce

1. Email is a bootstrap identifier only
2. Matching is exact and case-insensitive only
3. Display name is never the primary match key
4. No personal buckets before identity confirmation
5. No badge before identity confirmation
6. No assignment notifications before identity confirmation
7. All PRs may still be shown before identity confirmation
8. After confirmation, canonical Azure DevOps identity fields are the source of truth

## Edge Cases

### Wrong Email Entered

- may match another person if that identity exists in the visible PR set
- mitigated by explicit confirmation before activation
- not fully prevented in a PAT-only architecture

### No PR Involving The User

- no verification possible yet
- remain `unverified`
- show all PRs only

### Group Reviewers

- exact email matching should naturally avoid group matches
- container reviewers must not become canonical identity

### Email Changes

- if the user edits the email field later, reset verification state
- clear canonical identity fields and require re-verification

## Execution Order

1. Remove Profile API validation
2. Add `userIdentityEmail` and `identityVerificationState` storage model
3. Add email field to setup UI
4. Add exact email matching helpers
5. Add pending match detection during polling
6. Add confirmation UI and action
7. Gate personal buckets, badge, and notifications on verified state
8. Add and update tests
9. Run lint and prettier checks
10. Verify behavior manually in Chrome

## Manual Verification Checklist

1. Connect with valid org, PAT, and correct email
2. Confirm no browser auth popup appears
3. Confirm repository discovery succeeds
4. Confirm all PRs load before verification
5. Confirm a matching identity produces a confirmation prompt
6. Confirm personal buckets stay inactive before confirmation
7. Confirm personal buckets activate after confirmation
8. Confirm badge appears only after confirmation
9. Confirm wrong email does not silently activate personal tracking
10. Confirm disconnect clears email and verification state
11. Confirm background reload preserves verified identity correctly

## Final Direction

The final implementation direction is:

- `PAT + required email + exact match + explicit confirmation + canonical identity promotion`

This is the strongest practical design available without migrating the extension to Microsoft Entra OAuth.
