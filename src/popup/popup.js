import { getStorage, setStorage } from "./storage.js";
import * as UI from "./ui.js";

let availableRepos = [];
let currentUrgentTags = [];

function encodeBasicAuthToken(token) {
  return btoa(`:${token}`);
}

document.addEventListener("DOMContentLoaded", init);

async function init() {
  const config = await getStorage([
    "organization",
    "projectId",
    "projectName",
    "token",
    "repos",
    "availableRepos",
    "reminders",
    "urgentTags",
    "notificationsEnabled",
    "urgentNotificationsEnabled",
    "prData",
    "lastFetch",
    "username",
    "userAvatarUrl",
    "userIdentityEmail",
    "identityVerificationState",
  ]);

  currentUrgentTags = config.urgentTags || ["Important", "Urgent", "Critical"];
  availableRepos = config.availableRepos || [];

  if (!config.token || !config.organization) {
    UI.showSetup();
  } else {
    UI.showApp(config, currentUrgentTags);
    if (!config.prData) fetchPRs();
  }

  bindEvents();

  chrome.storage.onChanged.addListener((changes) => {
    if (changes.token && !changes.token.newValue) {
      closeDiscoveryPanel();
      UI.resetDashboard();
      UI.showSetup();
      document.getElementById("userProfile").style.display = "none";
      document.getElementById("refreshBtn").style.display = "none";
      document.getElementById("settingsBtn").style.display = "none";
    }
  });
}

function bindEvents() {
  document
    .getElementById("saveTokenBtn")
    .addEventListener("click", validateAndSaveToken);
  document
    .getElementById("confirmIdentityBtn")
    .addEventListener("click", confirmIdentity);
  document.getElementById("tokenInput").addEventListener("keypress", (e) => {
    if (e.key === "Enter") validateAndSaveToken();
  });
  document
    .getElementById("organizationInput")
    .addEventListener("keypress", (e) => {
      if (e.key === "Enter") validateAndSaveToken();
    });

  document
    .getElementById("disconnectBtn")
    .addEventListener("click", async () => {
      await setStorage({
        organization: "",
        projectId: "",
        projectName: "",
        token: "",
        username: "",
        userEmail: "",
        userAvatarUrl: "",
        userIdentityEmail: "",
        identityVerificationState: "unverified",
        repos: [],
        availableRepos: [],
        prData: null,
        lastFetch: null,
        knownAssignments: [],
        lastUrgentNotified: {},
      });

      chrome.action.setBadgeText({ text: "" });

      document.getElementById("userProfile").style.display = "none";
      document.getElementById("userAvatar").src = "";
      document.getElementById("userLogin").textContent = "";
      document.getElementById("refreshBtn").style.display = "none";
      document.getElementById("settingsBtn").style.display = "none";
      document.getElementById("organizationInput").value = "";
      document.getElementById("tokenInput").value = "";
      document.getElementById("userIdentityEmailInput").value = "";
      document.getElementById("tokenError").style.display = "none";
      document.getElementById("identityStatus").style.display = "none";

      UI.resetDashboard();
      UI.showSetup();
    });

  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document
        .querySelectorAll(".tab")
        .forEach((t) => t.classList.remove("active"));
      document
        .querySelectorAll(".tab-content")
        .forEach((c) => c.classList.remove("active"));
      tab.classList.add("active");
      document.getElementById(`tab-${tab.dataset.tab}`).classList.add("active");
    });
  });

  document.getElementById("refreshBtn").addEventListener("click", fetchPRs);

  document.getElementById("settingsBtn").addEventListener("click", () => {
    document
      .querySelectorAll(".tab")
      .forEach((t) => t.classList.remove("active"));
    document
      .querySelectorAll(".tab-content")
      .forEach((c) => c.classList.remove("active"));
    document.querySelector('[data-tab="settings"]').classList.add("active");
    document.getElementById("tab-settings").classList.add("active");
  });

  document
    .getElementById("addReminderBtn")
    .addEventListener("click", addReminder);
  document.getElementById("addTagBtn").addEventListener("click", addTag);
  document.getElementById("tagInput").addEventListener("keypress", (e) => {
    if (e.key === "Enter") addTag();
  });

  document.querySelectorAll(".toggle").forEach((toggle) => {
    toggle.addEventListener("click", async () => {
      const key = toggle.dataset.key;
      const isOn = toggle.classList.toggle("on");
      await setStorage({ [key]: isOn });
    });
  });

  document
    .getElementById("discoverReposBtn")
    .addEventListener("click", openDiscoveryPanel);
  document
    .getElementById("discoveryCloseBtn")
    .addEventListener("click", closeDiscoveryPanel);
  document
    .getElementById("discoveryOverlay")
    .addEventListener("click", closeDiscoveryPanel);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeDiscoveryPanel();
  });
  document
    .getElementById("repoSearchInput")
    .addEventListener("input", async (e) => {
      const config = await getStorage(["repos"]);
      UI.renderDiscoveryResults(
        availableRepos,
        config.repos || [],
        e.target.value,
      );
    });

  document.getElementById("prContent").addEventListener("click", (e) => {
    const prItem = e.target.closest(".pr-item");
    if (prItem && prItem.dataset.url) window.open(prItem.dataset.url, "_blank");
  });

  document.getElementById("repoList").addEventListener("click", (e) => {
    if (e.target.classList.contains("repo-remove-btn")) {
      const repoId = e.target.dataset.repoId;
      if (repoId) removeRepo(repoId);
    }
  });

  document.getElementById("discoveryResults").addEventListener("click", (e) => {
    const item = e.target.closest(".discovery-item");
    if (item && !item.classList.contains("connected")) {
      const repoId = item.dataset.repoId;
      if (repoId) addRepoFromDiscovery(repoId);
    }
  });

  document.getElementById("reminderList").addEventListener("click", (e) => {
    if (e.target.classList.contains("reminder-remove-btn")) {
      const time = e.target.dataset.time;
      if (time) removeReminder(time);
    }
  });

  document.getElementById("tagList").addEventListener("click", (e) => {
    if (e.target.classList.contains("tag-remove-btn")) {
      const tag = e.target.dataset.tag;
      if (tag) removeTag(tag);
    }
  });
}

