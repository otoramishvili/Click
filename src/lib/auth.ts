/*
  The one place the forms talk to Firebase Authentication.
  Each function returns { ok: true } or { ok: false, message } with a message
  the customer can act on.
*/
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import {
  errorCode,
  firebaseAuth,
  isFirebaseConfigured,
  NOT_CONFIGURED_MESSAGE,
} from "@/lib/firebase/client";

export type AuthResult = { ok: true } | { ok: false; message: string };

function explain(error: unknown): string {
  switch (errorCode(error)) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Wrong email or password.";
    case "auth/email-already-in-use":
      return "An account with this email already exists. Log in instead.";
    case "auth/invalid-email":
      return "That email address does not look right.";
    case "auth/weak-password":
      return "That password is too easy to guess. Choose a longer one.";
    case "auth/too-many-requests":
      return "Too many attempts. Wait a few minutes and try again.";
    case "auth/network-request-failed":
      return "No connection. Check your internet and try again.";
    case "auth/operation-not-allowed":
      return "Email and password sign-in is switched off in the Firebase console.";
    default:
      return "Something went wrong. Try again.";
  }
}

export async function logIn(
  email: string,
  password: string,
): Promise<AuthResult> {
  if (!isFirebaseConfigured) return { ok: false, message: NOT_CONFIGURED_MESSAGE };
  try {
    await signInWithEmailAndPassword(firebaseAuth(), email, password);
    return { ok: true };
  } catch (error) {
    return { ok: false, message: explain(error) };
  }
}

export async function signUp(
  name: string,
  email: string,
  password: string,
): Promise<AuthResult> {
  if (!isFirebaseConfigured) return { ok: false, message: NOT_CONFIGURED_MESSAGE };
  try {
    const credential = await createUserWithEmailAndPassword(
      firebaseAuth(),
      email,
      password,
    );
    await updateProfile(credential.user, { displayName: name });
    return { ok: true };
  } catch (error) {
    return { ok: false, message: explain(error) };
  }
}

export async function logOut(): Promise<void> {
  if (!isFirebaseConfigured) return;
  await signOut(firebaseAuth());
}
