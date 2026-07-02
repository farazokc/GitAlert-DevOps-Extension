import test from "node:test";
import assert from "node:assert/strict";

import {
  buildBasicAuthHeader,
  classifyPullRequest,
  createBootstrapIdentity,
  createPullRequestUrl,
  findMatchingIdentity,
  getIdentityKeys,
  matchesCurrentUser,
  normalizeRepository,
  toCanonicalIdentity,
} from "../src/background/azure.mjs";

test("buildBasicAuthHeader encodes PAT as basic auth", () => {
  assert.equal(buildBasicAuthHeader("abc123"), "Basic OmFiYzEyMw==");
});

test("matchesCurrentUser matches by id or uniqueName", () => {
  const currentUser = {
    id: "user-1",
    emailAddress: "dev@example.com",
  };

  assert.equal(matchesCurrentUser(currentUser, { id: "user-1" }), true);
  assert.equal(
    matchesCurrentUser(currentUser, { uniqueName: "dev@example.com" }),
    true,
  );
  assert.equal(matchesCurrentUser(currentUser, { id: "user-2" }), false);
});

test("classifyPullRequest treats -5 as changes requested", () => {
  const currentUser = { id: "author-1", emailAddress: "author@example.com" };
  const pr = {
    pullRequestId: 42,
    title: "Update build",
    creationDate: "2026-05-13T10:00:00Z",
    createdBy: {
      id: "author-1",
      displayName: "Author",
      uniqueName: "author@example.com",
      imageUrl: "",
    },
    repository: {
      id: "repo-1",
      name: "RepoOne",
      project: { id: "proj-1", name: "VL-Core" },
    },
    reviewers: [{ id: "reviewer-1", displayName: "Reviewer", vote: -5 }],
  };

  const result = classifyPullRequest(pr, currentUser, "spursolutions");
  assert.equal(result.myPRsPending, true);
  assert.equal(result.changesRequested, true);
  assert.equal(result.assignedToMe, false);
});

test("classifyPullRequest marks assigned reviewers", () => {
  const currentUser = {
    id: "reviewer-1",
    emailAddress: "reviewer@example.com",
  };
  const pr = {
    pullRequestId: 43,
    title: "Add feature",
    creationDate: "2026-05-13T10:00:00Z",
    createdBy: {
      id: "author-1",
      displayName: "Author",
      uniqueName: "author@example.com",
      imageUrl: "",
    },
    repository: {
      id: "repo-1",
      name: "RepoOne",
      project: { id: "proj-1", name: "VL-Core" },
    },
    reviewers: [
      {
        id: "reviewer-1",
        displayName: "Reviewer",
        uniqueName: "reviewer@example.com",
        vote: 0,
      },
    ],
  };

  const result = classifyPullRequest(pr, currentUser, "spursolutions");
  assert.equal(result.assignedToMe, true);
  assert.equal(result.myPRsPending, false);
  assert.equal(result.reviewedByMe, false);
});

test("createBootstrapIdentity uses exact email as identity keys", () => {
  const identity = createBootstrapIdentity("Dev@Example.com");

  assert.equal(identity.uniqueName, "dev@example.com");
  assert.equal(identity.emailAddress, "dev@example.com");
  assert.equal(identity.principalName, "dev@example.com");
});

test("findMatchingIdentity matches reviewer by email", () => {
  const prs = [
    {
      createdBy: { uniqueName: "author@example.com" },
      reviewers: [
        { uniqueName: "reviewer@example.com", displayName: "Reviewer" },
      ],
    },
  ];

  const match = findMatchingIdentity(
    prs,
    createBootstrapIdentity("reviewer@example.com"),
  );

  assert.equal(match?.uniqueName, "reviewer@example.com");
});

test("findMatchingIdentity does not do partial matches", () => {
  const prs = [
    {
      createdBy: { uniqueName: "author@example.com" },
      reviewers: [{ uniqueName: "reviewer@example.com" }],
    },
  ];

  const match = findMatchingIdentity(
    prs,
    createBootstrapIdentity("reviewer@example.co"),
  );

  assert.equal(match, null);
});

test("toCanonicalIdentity preserves Azure DevOps identity fields", () => {
  const identity = toCanonicalIdentity({
    id: "user-1",
    descriptor: "aad.123",
    displayName: "Jane Doe",
    uniqueName: "jane@example.com",
    imageUrl: "https://avatar",
  });

  assert.deepEqual(identity, {
    id: "user-1",
    descriptor: "aad.123",
    username: "Jane Doe",
    userEmail: "jane@example.com",
    userAvatarUrl: "https://avatar",
  });
});

test("normalizeRepository maps all repo fields correctly", () => {
  const repo = {
    id: "repo-uuid",
    name: "MyRepo",
    project: { id: "proj-uuid", name: "MyProject" },
    remoteUrl: "https://dev.azure.com/org/MyProject/_git/MyRepo",
  };

  assert.deepEqual(normalizeRepository(repo), {
    repositoryId: "repo-uuid",
    repositoryName: "MyRepo",
    projectId: "proj-uuid",
    projectName: "MyProject",
    remoteUrl: "https://dev.azure.com/org/MyProject/_git/MyRepo",
  });
});

test("normalizeRepository falls back to webUrl when remoteUrl is absent", () => {
  const repo = {
    id: "repo-uuid",
    name: "MyRepo",
    webUrl: "https://fallback-url",
  };

  const result = normalizeRepository(repo);

  assert.equal(result.remoteUrl, "https://fallback-url");
  assert.equal(result.projectId, "");
  assert.equal(result.projectName, "");
});

test("normalizeRepository returns empty remoteUrl when both url fields are absent", () => {
  const repo = { id: "repo-uuid", name: "MyRepo" };

  assert.equal(normalizeRepository(repo).remoteUrl, "");
});