async function validateAndSaveToken() {
  const organizationInput = document.getElementById("organizationInput");
  const tokenInput = document.getElementById("tokenInput");
  const userIdentityEmailInput = document.getElementById(
    "userIdentityEmailInput",
  );
  const saveBtn = document.getElementById("saveTokenBtn");
  const organization = organizationInput.value.trim();
  const token = tokenInput.value.trim();
  const userIdentityEmail = userIdentityEmailInput.value.trim();

  if (!organization || !token || !userIdentityEmail) {
    UI.showTokenError(
      "Please enter an organization, personal access token, and email address.",
    );
    return;
  }

  saveBtn.disabled = true;
  saveBtn.innerHTML = '<span class="btn-spinner"></span> Validating...';
  document.getElementById("tokenError").style.display = "none";
  document.getElementById("identityStatus").style.display = "none";

  try {
    const auth = `Basic ${encodeBasicAuthToken(token)}`;
    const reposRes = await fetch(
      `https://dev.azure.com/${encodeURIComponent(organization)}/_apis/git/repositories?api-version=7.1`,
      {
        headers: {
          Authorization: auth,
          Accept: "application/json",
        },
      },
    );

    if (!reposRes.ok) {
      const msg =
        reposRes.status === 401 || reposRes.status === 203
          ? "The token cannot access this Azure DevOps organization."
          : `Could not read repositories from ${organization} (${reposRes.status}).`;
      UI.showTokenError(msg);
      return;
    }

    const repoPayload = await reposRes.json();
    const repos = (repoPayload.value || []).map((repo) => ({
      repositoryId: repo.id,
      repositoryName: repo.name,
      projectId: repo.project?.id || "",
      projectName: repo.project?.name || "",
      remoteUrl: repo.remoteUrl || repo.webUrl || "",
    }));

    availableRepos = repos;
    const defaultProject =
      repos.find((repo) => repo.projectName === "VL-Core") || repos[0];

    await setStorage({
      organization,
      token,
      availableRepos: repos,
      repos: defaultProject
        ? repos.filter((repo) => repo.projectId === defaultProject.projectId)
        : [],
      projectId: defaultProject?.projectId || "",
      projectName: defaultProject?.projectName || "",
      userId: "",
      userDescriptor: "",
      username: "",
      userEmail: "",
      userAvatarUrl: "",
      userIdentityEmail,
      identityVerificationState: "unverified",
      prData: null,
      lastFetch: null,
      knownAssignments: [],
    });

    const config = await getStorage([
      "organization",
      "projectId",
      "projectName",
      "token",
      "repos",
      "reminders",
      "urgentTags",
      "notificationsEnabled",
      "urgentNotificationsEnabled",
      "prData",
      "lastFetch",
      "username",
      "userAvatarUrl",
      "userIdentityEmail",
      "identityVerificationState",
    ]);
    currentUrgentTags = config.urgentTags || [
      "Important",
      "Urgent",
      "Critical",
    ];
    UI.showApp(config, currentUrgentTags);
    fetchPRs();
  } catch {
    UI.showTokenError("Network error — could not reach Azure DevOps.");
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = "Connect";
  }
}

function confirmIdentity() {
  chrome.runtime.sendMessage({ type: "CONFIRM_IDENTITY" }, async (response) => {
    if (!response || !response.success) {
      UI.showTokenError(response?.error || "Could not confirm identity.");
      return;
    }

    const config = await getStorage([
      "organization",
      "projectId",
      "projectName",
      "token",
      "repos",
      "reminders",
      "urgentTags",
      "notificationsEnabled",
      "urgentNotificationsEnabled",
      "prData",
      "lastFetch",
      "username",
      "userAvatarUrl",
      "userIdentityEmail",
      "identityVerificationState",
    ]);
    currentUrgentTags = config.urgentTags || [
      "Important",
      "Urgent",
      "Critical",
    ];
    UI.showApp(config, currentUrgentTags);
  });
}

