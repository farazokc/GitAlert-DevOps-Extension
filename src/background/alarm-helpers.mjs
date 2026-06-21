export const URGENT_RE_NOTIFY_INTERVAL = 5 * 60 * 1000;

export function shouldFireReminder(config, currentTime) {
  if (config.identityVerificationState !== "verified") return false;
  if (!config.notificationsEnabled) return false;
  if (!config.reminders || config.reminders.length === 0) return false;
  if (!config.prData || config.prData.stats.assignedToReview === 0)
    return false;
  return config.reminders.includes(currentTime);
}

export function getUrgentPRsDue(
  urgentPRs,
  lastUrgentNotified,
  now,
  reNotifyInterval = URGENT_RE_NOTIFY_INTERVAL,
) {
  return urgentPRs.filter((pr) => {
    const prKey = `${pr.repo}#${pr.number}`;
    const lastNotified = lastUrgentNotified[prKey] || 0;
    return now - lastNotified > reNotifyInterval;
  });
}