test("createPullRequestUrl builds the correct Azure DevOps URL", () => {
  const url = createPullRequestUrl("myorg", "MyProject", "MyRepo", 42);

  assert.equal(
    url,
    "https://dev.azure.com/myorg/MyProject/_git/MyRepo/pullrequest/42",
  );
});

test("createPullRequestUrl percent-encodes spaces in path segments", () => {
  const url = createPullRequestUrl("my org", "My Project", "My Repo", 1);

  assert.equal(
    url,
    "https://dev.azure.com/my%20org/My%20Project/_git/My%20Repo/pullrequest/1",
  );
});

test("getIdentityKeys returns normalized keys for all present identity fields", () => {
  const identity = {
    id: "user-1",
    descriptor: "aad.abc",
    uniqueName: "USER@EXAMPLE.COM",
    emailAddress: "user@example.com",
    principalName: "user@example.com",
  };

  const keys = getIdentityKeys(identity);

  assert.deepEqual(keys, [
    "user-1",
    "aad.abc",
    "user@example.com",
    "user@example.com",
    "user@example.com",
  ]);
});

test("getIdentityKeys filters out null, undefined, and empty values", () => {
  const identity = {
    id: "user-1",
    descriptor: null,
    uniqueName: "",
    emailAddress: undefined,
    principalName: "user@example.com",
  };

  assert.deepEqual(getIdentityKeys(identity), ["user-1", "user@example.com"]);
});

test("getIdentityKeys returns empty array for null identity", () => {
  assert.deepEqual(getIdentityKeys(null), []);
});

// Phase 2 — reviewer vote awareness tests

function makePRWithReviewer(reviewerOverrides) {
  return {
    pullRequestId: 100,
    title: "Vote test PR",
    creationDate: "2026-06-22T10:00:00Z",
    createdBy: {
      id: "author-1",
      displayName: "Author",
      uniqueName: "author@example.com",
      imageUrl: "",
    },
    repository: {
      id: "repo-1",
      name: "RepoOne",
      project: { id: "proj-1", name: "VL-Core" },
    },
    reviewers: [
      Object.assign(
        {
          id: "reviewer-1",
          displayName: "Reviewer",
          uniqueName: "reviewer@example.com",
        },
        reviewerOverrides,
      ),
    ],
  };
}

const voteCurrentUser = {
  id: "reviewer-1",
  emailAddress: "reviewer@example.com",
};

test("classifyPullRequest sets assignedToMe true when reviewer vote is 0", () => {
  const result = classifyPullRequest(
    makePRWithReviewer({ vote: 0 }),
    voteCurrentUser,
    "myorg",
  );
  assert.equal(result.assignedToMe, true);
  assert.equal(result.reviewedByMe, false);
});

test("classifyPullRequest sets reviewedByMe true when vote is 10 (approved)", () => {
  const result = classifyPullRequest(
    makePRWithReviewer({ vote: 10 }),
    voteCurrentUser,
    "myorg",
  );
  assert.equal(result.assignedToMe, false);
  assert.equal(result.reviewedByMe, true);
});

test("classifyPullRequest sets reviewedByMe true when vote is 5 (approved with suggestions)", () => {
  const result = classifyPullRequest(
    makePRWithReviewer({ vote: 5 }),
    voteCurrentUser,
    "myorg",
  );
  assert.equal(result.assignedToMe, false);
  assert.equal(result.reviewedByMe, true);
});

test("classifyPullRequest sets reviewedByMe true when vote is -5 (waiting for author)", () => {
  const result = classifyPullRequest(
    makePRWithReviewer({ vote: -5 }),
    voteCurrentUser,
    "myorg",
  );
  assert.equal(result.assignedToMe, false);
  assert.equal(result.reviewedByMe, true);
});

test("classifyPullRequest sets reviewedByMe true when vote is -10 (rejected)", () => {
  const result = classifyPullRequest(
    makePRWithReviewer({ vote: -10 }),
    voteCurrentUser,
    "myorg",
  );
  assert.equal(result.assignedToMe, false);
  assert.equal(result.reviewedByMe, true);
});

test("classifyPullRequest exposes myVote on prInfo when user is reviewer", () => {
  const result = classifyPullRequest(
    makePRWithReviewer({ vote: 10 }),
    voteCurrentUser,
    "myorg",
  );
  assert.equal(result.prInfo.myVote, 10);
});

test("classifyPullRequest sets myVote to 0 when reviewer vote field is absent", () => {
  const result = classifyPullRequest(
    makePRWithReviewer({}),
    voteCurrentUser,
    "myorg",
  );
  assert.equal(result.prInfo.myVote, 0);
});

test("classifyPullRequest sets myVote to null when user is not a reviewer", () => {
  const nonReviewer = { id: "other-user", emailAddress: "other@example.com" };
  const result = classifyPullRequest(
    makePRWithReviewer({ vote: 10 }),
    nonReviewer,
    "myorg",
  );
  assert.equal(result.prInfo.myVote, null);
});

// Phase 3 — label extraction tests

test("classifyPullRequest extracts labels from pr.labels", () => {
  const pr = {
    ...makePRWithReviewer({ vote: 0 }),
    labels: [{ id: "1", name: "Urgent", active: true }],
  };
  const result = classifyPullRequest(pr, voteCurrentUser, "myorg");
  assert.deepEqual(result.prInfo.labels, [{ name: "Urgent" }]);
});

test("classifyPullRequest returns empty labels array when pr.labels is absent", () => {
  const result = classifyPullRequest(
    makePRWithReviewer({ vote: 0 }),
    voteCurrentUser,
    "myorg",
  );
  assert.deepEqual(result.prInfo.labels, []);
});
