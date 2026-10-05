/*
  Firebase for the browser: accounts, the product database and photo storage.
  The values come from .env.local (see .env.example).
*/
import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/* False until .env.local is filled in. The site then shows a setup message instead of crashing. */
export const isFirebaseConfigured = Boolean(config.apiKey && config.projectId);

export const NOT_CONFIGURED_MESSAGE =
  "Firebase is not set up yet. Add the Firebase values to .env.local (see the README) and restart the site.";

function app(): FirebaseApp {
  if (!isFirebaseConfigured) throw new Error(NOT_CONFIGURED_MESSAGE);
  return getApps().length > 0 ? getApp() : initializeApp(config);
}

/* Call these inside event handlers and effects, not at the top of a file. */
export const firebaseAuth = () => getAuth(app());
export const firestore = () => getFirestore(app());
export const firebaseStorage = () => getStorage(app());

/* Firebase errors carry a code like "auth/invalid-credential" or "permission-denied". */
export function errorCode(error: unknown): string {
  if (typeof error === "object" && error !== null && "code" in error) {
    return String((error as { code: unknown }).code);
  }
  return "";
}
