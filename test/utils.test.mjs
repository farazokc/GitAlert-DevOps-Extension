import test from "node:test";
import assert from "node:assert/strict";

import { formatTime, getTimeAgo } from "../src/popup/utils.mjs";

test("formatTime converts afternoon time to 12-hour PM format", () => {
  assert.equal(formatTime("13:30"), "1:30 PM");
});

test("formatTime converts midnight to 12:00 AM", () => {
  assert.equal(formatTime("00:00"), "12:00 AM");
});

test("formatTime converts noon to 12:00 PM", () => {
  assert.equal(formatTime("12:00"), "12:00 PM");
});

test("formatTime converts morning time with leading zero", () => {
  assert.equal(formatTime("09:05"), "9:05 AM");
});

test("formatTime converts last minute of day to 11:59 PM", () => {
  assert.equal(formatTime("23:59"), "11:59 PM");
});

test("getTimeAgo returns minutes for recent dates", () => {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  assert.equal(getTimeAgo(fiveMinutesAgo), "5m ago");
});

test("getTimeAgo returns hours when older than 60 minutes", () => {
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
  assert.equal(getTimeAgo(twoHoursAgo), "2h ago");
});

test("getTimeAgo returns days when older than 24 hours", () => {
  const threeDaysAgo = new Date(
    Date.now() - 3 * 24 * 60 * 60 * 1000,
  ).toISOString();
  assert.equal(getTimeAgo(threeDaysAgo), "3d ago");
});

test("getTimeAgo returns 0m ago for very recent dates", () => {
  const thirtySecondsAgo = new Date(Date.now() - 30 * 1000).toISOString();
  assert.equal(getTimeAgo(thirtySecondsAgo), "0m ago");
});
