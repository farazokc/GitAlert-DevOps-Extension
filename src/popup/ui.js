import { formatTime, getTimeAgo } from "./utils.mjs";

export function resetDashboard() {
  document.getElementById("statAssigned").textContent = "0";
  document.getElementById("statMyPending").textContent = "0";
  document.getElementById("statChanges").textContent = "0";
  document.getElementById("statTotal").textContent = "0";
  document.getElementById("prContent").innerHTML = "";
  document.getElementById("prLoading").style.display = "none";
  document.getElementById("statusText").textContent = "Not connected";
  document.getElementById("lastUpdate").textContent = "";
}

export function showSetup() {
  document.getElementById("setupScreen").style.display = "";
  document.getElementById("mainApp").style.display = "none";
  document.getElementById("refreshBtn").style.display = "none";
  document.getElementById("settingsBtn").style.display = "none";
}

export function showApp(config, currentUrgentTags) {
  document.getElementById("setupScreen").style.display = "none";
  document.getElementById("mainApp").style.display = "";
  document.getElementById("refreshBtn").style.display = "flex";
  document.getElementById("settingsBtn").style.display = "flex";

  renderRepos(config.repos || []);
  renderReminders(config.reminders || []);
  renderTags(currentUrgentTags);
  renderToggles(config);

  if (config.identityVerificationState === "verified" && config.username) {
    document.getElementById("userProfile").style.display = "flex";
    document.getElementById("userLogin").textContent = `@${config.username}`;
    if (config.userAvatarUrl) {
      document.getElementById("userAvatar").src = config.userAvatarUrl;
    }
  } else {
    document.getElementById("userProfile").style.display = "none";
  }

  if (config.prData) {
    renderDashboard(config.prData, currentUrgentTags);
    updateStatus(config.lastFetch);
  }

  renderIdentityStatus(config);
}

export function renderIdentityStatus(config) {
  const statusEl = document.getElementById("identityStatus");
  const confirmBtn = document.getElementById("confirmIdentityBtn");

  if (!statusEl || !confirmBtn) return;

  if (config.identityVerificationState === "matched_unconfirmed") {
    statusEl.textContent = `Matched Azure DevOps identity: ${config.username || config.userEmail}`;
    statusEl.style.display = "block";
    confirmBtn.style.display = "inline-flex";
    return;
  }

  if (config.identityVerificationState === "verified") {
    statusEl.textContent = `Verified as ${config.username || config.userEmail}`;
    statusEl.style.display = "block";
    confirmBtn.style.display = "none";
    return;
  }

  if (config.userIdentityEmail) {
    statusEl.textContent =
      "Showing all open PRs. Confirm your identity to enable personal tracking.";
    statusEl.style.display = "block";
    confirmBtn.style.display = "none";
    return;
  }

  statusEl.style.display = "none";
  confirmBtn.style.display = "none";
}

