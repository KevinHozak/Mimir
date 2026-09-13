import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
const approvedEmails = new Set((process.env.PUBLIC_OBSERVER_EMAILS ?? "").split(",").map(value => value.trim().toLowerCase()).filter(Boolean));
const required = process.env.PUBLIC_OBSERVER_AUTH_REQUIRED === "true";
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
if (required && (!projectId || approvedEmails.size === 0 || !clientEmail || !privateKey)) throw new Error("PUBLIC_OBSERVER_AUTH_REQUIRED needs Firebase project, approved email, and Admin credentials");
const app = projectId ? (getApps()[0] ?? initializeApp(clientEmail && privateKey ? { credential: cert({ projectId, clientEmail, privateKey }), projectId } : { projectId })) : undefined;
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

