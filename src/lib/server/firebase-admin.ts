/*
  Firebase for the SERVER. It uses a secret key (the service account) and is
  not limited by the security rules, so it must never be imported into a
  component. Only the files in lib/server use it.
*/
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

export function getAdminDb(): Firestore {
  if (getApps().length === 0) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (!projectId || !clientEmail || !privateKey) {
      throw new Error(
        "FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL or FIREBASE_PRIVATE_KEY is missing in .env.local",
      );
    }

    initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        /* In .env files the line breaks of the key are written as \n */
        privateKey: privateKey.replace(/\\n/g, "\n"),
      }),
    });
  }

  return getFirestore();
}