function fetchPRs() {
  UI.resetDashboard();
  document.getElementById("prLoading").style.display = "";
  document.getElementById("statusText").textContent = "Fetching...";

  chrome.runtime.sendMessage({ type: "FETCH_PRS" }, (response) => {
    document.getElementById("prLoading").style.display = "none";
    if (response && response.success) {
      if (response.data) {
        UI.renderDashboard(response.data, currentUrgentTags);
        UI.updateStatus(new Date().toISOString());
      } else {
        document.getElementById("statusText").textContent = "Connected";
      }
    } else {
      document.getElementById("statusText").textContent =
        response?.error || "Error fetching data";
    }
  });
}

function openDiscoveryPanel() {
  const overlay = document.getElementById("discoveryOverlay");
  const panel = document.getElementById("discoveryPanel");
  const btn = document.getElementById("discoverReposBtn");
  const resultsEl = document.getElementById("discoveryResults");

  overlay.style.display = "block";
  panel.style.removeProperty("display");
  document.getElementById("repoSearchInput").value = "";
  resultsEl.innerHTML =
    '<div class="discovery-loading"><div class="spinner"></div> Loading repositories...</div>';
  btn.disabled = true;

  chrome.runtime.sendMessage({ type: "FETCH_REPOS" }, async (response) => {
    btn.disabled = false;
    if (response && response.success && response.repos) {
      availableRepos = response.repos;
      await setStorage({ availableRepos });
      const config = await getStorage(["repos"]);
      UI.renderDiscoveryResults(availableRepos, config.repos || [], "");
    } else {
      resultsEl.innerHTML = `<div class="discovery-error">⚠ Failed to load: ${response?.error || "Unknown error"}</div>`;
    }
  });
}

function closeDiscoveryPanel() {
  document.getElementById("discoveryOverlay").style.display = "none";
  document.getElementById("discoveryPanel").style.display = "none";
}

async function addRepoFromDiscovery(repoId) {
  const config = await getStorage(["repos", "projectId", "projectName"]);
  const repo = availableRepos.find((entry) => entry.repositoryId === repoId);
  if (!repo) return;

  const repos = config.repos || [];
  if (repos.some((entry) => entry.repositoryId === repo.repositoryId)) return;

  const nextRepos = repos.concat(repo);
  await setStorage({
    repos: nextRepos,
    projectId: repo.projectId,
    projectName: repo.projectName,
  });
  UI.renderRepos(nextRepos);
  UI.renderDiscoveryResults(
    availableRepos,
    nextRepos,
    document.getElementById("repoSearchInput").value,
  );
  fetchPRs();
}

async function removeRepo(repoId) {
  const config = await getStorage(["repos", "projectId", "projectName"]);
  const repos = (config.repos || []).filter(
    (repo) => repo.repositoryId !== repoId,
  );
  const fallbackRepo = repos[0];
  await setStorage({
    repos,
    projectId: fallbackRepo?.projectId || "",
    projectName: fallbackRepo?.projectName || config.projectName || "",
  });
  UI.renderRepos(repos);
  fetchPRs();
}

async function addReminder() {
  const input = document.getElementById("reminderTimeInput");
  const time = input.value;
  if (!time) return;

  const config = await getStorage(["reminders"]);
  const reminders = config.reminders || [];
  if (reminders.includes(time)) return;

  reminders.push(time);
  reminders.sort();
  await setStorage({ reminders });
  UI.renderReminders(reminders);
}

async function removeReminder(time) {
  const config = await getStorage(["reminders"]);
  const reminders = (config.reminders || []).filter((r) => r !== time);
  await setStorage({ reminders });
  UI.renderReminders(reminders);
}

async function addTag() {
  const input = document.getElementById("tagInput");
  const tag = input.value.trim();
  if (!tag) return;

  const config = await getStorage(["urgentTags", "prData"]);
  const tags = config.urgentTags || [];
  if (tags.some((t) => t.toLowerCase() === tag.toLowerCase())) return;

  tags.push(tag);
  currentUrgentTags = tags;
  await setStorage({ urgentTags: tags });
  UI.renderTags(tags);
  if (config.prData) UI.renderDashboard(config.prData, currentUrgentTags);
  input.value = "";
}

async function removeTag(tag) {
  const config = await getStorage(["urgentTags", "prData"]);
  const tags = (config.urgentTags || []).filter((t) => t !== tag);
  currentUrgentTags = tags;
  await setStorage({ urgentTags: tags });
  UI.renderTags(tags);
  if (config.prData) UI.renderDashboard(config.prData, currentUrgentTags);
}
