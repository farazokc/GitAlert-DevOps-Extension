import { getConfig, setConfig } from "./storage.js";
import { sendNotification } from "./notifications.js";
import { pollPullRequests } from "./api.js";
import { shouldFireReminder, getUrgentPRsDue } from "./alarm-helpers.mjs";

export const POLL_INTERVAL_MINUTES = 2;

export async function checkScheduledReminders() {
  const config = await getConfig();
  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(
    now.getMinutes(),
  ).padStart(2, "0")}`;

  if (!shouldFireReminder(config, currentTime)) return;

  sendNotification(
    "⏰ PR Review Reminder",
    `You have ${config.prData.stats.assignedToReview} PR(s) waiting for your review.`,
    null,
  );
}

export async function checkUrgentPRs() {
  const config = await getConfig();
  if (config.identityVerificationState !== "verified") return;
  if (!config.urgentNotificationsEnabled) return;
  if (!config.prData || !config.prData.assignedToMe) return;

  const lastUrgentNotified = config.lastUrgentNotified || {};
  const now = Date.now();
  const urgentPRs = config.prData.assignedToMe.filter((pr) => pr.isUrgent);
  const due = getUrgentPRsDue(urgentPRs, lastUrgentNotified, now);

  for (const pr of due) {
    sendNotification(
      "🚨 Urgent PR Needs Review!",
      `[${pr.repo}] ${pr.title}\nThis PR has an urgent label and needs your attention.`,
      pr.url,
    );
    lastUrgentNotified[`${pr.repo}#${pr.number}`] = now;
  }

  if (due.length > 0) {
    await setConfig({ lastUrgentNotified });
  }
}

export async function handleAlarm(alarm) {
  if (alarm.name === "pollPRs") {
    await pollPullRequests();
  } else if (alarm.name === "checkReminders") {
    await checkScheduledReminders();
  } else if (alarm.name === "urgentPRReminder") {
    await checkUrgentPRs();
  }
}

export function setupAlarms() {
  // Ensure alarms exist on startup
  chrome.alarms.get("pollPRs", (alarm) => {
    if (!alarm) {
      chrome.alarms.create("pollPRs", {
        periodInMinutes: POLL_INTERVAL_MINUTES,
      });
    }
  });
  chrome.alarms.get("checkReminders", (alarm) => {
    if (!alarm) chrome.alarms.create("checkReminders", { periodInMinutes: 1 });
  });
  chrome.alarms.get("urgentPRReminder", (alarm) => {
    if (!alarm) {
      chrome.alarms.create("urgentPRReminder", { periodInMinutes: 5 });
    }
  });
}
