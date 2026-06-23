import test from "node:test";
import assert from "node:assert/strict";

import {
  countUnresolvedThreads,
  getEnrichmentBatch,
  getRelevantPRs,
} from "../src/background/discussion-helpers.mjs";

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function makePR(projectId, repositoryId, id) {
  return { projectId, repositoryId, id };
}

// ---------------------------------------------------------------------------
// getRelevantPRs
// ---------------------------------------------------------------------------

test("getRelevantPRs collects PRs from assignedToMe bucket", () => {
  const prData = { assignedToMe: [makePR("p1", "r1", 1)] };
  const keys = getRelevantPRs(prData);
  assert.deepEqual(keys, ["p1/r1/1"]);
});

test("getRelevantPRs collects PRs from myPRsPending bucket", () => {
  const prData = { myPRsPending: [makePR("p1", "r1", 2)] };
  const keys = getRelevantPRs(prData);
  assert.deepEqual(keys, ["p1/r1/2"]);
});

test("getRelevantPRs collects PRs from changesRequested bucket", () => {
  const prData = { changesRequested: [makePR("p1", "r1", 3)] };
  const keys = getRelevantPRs(prData);
  assert.deepEqual(keys, ["p1/r1/3"]);
});

test("getRelevantPRs collects from all three buckets", () => {
  const prData = {
    assignedToMe: [makePR("p1", "r1", 1)],
    myPRsPending: [makePR("p1", "r1", 2)],
    changesRequested: [makePR("p1", "r1", 3)],
  };
  const keys = getRelevantPRs(prData);
  assert.equal(keys.length, 3);
  assert.ok(keys.includes("p1/r1/1"));
  assert.ok(keys.includes("p1/r1/2"));
  assert.ok(keys.includes("p1/r1/3"));
});

test("getRelevantPRs deduplicates a PR appearing in two buckets", () => {
  const pr = makePR("p1", "r1", 42);
  const prData = { assignedToMe: [pr], changesRequested: [pr] };
  const keys = getRelevantPRs(prData);
  assert.equal(keys.length, 1);
  assert.deepEqual(keys, ["p1/r1/42"]);
});

test("getRelevantPRs deduplicates a PR appearing in all three buckets", () => {
  const pr = makePR("p1", "r1", 7);
  const prData = {
    assignedToMe: [pr],
    myPRsPending: [pr],
    changesRequested: [pr],
  };
  const keys = getRelevantPRs(prData);
  assert.equal(keys.length, 1);
});

test("getRelevantPRs returns empty array for null prData", () => {
  assert.deepEqual(getRelevantPRs(null), []);
});

test("getRelevantPRs returns empty array for undefined prData", () => {
  assert.deepEqual(getRelevantPRs(undefined), []);
});

test("getRelevantPRs returns empty array for empty prData object", () => {
  assert.deepEqual(getRelevantPRs({}), []);
});

test("getRelevantPRs tolerates missing assignedToMe bucket", () => {
  const prData = { myPRsPending: [makePR("p1", "r1", 1)] };
  assert.doesNotThrow(() => getRelevantPRs(prData));
  assert.deepEqual(getRelevantPRs(prData), ["p1/r1/1"]);
});

test("getRelevantPRs does not include reviewedByMe bucket", () => {
  const prData = {
    reviewedByMe: [makePR("p1", "r1", 99)],
    assignedToMe: [makePR("p1", "r1", 1)],
  };
  const keys = getRelevantPRs(prData);
  assert.ok(!keys.includes("p1/r1/99"));
  assert.deepEqual(keys, ["p1/r1/1"]);
});

// ---------------------------------------------------------------------------
// getEnrichmentBatch
// ---------------------------------------------------------------------------

test("getEnrichmentBatch returns first cap items when cursor is 0", () => {
  const keys = ["a", "b", "c", "d", "e"];
  const { batch, nextCursor } = getEnrichmentBatch(keys, 0, 3);
  assert.deepEqual(batch, ["a", "b", "c"]);
  assert.equal(nextCursor, 3);
});

