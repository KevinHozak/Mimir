import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut, type User } from "firebase/auth";
import { getBytes, getStorage, ref } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDTsAPI1fEcvsLA-KyTcaYfo6ot9kySPC8",
  authDomain: "mimir-realm.firebaseapp.com",
  projectId: "mimir-realm",
  appId: "1:487827684488:web:f181a988e715cdcb7cf33d",
};
const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: "select_account" });
export const hostedAuthEnabled = import.meta.env.VITE_FIREBASE_AUTH_ENABLED === "true";
export const observeAuth = (callback: (user: User | null) => void) => onAuthStateChanged(auth, callback);
export const signInWithGoogle = () => signInWithPopup(auth, provider);
export const signOutGoogle = () => signOut(auth);
export const firebaseStorage = getStorage(firebaseApp);
export const readFirebaseJson = async <T,>(path: string): Promise<T> => JSON.parse(new TextDecoder().decode(await getBytes(ref(firebaseStorage, path), 32 * 1024 * 1024))) as T;

