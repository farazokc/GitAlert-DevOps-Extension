export async function getConfig() {
  return new Promise((resolve) => {
    chrome.storage.local.get(
      [
        "organization",
        "projectId",
        "projectName",
        "token",
        "repos",
        "reminders",
        "urgentTags",
        "prData",
        "notificationsEnabled",
        "urgentNotificationsEnabled",
        "userId",
        "userDescriptor",
        "username",
        "userEmail",
        "userAvatarUrl",
        "userIdentityEmail",
        "identityVerificationState",
        "knownAssignments",
        "lastUrgentNotified",
        "availableRepos",
      ],
      resolve,
    );
  });
}

export function setConfig(config) {
  return new Promise((resolve) => {
    chrome.storage.local.set(config, resolve);
  });
}

export async function clearAuthSession() {
  return new Promise((resolve) => {
    chrome.storage.local.set(
      {
        organization: "",
        projectId: "",
        projectName: "",
        token: "",
        repos: [],
        availableRepos: [],
        userId: "",
        userDescriptor: "",
        username: "",
        userEmail: "",
        userAvatarUrl: "",
        userIdentityEmail: "",
        identityVerificationState: "unverified",
        prData: null,
        lastFetch: null,
        knownAssignments: [],
        lastUrgentNotified: {},
      },
      resolve,
    );
  });
}
