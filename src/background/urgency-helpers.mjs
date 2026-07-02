export function isUrgentPR(pr, urgentTags) {
  if (!urgentTags || urgentTags.length === 0) return false;
  const titleLower = (pr.title || "").toLowerCase();
  const labels = pr.labels || [];
  for (const tag of urgentTags) {
    const tagLower = String(tag ?? "").toLowerCase();
    if (labels.some((l) => (l.name || "").toLowerCase() === tagLower))
      return true;
    if (titleLower.includes(tagLower)) return true;
  }
  return false;
}
