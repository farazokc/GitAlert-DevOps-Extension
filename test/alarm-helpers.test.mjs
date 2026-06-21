import test from "node:test";
import assert from "node:assert/strict";

import {
  shouldFireReminder,
  getUrgentPRsDue,
} from "../src/background/alarm-helpers.mjs";

const verifiedConfig = {
  identityVerificationState: "verified",
  notificationsEnabled: true,
  reminders: ["09:00", "18:00"],
  prData: { stats: { assignedToReview: 3 } },
};

test("shouldFireReminder returns true at a configured reminder time", () => {
  assert.equal(shouldFireReminder(verifiedConfig, "09:00"), true);
});

test("shouldFireReminder returns true for the second configured time", () => {
  assert.equal(shouldFireReminder(verifiedConfig, "18:00"), true);
});

test("shouldFireReminder returns false for a non-configured time", () => {
  assert.equal(shouldFireReminder(verifiedConfig, "10:00"), false);
});

test("shouldFireReminder returns false for unverified identity", () => {
  const config = {
    ...verifiedConfig,
    identityVerificationState: "unverified",
  };
  assert.equal(shouldFireReminder(config, "09:00"), false);
});

test("shouldFireReminder returns false when notifications are disabled", () => {
  const config = { ...verifiedConfig, notificationsEnabled: false };
  assert.equal(shouldFireReminder(config, "09:00"), false);
});

test("shouldFireReminder returns false with no reminders configured", () => {
  const config = { ...verifiedConfig, reminders: [] };
  assert.equal(shouldFireReminder(config, "09:00"), false);
});

test("shouldFireReminder returns false when no PRs are assigned to review", () => {
  const config = {
    ...verifiedConfig,
    prData: { stats: { assignedToReview: 0 } },
  };
  assert.equal(shouldFireReminder(config, "09:00"), false);
});

test("shouldFireReminder returns false when prData is absent", () => {
  const config = { ...verifiedConfig, prData: null };
  assert.equal(shouldFireReminder(config, "09:00"), false);
});

test("getUrgentPRsDue returns all urgent PRs when no prior notifications", () => {
  const urgentPRs = [
    { repo: "Repo", number: 1, title: "URGENT fix" },
    { repo: "Repo", number: 2, title: "URGENT deploy" },
  ];
  const result = getUrgentPRsDue(urgentPRs, {}, Date.now(), 0);
  assert.equal(result.length, 2);
});

test("getUrgentPRsDue excludes PRs notified within the re-notify interval", () => {
  const urgentPRs = [{ repo: "Repo", number: 1, title: "Urgent" }];
  const now = Date.now();
  const lastNotified = { "Repo#1": now - 1000 };
  const result = getUrgentPRsDue(urgentPRs, lastNotified, now, 5 * 60 * 1000);
  assert.equal(result.length, 0);
});

test("getUrgentPRsDue includes PRs notified beyond the re-notify interval", () => {
  const urgentPRs = [{ repo: "Repo", number: 1, title: "Urgent" }];
  const now = Date.now();
  const lastNotified = { "Repo#1": now - 6 * 60 * 1000 };
  const result = getUrgentPRsDue(urgentPRs, lastNotified, now, 5 * 60 * 1000);
  assert.equal(result.length, 1);
});

test("getUrgentPRsDue returns empty array when no urgent PRs exist", () => {
  const result = getUrgentPRsDue([], {}, Date.now(), 0);
  assert.equal(result.length, 0);
});

test("getUrgentPRsDue uses default 5-minute interval when not specified", () => {
  const urgentPRs = [{ repo: "Repo", number: 1, title: "Urgent" }];
  const now = Date.now();
  const recentlyNotified = { "Repo#1": now - 4 * 60 * 1000 };
  const result = getUrgentPRsDue(urgentPRs, recentlyNotified, now);
  assert.equal(result.length, 0);
});
