import test from "node:test";
import assert from "node:assert/strict";

import {
  buildBasicAuthHeader,
  classifyPullRequest,
  createBootstrapIdentity,
  findMatchingIdentity,
  matchesCurrentUser,
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
