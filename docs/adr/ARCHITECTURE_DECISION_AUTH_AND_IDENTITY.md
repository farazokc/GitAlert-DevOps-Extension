# Architecture Decision: Azure DevOps Auth And Current-User Identity

## Status

Accepted

## Date

2026-05-15

## Context

The extension currently asks the user for an Azure DevOps organization and a Personal Access Token (PAT).

During connection, the implementation attempts to validate the PAT and fetch the current user by calling the Azure DevOps Profile API:

- `https://app.vssps.visualstudio.com/_apis/profile/profiles/me?api-version=7.1`

This caused browser auth prompts during testing.

Azure DevOps documentation indicates:

- Interactive applications are better served by Microsoft Entra OAuth
- PATs can be used with many Azure DevOps REST APIs
- PATs are not supported for organizations/profile APIs

This means the existing implementation mixes a PAT-based UX with a PAT-incompatible validation endpoint.

At the same time, the extension needs a reliable way to determine the current authenticated user so it can classify pull requests into:

- assigned to me
- my PRs pending review
- changes requested

## Decision

We will keep PAT-based authentication as the near-term architecture and remove all dependence on the Profile API from the PAT flow.

We will not treat identity inference from pull request payloads alone as authoritative.

The architecture decision is:

1. Keep the user-facing auth model as `organization + PAT`
2. Validate the PAT only with PAT-compatible Azure DevOps endpoints on `dev.azure.com`
3. Do not call `app.vssps.visualstudio.com/_apis/profile/*` when using a PAT
4. Do not rely on pure identity inference as a guaranteed-correct source of the current user
5. If authoritative current-user identity is required while staying on PAT auth, prefer an explicit user-provided identifier or a PAT-compatible identity lookup that has been validated in practice and documentation
6. Treat a future migration to Microsoft Entra OAuth as a separate architecture change, not as part of the minimal PAT bug fix

## Rationale

### Why not switch immediately to Microsoft Entra OAuth?

Microsoft Entra OAuth is a valid and strong long-term direction. Azure DevOps guidance recommends it for interactive applications.

However, moving this extension from PAT auth to Entra auth is not a header swap. It would require additional application architecture, including:

- app registration
- redirect URI design
- browser/extension auth flow integration
- token acquisition and refresh handling
- cached session state management
- consent and tenant behavior handling

Because the current product is already built around `organization + PAT`, the smallest correct fix is to make the PAT flow fully PAT-compatible rather than mixing PAT auth with Entra-only APIs.

### Why not use Profile API with a PAT?

Azure DevOps documentation states that PATs do not support organizations/profile APIs.

Therefore, a PAT-based connect flow must not depend on:

- `https://app.vssps.visualstudio.com/_apis/profile/profiles/me`

Using that endpoint in the PAT flow creates invalid behavior and can trigger browser auth challenges.

### Why not trust identity inference completely?

Identity inference from pull request payloads cannot be guaranteed to be 100% correct across all tenants and project states.

Reasons include:

- the current user may not appear in the set of active PRs
- reviewer lists may include groups instead of direct users
- Azure DevOps identity fields can vary by tenant and payload
- the same person may appear with different identity shapes over time
- display-name matching is not authoritative

Inference may be useful as a fallback or temporary helper, but it is not an architecture-level guarantee of correctness.

## Consequences

### Positive

- fixes the immediate bug without a full auth redesign
- keeps the current user experience simple
- aligns the PAT flow with PAT-compatible Azure DevOps endpoints
- reduces implementation scope and risk for the near-term fix

### Negative

- PAT remains a less ideal long-term auth model than Entra OAuth
- the extension still needs a trustworthy way to identify the current user
- pure inference cannot be claimed as fully correct

## Accepted Near-Term Direction

For the PAT-based architecture:

1. Use PAT-compatible endpoints for connection validation and repository discovery
2. Remove profile-based validation from popup and background flows
3. Avoid making personal PR classification depend on undocumented or unverified identity assumptions
4. Prefer one of these if correctness is required:
   - explicit user-entered Azure DevOps email/login
   - a PAT-compatible identity endpoint that has been validated for this tenant and documented behavior

## Deferred Alternative

The preferred long-term architecture remains a potential migration to Microsoft Entra OAuth.

That future design would likely provide:

- better alignment with Azure DevOps auth guidance
- stronger identity guarantees
- compatibility with profile-based APIs
- removal of PAT management from the user flow

But that migration is explicitly deferred because it requires broader auth and session architecture work than the current fix.

## Summary

The valid architectural conclusion is:

- Microsoft Entra OAuth is the stronger long-term solution for an interactive extension
- PAT is still acceptable for the current product if the implementation only uses PAT-compatible endpoints
- using PAT plus the Profile API is invalid
- pure identity inference is not sufficiently authoritative to guarantee 100% correct classification
