import test from "node:test";
import assert from "node:assert/strict";

import { isUrgentPR } from "../src/background/urgency-helpers.mjs";

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function makePR(title, labels = []) {
  return { title, labels };
}

// ---------------------------------------------------------------------------
// label matching
// ---------------------------------------------------------------------------

test("isUrgentPR returns true for exact label match", () => {
  assert.equal(
    isUrgentPR(makePR("Add feature", [{ name: "Urgent" }]), ["Urgent"]),
    true,
  );
});

test("isUrgentPR label matching is case-insensitive", () => {
  assert.equal(
    isUrgentPR(makePR("Add feature", [{ name: "URGENT" }]), ["urgent"]),
    true,
  );
});

test("isUrgentPR returns false when label does not match any tag", () => {
  assert.equal(
    isUrgentPR(makePR("Add feature", [{ name: "Low" }]), ["Urgent"]),
    false,
  );
});

test("isUrgentPR label match is exact not substring (tag is substring of label)", () => {
  assert.equal(
    isUrgentPR(makePR("Add feature", [{ name: "Not Urgent" }]), ["Urgent"]),
    false,
  );
});

test("isUrgentPR returns true when one of multiple labels matches", () => {
  const labels = [{ name: "Low" }, { name: "Critical" }];
  assert.equal(isUrgentPR(makePR("Add feature", labels), ["Critical"]), true);
});

// ---------------------------------------------------------------------------
// title matching
// ---------------------------------------------------------------------------

test("isUrgentPR returns true for title substring match", () => {
  assert.equal(isUrgentPR(makePR("Fix urgent login bug"), ["urgent"]), true);
});

test("isUrgentPR title matching is case-insensitive", () => {
  assert.equal(isUrgentPR(makePR("URGENT: fix auth"), ["urgent"]), true);
});

test("isUrgentPR returns false when title does not contain any tag", () => {
  assert.equal(isUrgentPR(makePR("Add feature"), ["Urgent"]), false);
});

// ---------------------------------------------------------------------------
// either match is sufficient
// ---------------------------------------------------------------------------

test("isUrgentPR returns true when only label matches (title does not)", () => {
  assert.equal(
    isUrgentPR(makePR("Add feature", [{ name: "Urgent" }]), ["Urgent"]),
    true,
  );
});

test("isUrgentPR returns true when only title matches (no labels)", () => {
  assert.equal(isUrgentPR(makePR("urgent: fix crash"), ["urgent"]), true);
});

// ---------------------------------------------------------------------------
// multiple tags
// ---------------------------------------------------------------------------

test("isUrgentPR returns true when second tag matches label", () => {
  assert.equal(
    isUrgentPR(makePR("Add feature", [{ name: "Urgent" }]), [
      "Critical",
      "Urgent",
    ]),
    true,
  );
});

test("isUrgentPR returns true when second tag matches title", () => {
  assert.equal(
    isUrgentPR(makePR("critical fix needed"), ["Urgent", "critical"]),
    true,
  );
});

// ---------------------------------------------------------------------------
// edge cases
// ---------------------------------------------------------------------------

test("isUrgentPR returns false for empty urgentTags", () => {
  assert.equal(
    isUrgentPR(makePR("urgent fix", [{ name: "Urgent" }]), []),
    false,
  );
});

test("isUrgentPR returns false when urgentTags is null", () => {
  assert.equal(
    isUrgentPR(makePR("urgent fix", [{ name: "Urgent" }]), null),
    false,
  );
});

test("isUrgentPR falls back to title-only when pr.labels is absent", () => {
  const pr = { title: "urgent fix" };
  assert.equal(isUrgentPR(pr, ["urgent"]), true);
});

test("isUrgentPR returns false when no match and labels is empty", () => {
  assert.equal(isUrgentPR(makePR("Add feature", []), ["Urgent"]), false);
});