test("getEnrichmentBatch returns items from cursor position", () => {
  const keys = ["a", "b", "c", "d", "e"];
  const { batch, nextCursor } = getEnrichmentBatch(keys, 2, 2);
  assert.deepEqual(batch, ["c", "d"]);
  assert.equal(nextCursor, 4);
});

test("getEnrichmentBatch wraps nextCursor to 0 when reaching end of array", () => {
  const keys = ["a", "b", "c", "d", "e"];
  const { batch, nextCursor } = getEnrichmentBatch(keys, 3, 3);
  assert.deepEqual(batch, ["d", "e"]);
  assert.equal(nextCursor, 0);
});

test("getEnrichmentBatch returns all items and nextCursor 0 when array smaller than cap", () => {
  const keys = ["a", "b", "c"];
  const { batch, nextCursor } = getEnrichmentBatch(keys, 0, 10);
  assert.deepEqual(batch, ["a", "b", "c"]);
  assert.equal(nextCursor, 0);
});

test("getEnrichmentBatch returns empty batch and nextCursor 0 when cursor is at or beyond length", () => {
  const keys = ["a", "b", "c"];
  const { batch, nextCursor } = getEnrichmentBatch(keys, 5, 3);
  assert.deepEqual(batch, []);
  assert.equal(nextCursor, 0);
});

test("getEnrichmentBatch returns empty batch for empty array", () => {
  const { batch, nextCursor } = getEnrichmentBatch([], 0, 10);
  assert.deepEqual(batch, []);
  assert.equal(nextCursor, 0);
});

test("getEnrichmentBatch uses cap 10 by default", () => {
  const keys = Array.from({ length: 15 }, (_, i) => `pr-${i}`);
  const { batch, nextCursor } = getEnrichmentBatch(keys, 0);
  assert.equal(batch.length, 10);
  assert.equal(nextCursor, 10);
});

// ---------------------------------------------------------------------------
// countUnresolvedThreads
// ---------------------------------------------------------------------------

test("countUnresolvedThreads counts threads with status active", () => {
  const threads = [{ status: "active" }, { status: "active" }];
  assert.equal(countUnresolvedThreads(threads), 2);
});

test("countUnresolvedThreads counts threads with status pending", () => {
  const threads = [{ status: "pending" }];
  assert.equal(countUnresolvedThreads(threads), 1);
});

test("countUnresolvedThreads counts both active and pending together", () => {
  const threads = [
    { status: "active" },
    { status: "pending" },
    { status: "fixed" },
  ];
  assert.equal(countUnresolvedThreads(threads), 2);
});

test("countUnresolvedThreads does not count threads with status fixed", () => {
  const threads = [{ status: "fixed" }];
  assert.equal(countUnresolvedThreads(threads), 0);
});

test("countUnresolvedThreads does not count threads with status closed", () => {
  const threads = [{ status: "closed" }];
  assert.equal(countUnresolvedThreads(threads), 0);
});

test("countUnresolvedThreads does not count threads with status byDesign", () => {
  const threads = [{ status: "byDesign" }];
  assert.equal(countUnresolvedThreads(threads), 0);
});

test("countUnresolvedThreads does not count threads with status wontFix", () => {
  const threads = [{ status: "wontFix" }];
  assert.equal(countUnresolvedThreads(threads), 0);
});

test("countUnresolvedThreads does not count threads with missing status", () => {
  const threads = [{}];
  assert.equal(countUnresolvedThreads(threads), 0);
});

test("countUnresolvedThreads returns 0 for empty array", () => {
  assert.equal(countUnresolvedThreads([]), 0);
});

test("countUnresolvedThreads is case-sensitive (Active is not counted)", () => {
  const threads = [{ status: "Active" }, { status: "Pending" }];
  assert.equal(countUnresolvedThreads(threads), 0);
});
