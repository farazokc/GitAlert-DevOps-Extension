export function getRelevantPRs(prData) {
  if (!prData) return [];
  const seen = new Map();
  for (const bucket of ["assignedToMe", "myPRsPending", "changesRequested"]) {
    for (const pr of prData[bucket] || []) {
      const key = `${pr.projectId}/${pr.repositoryId}/${pr.id}`;
      seen.set(key, true);
    }
  }
  return Array.from(seen.keys());
}

export function getEnrichmentBatch(prKeys, cursor, cap = 10) {
  if (!prKeys.length || cursor >= prKeys.length) {
    return { batch: [], nextCursor: 0 };
  }
  const batch = prKeys.slice(cursor, cursor + cap);
  const nextCursor = cursor + cap >= prKeys.length ? 0 : cursor + cap;
  return { batch, nextCursor };
}

export function countUnresolvedThreads(threads) {
  return threads.filter((t) => t.status === "active" || t.status === "pending")
    .length;
}
