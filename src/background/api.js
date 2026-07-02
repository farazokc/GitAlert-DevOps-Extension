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
import {
  UnauthorizedError,
  hasVerifiedIdentity,
  updateAssignmentState,
  withRetry,
} from "./api-helpers.mjs";
import {
  countUnresolvedThreads,
  getEnrichmentBatch,
  getRelevantPRs,
} from "./discussion-helpers.mjs";
import { isUrgentPR } from "./urgency-helpers.mjs";

export { UnauthorizedError };

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
      throw new Error(`Azure DevOps API error: ${res.status}`);
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
      reviewedByMe: [],
      urgent: [],
      allPRs: [],
      stats: {
        assignedToReview: 0,
        myPRsPending: 0,
        changesRequested: 0,
        reviewedByMe: 0,
        urgentCount: 0,
        totalOpen: 0,
      },
    };

    const activeAssignmentKeys = new Set();
    const notifications = [];

    for (const pr of pullRequests) {
      const result = classifyPullRequest(pr, currentUser, config.organization);
      const prInfo = {
        ...result.prInfo,
        isUrgent: isUrgentPR(result.prInfo, config.urgentTags || []),
      };
      prData.allPRs.push(prInfo);

      if (isVerified && result.assignedToMe) {
        prData.assignedToMe.push(prInfo);
        prData.stats.assignedToReview++;
        activeAssignmentKeys.add(result.assignmentKey);
        notifications.push({
          assignmentKey: result.assignmentKey,
          author: prInfo.author,
          title: prInfo.title,
          url: prInfo.url,
        });
      }

      if (isVerified && result.myPRsPending) {
        prData.myPRsPending.push(prInfo);
        prData.stats.myPRsPending++;
      }

      if (isVerified && result.changesRequested) {
        prData.changesRequested.push(prInfo);
        prData.stats.changesRequested++;
      }

      if (isVerified && result.reviewedByMe) {
        prData.reviewedByMe.push(prInfo);
        prData.stats.reviewedByMe++;
      }

      // Urgent PRs also stay in assignedToMe so badge count and alarm-driven
      // notifications (checkUrgentPRs) continue to work correctly.
      if (isVerified && result.assignedToMe && prInfo.isUrgent) {
        prData.urgent.push(prInfo);
        prData.stats.urgentCount++;
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

    console.error("Error fetching Azure DevOps pull requests:", error.message);
    throw error;
  }
}

async function fetchPRDiscussions(pr, config) {
  const org = encodeURIComponent(config.organization);
  const project = encodeURIComponent(pr.projectId);
  const repo = encodeURIComponent(pr.repositoryId);
  const url = `https://dev.azure.com/${org}/${project}/_apis/git/repositories/${repo}/pullRequests/${pr.id}/threads?api-version=7.1`;
  const data = await azureFetchJson(url, config.token);
  return data.value || [];
}

export async function enrichDiscussions() {
  const config = await getConfig();
  if (!config.token || !config.organization) return;

  const prData = config.prData;
  if (!prData) return;

  const keys = getRelevantPRs(prData);
  if (keys.length === 0) return;

  const cursor = config.discussionEnrichmentCursor || 0;
  const { batch, nextCursor } = getEnrichmentBatch(keys, cursor, 10);
  const existingDiscussionData = config.discussionData || {};
  const updatedDiscussionData = { ...existingDiscussionData };

  for (const prKey of batch) {
    try {
      const parts = prKey.split("/");
      if (parts.length !== 3) {
        console.warn(`[enrichDiscussions] malformed prKey, skipping: ${prKey}`);
        continue;
      }
      const [projectId, repositoryId, idStr] = parts;
      const threads = await fetchPRDiscussions(
        { projectId, repositoryId, id: Number(idStr) },
        config,
      );
      updatedDiscussionData[prKey] = {
        unresolvedCount: countUnresolvedThreads(threads),
        fetchedAt: new Date().toISOString(),
      };
    } catch (err) {
      if (err instanceof UnauthorizedError) {
        await handleAuthError();
        return;
      }
      console.warn(`[enrichDiscussions] skipping ${prKey}:`, err.message);
    }
  }

  await setConfig({
    discussionData: updatedDiscussionData,
    discussionEnrichmentCursor: nextCursor,
  });
}
