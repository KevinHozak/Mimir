import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
const approvedEmails = new Set((process.env.PUBLIC_OBSERVER_EMAILS ?? "").split(",").map(value => value.trim().toLowerCase()).filter(Boolean));
const required = process.env.PUBLIC_OBSERVER_AUTH_REQUIRED === "true";
if (required && (!projectId || approvedEmails.size === 0)) throw new Error("PUBLIC_OBSERVER_AUTH_REQUIRED needs FIREBASE_PROJECT_ID and PUBLIC_OBSERVER_EMAILS");
const app = projectId ? (getApps()[0] ?? initializeApp({ projectId })) : undefined;
const auth = app ? getAuth(app) : undefined;

export async function verifyObserverToken(authorization: string | undefined): Promise<{ email: string } | null> {
  if (!required) return { email: "auth-disabled-local" };
  if (!auth || !authorization?.startsWith("Bearer ")) return null;
  try {
    const decoded = await auth.verifyIdToken(authorization.slice("Bearer ".length));
    const email = decoded.email?.trim().toLowerCase();
    return decoded.email_verified === true && email && approvedEmails.has(email) ? { email } : null;
  } catch { return null; }
}

export { required as observerAuthRequired };

