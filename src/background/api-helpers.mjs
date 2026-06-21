export class UnauthorizedError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export function hasVerifiedIdentity(config) {
  return config.identityVerificationState === "verified" && !!config.userEmail;
}

export function updateAssignmentState(config, assignmentKeys) {
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

const MAX_RETRIES = 3;

export async function withRetry(fn, retries = MAX_RETRIES, baseDelay = 1000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (err instanceof UnauthorizedError) throw err;
      if (attempt === retries) throw err;
      const delay = baseDelay * Math.pow(2, attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}
