import test from "node:test";
import assert from "node:assert/strict";

import {
  UnauthorizedError,
  hasVerifiedIdentity,
  updateAssignmentState,
  withRetry,
} from "../src/background/api-helpers.mjs";

test("UnauthorizedError has correct name and default message", () => {
  const err = new UnauthorizedError();
  assert.equal(err.name, "UnauthorizedError");
  assert.equal(err.message, "Unauthorized");
  assert.ok(err instanceof Error);
});

test("UnauthorizedError accepts a custom message", () => {
  const err = new UnauthorizedError("Session expired");
  assert.equal(err.message, "Session expired");
});

test("hasVerifiedIdentity returns true when verified with email present", () => {
  const config = {
    identityVerificationState: "verified",
    userEmail: "dev@example.com",
  };
  assert.equal(hasVerifiedIdentity(config), true);
});

test("hasVerifiedIdentity returns false for unverified state", () => {
  const config = {
    identityVerificationState: "unverified",
    userEmail: "dev@example.com",
  };
  assert.equal(hasVerifiedIdentity(config), false);
});

test("hasVerifiedIdentity returns false when email is empty", () => {
  const config = { identityVerificationState: "verified", userEmail: "" };
  assert.equal(hasVerifiedIdentity(config), false);
});

test("hasVerifiedIdentity returns false when email is absent", () => {
  const config = { identityVerificationState: "verified" };
  assert.equal(hasVerifiedIdentity(config), false);
});

test("updateAssignmentState detects all new assignments when list was empty", () => {
  const config = { knownAssignments: [] };
  const keys = new Set(["proj/repo/1", "proj/repo/2"]);
  const result = updateAssignmentState(config, keys);
  assert.deepEqual(result.newAssignments.sort(), [
    "proj/repo/1",
    "proj/repo/2",
  ]);
  assert.equal(result.knownAssignments.length, 2);
});

test("updateAssignmentState retains known assignments and detects new ones", () => {
  const config = { knownAssignments: ["proj/repo/1"] };
  const keys = new Set(["proj/repo/1", "proj/repo/2"]);
  const result = updateAssignmentState(config, keys);
  assert.deepEqual(result.newAssignments, ["proj/repo/2"]);
  assert.ok(result.knownAssignments.includes("proj/repo/1"));
  assert.ok(result.knownAssignments.includes("proj/repo/2"));
});

test("updateAssignmentState prunes assignments no longer active", () => {
  const config = { knownAssignments: ["proj/repo/1", "proj/repo/old"] };
  const keys = new Set(["proj/repo/1"]);
  const result = updateAssignmentState(config, keys);
  assert.ok(!result.knownAssignments.includes("proj/repo/old"));
  assert.deepEqual(result.newAssignments, []);
});

test("updateAssignmentState handles missing knownAssignments gracefully", () => {
  const config = {};
  const keys = new Set(["proj/repo/1"]);
  const result = updateAssignmentState(config, keys);
  assert.deepEqual(result.newAssignments, ["proj/repo/1"]);
});

test("withRetry resolves on first attempt", async () => {
  let calls = 0;
  const result = await withRetry(
    async () => {
      calls++;
      return "ok";
    },
    3,
    0,
  );
  assert.equal(result, "ok");
  assert.equal(calls, 1);
});

test("withRetry retries on transient failures and resolves eventually", async () => {
  let calls = 0;
  const result = await withRetry(
    async () => {
      calls++;
      if (calls < 3) throw new Error("transient");
      return "recovered";
    },
    3,
    0,
  );
  assert.equal(result, "recovered");
  assert.equal(calls, 3);
});

test("withRetry throws immediately on UnauthorizedError without retrying", async () => {
  let calls = 0;
  await assert.rejects(
    async () => {
      await withRetry(
        async () => {
          calls++;
          throw new UnauthorizedError();
        },
        3,
        0,
      );
    },
    (err) => err instanceof UnauthorizedError,
  );
  assert.equal(calls, 1);
});

test("withRetry throws after exhausting all retries", async () => {
  let calls = 0;
  await assert.rejects(async () => {
    await withRetry(
      async () => {
        calls++;
        throw new Error("always fails");
      },
      3,
      0,
    );
  }, /always fails/);
  assert.equal(calls, 3);
});