export function renderRepos(repos) {
  document.getElementById("repoCount").textContent = repos.length;
  const list = document.getElementById("repoList");
  if (repos.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="icon">📦</div>
        <h3>No repositories</h3>
        <p>Add a repository above to start tracking PRs.</p>
      </div>`;
    return;
  }

  list.innerHTML = repos
    .map((repo) => {
      return `
      <div class="repo-item">
        <div>
          <div class="repo-name">${repo.repositoryName}</div>
          <div class="repo-owner">${repo.projectName}</div>
        </div>
        <button class="btn btn-danger btn-sm repo-remove-btn" data-repo-id="${repo.repositoryId}">Remove</button>
      </div>`;
    })
    .join("");
}

export function renderReminders(reminders) {
  const list = document.getElementById("reminderList");
  if (reminders.length === 0) {
    list.innerHTML =
      '<p style="font-size:12px;color:var(--text-muted);padding:4px 0;">No reminders set.</p>';
    return;
  }
  list.innerHTML = reminders
    .map(
      (time) => `
    <div class="reminder-item">
      <span class="reminder-time">${formatTime(time)}</span>
      <button class="btn btn-danger btn-sm reminder-remove-btn" data-time="${time}">✕</button>
    </div>`,
    )
    .join("");
}

export function renderTags(tags) {
  const list = document.getElementById("tagList");
  if (tags.length === 0) {
    list.innerHTML =
      '<p style="font-size:12px;color:var(--text-muted);">No urgent tags configured.</p>';
    return;
  }
  list.innerHTML = tags
    .map(
      (tag) => `
    <span class="tag-chip">
      ${tag}
      <span class="remove tag-remove-btn" data-tag="${tag}">✕</span>
    </span>`,
    )
    .join("");
}

export function renderToggles(config) {
  const notifToggle = document.getElementById("toggleNotif");
  const urgentToggle = document.getElementById("toggleUrgent");
  if (config.notificationsEnabled === false) notifToggle.classList.remove("on");
  else notifToggle.classList.add("on");
  if (config.urgentNotificationsEnabled === false)
    urgentToggle.classList.remove("on");
  else urgentToggle.classList.add("on");
}

export function renderDashboard(data, currentUrgentTags) {
  document.getElementById("statAssigned").textContent =
    data.stats.assignedToReview;
  document.getElementById("statMyPending").textContent =
    data.stats.myPRsPending;
  document.getElementById("statChanges").textContent =
    data.stats.changesRequested;
  document.getElementById("statTotal").textContent = data.stats.totalOpen;

  const content = document.getElementById("prContent");
  let html = "";
  if (data.assignedToMe.length > 0) {
    html += `<div class="pr-section-title">🔍 Assigned to Review (${data.assignedToMe.length})</div>`;
    html += data.assignedToMe
      .map((pr) => renderPRItem(pr, "open", currentUrgentTags))
      .join("");
  }
  if (data.myPRsPending.length > 0) {
    html += `<div class="pr-section-title">⏳ My PRs Pending Review (${data.myPRsPending.length})</div>`;
    html += data.myPRsPending
      .map((pr) => renderPRItem(pr, "open", currentUrgentTags))
      .join("");
  }
  if (data.changesRequested.length > 0) {
    html += `<div class="pr-section-title">🔄 Changes Requested (${data.changesRequested.length})</div>`;
    html += data.changesRequested
      .map((pr) => renderPRItem(pr, "changes", currentUrgentTags))
      .join("");
  }
  if (!html) {
    html = `
      <div class="empty-state">
        <h3>All clear!</h3>
        <p>No PRs need your attention right now.</p>
      </div>`;
  }
  content.innerHTML = html;
}

function renderPRItem(pr, type, currentUrgentTags) {
  const icon =
    type === "changes"
      ? '<svg class="pr-icon changes" viewBox="0 0 16 16" fill="currentColor"><path d="M1.5 3.25a2.25 2.25 0 1 1 3 2.122v5.256a2.251 2.251 0 1 1-1.5 0V5.372A2.25 2.25 0 0 1 1.5 3.25Zm5.677-.177L9.573.677A.25.25 0 0 1 10 .854V2.5h1A2.5 2.5 0 0 1 13.5 5v5.628a2.251 2.251 0 1 1-1.5 0V5a1 1 0 0 0-1-1h-1v1.646a.25.25 0 0 1-.427.177L7.177 3.427a.25.25 0 0 1 0-.354Z"/></svg>'
      : '<svg class="pr-icon open" viewBox="0 0 16 16" fill="currentColor"><path d="M1.5 3.25a2.25 2.25 0 1 1 3 2.122v5.256a2.251 2.251 0 1 1-1.5 0V5.372A2.25 2.25 0 0 1 1.5 3.25Zm5.677-.177L9.573.677A.25.25 0 0 1 10 .854V2.5h1A2.5 2.5 0 0 1 13.5 5v5.628a2.251 2.251 0 1 1-1.5 0V5a1 1 0 0 0-1-1h-1v1.646a.25.25 0 0 1-.427.177L7.177 3.427a.25.25 0 0 1 0-.354Z"/></svg>';

  const labels = pr.labels
    .map((l) => {
      const isUrgent =
        pr.isUrgent ||
        currentUrgentTags.some((t) => t.toLowerCase() === l.name.toLowerCase());
      return `<span class="pr-label ${isUrgent ? "important" : "default"}">${l.name}</span>`;
    })
    .join("");

  const timeAgo = getTimeAgo(pr.createdAt);
  return `
    <div class="pr-item" data-url="${pr.url}">
      ${icon}
      <div class="pr-info">
        <div class="pr-title">${pr.title}</div>
        <div class="pr-meta">${pr.repo}#${pr.number} · ${pr.author} · ${timeAgo}</div>
        ${labels ? `<div class="pr-labels">${labels}</div>` : ""}
      </div>
    </div>`;
}

export function updateStatus(lastFetch) {
  if (lastFetch) {
    const time = new Date(lastFetch).toLocaleTimeString();
    document.getElementById("lastUpdate").textContent = `Last updated: ${time}`;
    document.getElementById("statusText").textContent = "Connected";
  }
}

export function renderDiscoveryResults(availableRepos, connectedRepos, query) {
  const container = document.getElementById("discoveryResults");
  const connectedRepoIds = new Set(
    connectedRepos.map((repo) => repo.repositoryId),
  );
  const filtered = availableRepos
    .filter((repo) =>
      `${repo.projectName} ${repo.repositoryName}`
        .toLowerCase()
        .includes(query.toLowerCase()),
    )
    .slice(0, 50);

  if (filtered.length === 0) {
    container.innerHTML =
      '<div class="discovery-empty">No matching repositories found.</div>';
    return;
  }

  container.innerHTML = filtered
    .map((repo) => {
      const isConnected = connectedRepoIds.has(repo.repositoryId);
      return `
      <div class="discovery-item ${isConnected ? "connected" : ""}" data-repo-id="${repo.repositoryId}">
        <div class="repo-full-name">${repo.projectName} / ${repo.repositoryName}</div>
        ${isConnected ? '<span class="status-badge">Connected</span>' : '<span class="add-icon">+</span>'}
      </div>`;
    })
    .join("");
}

export function showTokenError(msg) {
  const errorEl = document.getElementById("tokenError");
  errorEl.textContent = msg;
  errorEl.style.display = "block";
}
