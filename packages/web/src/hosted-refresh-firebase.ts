import { deleteApp, initializeApp, type FirebaseOptions } from "firebase/app";
import { browserPopupRedirectResolver, GoogleAuthProvider, initializeAuth, inMemoryPersistence, onIdTokenChanged, signInWithPopup, signOut } from "firebase/auth";

/** Explicit construction only; never imports or signs out the observer's default app. */
export function createIsolatedRefreshFirebase(config: FirebaseOptions, name: string) {
  if (config.projectId !== "mimir-realm" || !/^mimir-refresh-[a-z0-9-]+$/.test(name)) throw new Error("Isolated Mimir Firebase app required");
  const app = initializeApp(config, name);
  const auth = initializeAuth(app, { persistence: inMemoryPersistence, popupRedirectResolver: browserPopupRedirectResolver });
  return {
    signIn: () => signInWithPopup(auth, new GoogleAuthProvider()),
    async capture() {
      if (!auth.currentUser) throw new Error("Sign-in required");
      const result = await auth.currentUser.getIdTokenResult();
      return { token: result.token, expiresAt: Date.parse(result.expirationTime) };
    },
    async getToken(force = false) {
      if (!auth.currentUser) throw new Error("Sign-in required");
      return auth.currentUser.getIdToken(force);
    },
    observe(callback: () => void) {
      let initial = true;
      return onIdTokenChanged(auth, () => { if (initial) initial = false; else callback(); });
    },
    async dispose() { try { await signOut(auth); } finally { await deleteApp(app); } },
  };
}
