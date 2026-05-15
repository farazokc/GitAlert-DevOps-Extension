# Azure DevOps Migration Plan

## Goal

Replace the current GitHub-only integration with Azure DevOps support for a single organization, preserving core feature parity for:

- authentication
- PR polling across the target project
- assigned-to-me PRs
- my PRs pending review
- changes requested
- reminders

Deferred for now:

- urgent-tag support

## Scope Update

The target usage is `VL-Core` under `https://spursolutions.visualstudio.com/VL-Core`, with PRs created across many repositories in that project.

Because of that, the implementation should use **project-scoped PR polling**, not repository-scoped PR polling.

## Guiding Approach

1. Keep the existing extension structure.
   `src/popup/` remains the UI layer.
   `src/background/` remains responsible for polling, API access, alarms, notifications, and storage.

2. Replace provider-specific logic, not the whole app.
   Keep the popup/dashboard contract as stable as possible by normalizing Azure DevOps data into the current `prData` shape.

3. Poll PRs at the **project** level.
   For `VL-Core`, this means polling all active PRs in that Azure DevOps project so repositories do not need to be added one-by-one for the main dashboard flow.

## Verified Azure DevOps APIs To Use

1. Current user profile
   `GET https://app.vssps.visualstudio.com/_apis/profile/profiles/me?api-version=7.1`

2. Organization-wide Git repository discovery
   `GET https://dev.azure.com/{organization}/_apis/git/repositories?api-version=7.1`

3. Project-scoped pull requests
   `GET https://dev.azure.com/{organization}/{project}/_apis/git/pullrequests?searchCriteria.status=active&$top={n}&$skip={n}&api-version=7.1`

4. Pull request reviewers
   `GET https://dev.azure.com/{organization}/{project}/_apis/git/repositories/{repositoryId}/pullRequests/{pullRequestId}/reviewers?api-version=7.1`

5. Pull request labels
   `GET https://dev.azure.com/{organization}/{project}/_apis/git/repositories/{repositoryId}/pullRequests/{pullRequestId}/labels?api-version=7.1`

## Implementation Phases

1. **Auth and Session Model**
   Replace GitHub token validation with Azure DevOps `organization + PAT` validation.

   Store:
   - `organization`
   - `token`
   - Azure identity fields needed for matching
   - cached project/repository metadata
   - reminder and notification settings
   - normalized `prData`

   Expected behavior:
   - user enters organization + PAT
   - extension validates access
   - invalid credentials clear session and cached PR state

   PAT auth should use Basic auth with the PAT encoded as `":" + PAT`.

   Example:

   ```js
   const auth = btoa(`:${pat}`);
   const headers = {
     Authorization: `Basic ${auth}`,
     Accept: "application/json",
   };
   ```

   Example request shape:

   ```js
   fetch(
     "https://app.vssps.visualstudio.com/_apis/profile/profiles/me?api-version=7.1",
     {
       headers: {
         Authorization: `Basic ${btoa(`:${pat}`)}`,
         Accept: "application/json",
       },
     },
   );
   ```

2. **Manifest and Network Permissions**
   Replace GitHub host permissions with Azure DevOps hosts actually used for API calls.

   Required API hosts:
   - `https://dev.azure.com/*`
   - `https://app.vssps.visualstudio.com/*`

   The project URL `https://spursolutions.visualstudio.com/VL-Core` does **not** need to be added for REST API host permissions based on the current plan, because the planned API calls use `dev.azure.com` and `app.vssps.visualstudio.com`.

3. **Project and Repository Discovery**
   Repo discovery should use the org-wide repositories endpoint and then group results by project in the UI if needed.

   Clarification on visibility:
   - Azure DevOps `Projects - List` is explicitly permission-filtered to projects the authenticated user can access.
   - Repository discovery should be treated as permission-scoped as well; in practice, the extension should assume the user only receives repositories readable by that PAT/user and verify that behavior against the real tenant during implementation.

   Recommended behavior:
   - fetch repositories for the organization
   - display them grouped or labeled as `Project / Repository`
   - allow searching by both project and repository name
   - optionally bias UX toward `VL-Core`

4. **Selected Scope Storage Format**
   Since the polling model is project-scoped, the tracked scope is really the **project**, but metadata should still be stored as structured objects, not strings.

   Store objects, not composite strings.

   Recommended persisted structures:
   - selected project object:
     - `projectId`
     - `projectName`
   - discovered repository objects:
     - `repositoryId`
     - `repositoryName`
     - `projectId`
     - `projectName`
     - `remoteUrl`

   Even if the dashboard is project-scoped, repository objects should still be stored as structured metadata so PR rows can be labeled correctly and future repo-level filtering remains possible.

5. **Background API Refactor**
   Replace GitHub helpers with Azure DevOps helpers in the background layer.

   Core responsibilities:
   - authenticated fetch
   - current-user fetch
   - repository discovery
   - paginated project PR fetch
   - optional per-PR reviewers fetch if needed
   - normalized PR transformation

   Keep the normalized PR object close to today’s shape:
   - `id`
   - `number`
   - `title`
   - `url`
   - `repo`
   - `author`
   - `authorAvatar`
   - `createdAt`
   - `labels`
   - `reviewers`
   - `isUrgent`

   Temporary rule for this phase:
   - hardcode `isUrgent: false`
   - add clear TODO markers in the implementation indicating urgent-tag support is intentionally deferred

