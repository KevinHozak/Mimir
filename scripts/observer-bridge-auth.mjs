export function createObserverTokenVerifier({ projectId, approvedEmails, verifyIdToken }) {
  return async authorization => {
    if (!authorization?.startsWith("Bearer ")) return null;
    try {
      const decoded = await verifyIdToken(authorization.slice("Bearer ".length));
      const email = decoded.email?.trim().toLowerCase();
      return decoded.aud === projectId
        && decoded.iss === `https://securetoken.google.com/${projectId}`
        && decoded.email_verified === true
        && email
        && approvedEmails.has(email)
        ? email
        : null;
    } catch {
      return null;
    }
  };
}

