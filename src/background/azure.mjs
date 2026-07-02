export function buildBasicAuthHeader(token) {
  return `Basic ${globalThis.btoa(`:${token}`)}`;
}

export function normalizeRepository(repo) {
  return {
    repositoryId: repo.id,
    repositoryName: repo.name,
    projectId: repo.project?.id || "",
    projectName: repo.project?.name || "",
    remoteUrl: repo.remoteUrl || repo.webUrl || "",
  };
}

export function createPullRequestUrl(
  organization,
  projectName,
  repositoryName,
  pullRequestId,
) {
  const org = encodeURIComponent(organization);
  const project = encodeURIComponent(projectName);
  const repo = encodeURIComponent(repositoryName);
  return `https://dev.azure.com/${org}/${project}/_git/${repo}/pullrequest/${pullRequestId}`;
}

function normalizeIdentityValue(value) {
  if (!value) return "";
  return String(value).trim().toLowerCase();
}

export function getIdentityKeys(identity) {
  return [
    identity?.id,
    identity?.descriptor,
    identity?.uniqueName,
    identity?.emailAddress,
    identity?.principalName,
  ]
    .map(normalizeIdentityValue)
    .filter(Boolean);
}

export function matchesCurrentUser(currentUser, identity) {
  const currentKeys = new Set(getIdentityKeys(currentUser));
  return getIdentityKeys(identity).some((key) => currentKeys.has(key));
}

export function hasIdentityMatch(currentUser, identity) {
  return matchesCurrentUser(currentUser, identity);
}

export function createBootstrapIdentity(email) {
  const normalized = normalizeIdentityValue(email);
  return {
    uniqueName: normalized,
    emailAddress: normalized,
    principalName: normalized,
  };
}

export function toCanonicalIdentity(identity) {
  return {
    id: identity?.id || "",
    descriptor: identity?.descriptor || "",
    username:
      identity?.displayName ||
      identity?.uniqueName ||
      identity?.principalName ||
      identity?.emailAddress ||
      "",
    userEmail:
      identity?.emailAddress ||
      identity?.principalName ||
      identity?.uniqueName ||
      "",
    userAvatarUrl: identity?.imageUrl || "",
  };
}

export function findMatchingIdentity(pullRequests, currentUser) {
  for (const pr of pullRequests) {
    if (hasIdentityMatch(currentUser, pr.createdBy)) {
      return pr.createdBy;
    }

    for (const reviewer of pr.reviewers || []) {
      if (hasIdentityMatch(currentUser, reviewer)) {
        return reviewer;
      }
    }
  }

  return null;
}

export function classifyPullRequest(pr, currentUser, organization) {
  const reviewers = pr.reviewers || [];
  const myReviewerEntry = reviewers.find((reviewer) =>
    matchesCurrentUser(currentUser, reviewer),
  );
  const assignedToMe =
    myReviewerEntry !== undefined && (myReviewerEntry.vote ?? 0) === 0;
  const reviewedByMe =
    myReviewerEntry !== undefined && (myReviewerEntry.vote ?? 0) !== 0;
  const authoredByMe = matchesCurrentUser(currentUser, pr.createdBy);
  const otherReviewers = reviewers.filter(
    (reviewer) => !matchesCurrentUser(currentUser, reviewer),
  );
  const changesRequested =
    authoredByMe &&
    otherReviewers.some(
      (reviewer) => reviewer.vote === -5 || reviewer.vote === -10,
    );

  return {
    assignedToMe,
    reviewedByMe,
    myPRsPending: authoredByMe && otherReviewers.length > 0,
    changesRequested,
    prInfo: {
      id: pr.pullRequestId,
      number: pr.pullRequestId,
      title: pr.title,
      url: createPullRequestUrl(
        organization,
        pr.repository.project.name,
        pr.repository.name,
        pr.pullRequestId,
      ),
      repo: pr.repository.name,
      author:
        pr.createdBy?.displayName || pr.createdBy?.uniqueName || "Unknown",
      authorAvatar: pr.createdBy?.imageUrl || "",
      createdAt: pr.creationDate,
      labels: (pr.labels || []).map((label) => ({ name: label.name })),
      reviewers: reviewers.map(
        (reviewer) =>
          reviewer.displayName || reviewer.uniqueName || reviewer.id,
      ),
      isUrgent: false,
      repositoryId: pr.repository.id,
      projectId: pr.repository.project.id,
      myVote:
        myReviewerEntry !== undefined ? (myReviewerEntry.vote ?? 0) : null,
    },
    assignmentKey: `${pr.repository.project.id}/${pr.repository.id}/${pr.pullRequestId}`,
  };
}