6. **PR Polling and Classification**
   Poll active PRs for the selected project, with pagination from the start.

   Use:
   `GET https://dev.azure.com/{organization}/{project}/_apis/git/pullrequests?...`

   Build the dashboard buckets:
   - Assigned to me
   - My PRs pending review
   - Changes requested
   - Total open PRs

   Recommended classification rules:
   - Assigned to me:
     current user appears in PR reviewers and PR status is `active`
   - My PRs pending review:
     current user matches `createdBy` and at least one reviewer is still unresolved
   - Changes requested:
     current user matches `createdBy` and reviewer vote includes `-5` or `-10`

   Azure DevOps reviewer votes:
   - `10` approved
   - `5` approved with suggestions
   - `0` no vote
   - `-5` waiting for author
   - `-10` rejected

   Product rule for this implementation:
   - treat both `-5` and `-10` as equivalent “Changes Requested”

7. **Urgent Tag Support**
   Defer this from the initial Azure DevOps migration.

   Temporary implementation behavior:
   - all PRs are treated as non-urgent
   - `isUrgent` is always false
   - urgent reminder logic is disabled or bypassed clearly and intentionally
   - implementation should leave obvious follow-up markers for reintroduction

8. **Assignment Notification Tracking**
   Replace GitHub assignment keys with Azure DevOps-safe structured identifiers.

   Suggested assignment key components:
   - organization
   - projectId
   - repositoryId
   - pullRequestId
   - reviewerId

   Also fix the existing logic flaw during migration:
   assignment tracking must be pruned when:
   - reviewer is removed
   - PR closes
   - PR no longer belongs in assigned-to-me

9. **Popup UI Update**
   Update onboarding and settings copy from GitHub to Azure DevOps.

   UI changes needed:
   - auth form asks for organization + PAT
   - help text references Azure DevOps
   - tracked scope is project-oriented
   - PR entries still show repository identity clearly
   - error and status messages reference Azure DevOps

   The dashboard layout can remain mostly unchanged if normalized data is preserved.

10. **Verification and Test Strategy**
    Use a test-driven approach for the migration.

Recommended validation strategy:

- add unit tests before implementation for:
  - auth header construction
  - Azure response normalization
  - reviewer/creator identity matching
  - PR bucket classification
  - assignment tracking transitions
- use those tests as the validation layer during migration

E2E feasibility is currently unknown.
Treat E2E as optional follow-up, not a prerequisite for the first implementation.

Manual verification will still be needed for extension runtime behaviors:

- connect with organization + PAT
- fetch and display project PRs
- verify classification buckets
- verify assignment notifications
- verify reminder alarms
- verify background reload behavior in Chrome

## Major Risks

1. **Identity matching**
   Highest risk.
   The profile API and PR reviewer/creator payloads may not always align on the same identity field in all tenants.
   This must be validated early against the real Azure DevOps org.

2. **Project-scoped volume**
   Polling the whole `VL-Core` project may return many PRs.
   Pagination and normalization need to be implemented carefully so the service worker stays responsive.

3. **Group/team reviewers**
   Your understanding is mostly right for your team’s manual workflow: if reviewers are only added as individuals, this should usually not occur.
   The caveat is that Azure DevOps can still surface container reviewers through branch policies or required-reviewer policies, even if users are not manually adding teams/groups.
   So this is not the expected case for `VL-Core`, but it is still worth treating as a low-level compatibility check, not ignoring completely.

4. **Review state semantics**
   For this implementation, `-5` and `-10` should be treated the same by product rule, even though Azure DevOps distinguishes them internally.

5. **Urgent support deferred**
   This is a conscious gap in the first Azure DevOps migration and should be documented as temporary.

## Recommended Execution Order

1. Add Azure DevOps auth/session model
2. Update manifest host permissions
3. Add unit-test scaffolding and write normalization/classification tests first
4. Implement organization/project/repository metadata discovery
5. Implement project-scoped PR polling with pagination
6. Normalize PR data for the dashboard
7. Reconnect assignment notifications
8. Reconnect reminders
9. Temporarily disable urgent behavior with explicit markers
10. Update popup copy and onboarding text
11. Run lint/format and manual verification

## Definition of Done

1. User can connect with Azure DevOps organization + PAT
2. Extension can discover Azure DevOps repositories and project metadata visible to that user
3. Dashboard shows PRs across the selected project
4. Assigned-to-me, my-pending, and changes-requested buckets work correctly
5. Both `-5` and `-10` count as changes requested
6. Assignment notifications work
7. Scheduled reminders work
8. Urgent support is explicitly deferred, not silently broken
9. No GitHub runtime API calls or GitHub-specific storage assumptions remain

If you want, I can turn this into an implementation checklist broken down by file and module next.
