import { getConfig, setConfig, clearAuthSession } from "./storage.js";
import { sendNotification } from "./notifications.js";
import {
  buildBasicAuthHeader,
  classifyPullRequest,
  createBootstrapIdentity,
  findMatchingIdentity,
  normalizeRepository,
  toCanonicalIdentity,
} from "./azure.mjs";

export class UnauthorizedError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

async function withRetry(fn, retries = MAX_RETRIES) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (err instanceof UnauthorizedError) throw err;
      if (attempt === retries) throw err;

      const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
      console.warn(
        `Attempt ${attempt}/${retries} failed, retrying in ${delay}ms...`,
        err.message,
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

async function azureFetchJson(url, token) {
  return withRetry(async () => {
    const res = await fetch(url, {
      headers: {
        Authorization: buildBasicAuthHeader(token),
        Accept: "application/json",
      },
    });

    if (res.status === 401 || res.status === 203) throw new UnauthorizedError();
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Azure DevOps API error: ${res.status} ${body}`.trim());
    }

    return res.json();
  });
}

async function handleAuthError() {
  console.error("Azure DevOps token expired or invalid. Logging out...");
  await clearAuthSession();
  sendNotification(
    "Session Expired",
    "Your Azure DevOps token is no longer valid. Please log in again.",
  );
}

export async function validateAzureSession(organization, token) {
  const repositories = await azureFetchJson(
    `https://dev.azure.com/${encodeURIComponent(organization)}/_apis/git/repositories?api-version=7.1`,
    token,
  );

  return {
    repositories: (repositories.value || []).map(normalizeRepository),
  };
}

function hasVerifiedIdentity(config) {
  return config.identityVerificationState === "verified" && !!config.userEmail;
}

export async function fetchRepositories() {
  const config = await getConfig();
  if (!config.token || !config.organization) return [];

  const response = await azureFetchJson(
    `https://dev.azure.com/${encodeURIComponent(config.organization)}/_apis/git/repositories?api-version=7.1`,
    config.token,
  );

  return (response.value || []).map(normalizeRepository);
}

async function fetchProjectPullRequests(config) {
  const pageSize = 100;
  const all = [];
  let skip = 0;

  while (true) {
    const response = await azureFetchJson(
      `https://dev.azure.com/${encodeURIComponent(config.organization)}/${encodeURIComponent(config.projectName)}/_apis/git/pullrequests?searchCriteria.status=active&$top=${pageSize}&$skip=${skip}&api-version=7.1`,
      config.token,
    );

    const page = response.value || [];
    all.push(...page);

    if (page.length < pageSize) break;
    skip += pageSize;
  }

  return all;
}

function updateAssignmentState(config, assignmentKeys) {
  const knownAssignments = config.knownAssignments || [];
  const retainedAssignments = knownAssignments.filter((key) =>
    assignmentKeys.has(key),
  );

  const newAssignments = [...assignmentKeys].filter(
    (key) => !retainedAssignments.includes(key),
  );

  return {
    knownAssignments: [...retainedAssignments, ...newAssignments],
    newAssignments,
  };
}

export async function pollPullRequests() {
  const config = await getConfig();
  if (!config.token || !config.organization || !config.projectName) return null;

  try {
    const verifiedUser = {
      id: config.userId,
      descriptor: config.userDescriptor,
      uniqueName: config.username,
      emailAddress: config.userEmail,
      principalName: config.userEmail,
    };
    const bootstrapUser = createBootstrapIdentity(config.userIdentityEmail);

    const pullRequests = await fetchProjectPullRequests(config);
    const matchedIdentity = findMatchingIdentity(pullRequests, bootstrapUser);
    const isVerified = hasVerifiedIdentity(config);
    const currentUser = isVerified ? verifiedUser : bootstrapUser;
    const prData = {
      assignedToMe: [],
      myPRsPending: [],
      changesRequested: [],
      allPRs: [],
      stats: {
        assignedToReview: 0,
        myPRsPending: 0,
        changesRequested: 0,
        totalOpen: 0,
      },
    };

    const activeAssignmentKeys = new Set();
    const notifications = [];

    for (const pr of pullRequests) {
      const result = classifyPullRequest(pr, currentUser, config.organization);
      prData.allPRs.push(result.prInfo);

      if (isVerified && result.assignedToMe) {
        prData.assignedToMe.push(result.prInfo);
        prData.stats.assignedToReview++;
        activeAssignmentKeys.add(result.assignmentKey);
        notifications.push({
          assignmentKey: result.assignmentKey,
          author: result.prInfo.author,
          title: result.prInfo.title,
          url: result.prInfo.url,
        });
      }

      if (isVerified && result.myPRsPending) {
        prData.myPRsPending.push(result.prInfo);
        prData.stats.myPRsPending++;
      }

      if (isVerified && result.changesRequested) {
        prData.changesRequested.push(result.prInfo);
        prData.stats.changesRequested++;
      }
    }

    prData.stats.totalOpen = prData.allPRs.length;

    const assignmentState = updateAssignmentState(config, activeAssignmentKeys);
    const newAssignmentSet = new Set(assignmentState.newAssignments);

    if (isVerified && config.notificationsEnabled) {
      notifications.forEach((notification) => {
        if (newAssignmentSet.has(notification.assignmentKey)) {
          sendNotification(
            "New PR Review Request",
            `${notification.author} requested your review on:\n${notification.title}`,
            notification.url,
          );
        }
      });
    }

    const nextConfig = {
      prData,
      lastFetch: new Date().toISOString(),
      knownAssignments: assignmentState.knownAssignments,
    };

    if (!isVerified && matchedIdentity) {
      nextConfig.identityVerificationState = "matched_unconfirmed";
      Object.assign(nextConfig, toCanonicalIdentity(matchedIdentity));
    }

    await setConfig(nextConfig);

    const count = isVerified ? prData.stats.assignedToReview : 0;
    chrome.action.setBadgeText({ text: count > 0 ? String(count) : "" });
    chrome.action.setBadgeBackgroundColor({ color: "#3fb950" });

    return prData;
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      await handleAuthError();
      return null;
    }

    console.error("Error fetching Azure DevOps pull requests:", error);
    throw error;
  }
}
