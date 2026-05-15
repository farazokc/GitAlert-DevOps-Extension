import { POLL_INTERVAL_MINUTES, handleAlarm, setupAlarms } from "./alarms.js";
import { fetchRepositories, pollPullRequests } from "./api.js";
import { getConfig, setConfig } from "./storage.js";

// Initialize on install
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    chrome.storage.local.set({
      organization: "",
      projectId: "",
      projectName: "",
      token: "",
      repos: [],
      availableRepos: [],
      reminders: [],
      urgentTags: ["Important", "Urgent", "Critical"],
      notificationsEnabled: true,
      urgentNotificationsEnabled: true,
      lastFetch: null,
      prData: null,
      userId: "",
      userDescriptor: "",
      username: "",
      userEmail: "",
      userAvatarUrl: "",
      userIdentityEmail: "",
      identityVerificationState: "unverified",
      knownAssignments: [],
      lastUrgentNotified: {},
    });
  }

  chrome.alarms.create("pollPRs", { periodInMinutes: POLL_INTERVAL_MINUTES });
  chrome.alarms.create("checkReminders", { periodInMinutes: 1 });
  chrome.alarms.create("urgentPRReminder", { periodInMinutes: 5 });
});

// Handle alarms
chrome.alarms.onAlarm.addListener(handleAlarm);

// Listen for messages from popup
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "FETCH_PRS") {
    pollPullRequests()
      .then((data) => sendResponse({ success: true, data }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }
  if (msg.type === "FETCH_REPOS") {
    getConfig().then(() => {
      fetchRepositories()
        .then((repos) => sendResponse({ success: true, repos }))
        .catch((err) => sendResponse({ success: false, error: err.message }));
    });
    return true;
  }
  if (msg.type === "CONFIRM_IDENTITY") {
    setConfig({ identityVerificationState: "verified" })
      .then(() => pollPullRequests())
      .then((data) => sendResponse({ success: true, data }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }
});

setupAlarms();
