"use client";

import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  firebaseAuth,
  firestore,
  isFirebaseConfigured,
} from "@/lib/firebase/client";

export type AuthUser = { uid: string; email: string; name: string };

type AuthState = {
  /* null when nobody is logged in */
  user: AuthUser | null;
  /* True when the user has a document in the "admins" collection */
  isAdmin: boolean;
  /* True for the first moment, while Firebase works out who is logged in */
  loading: boolean;
};

const LOGGED_OUT: AuthState = { user: null, isAdmin: false, loading: false };

const AuthContext = createContext<AuthState>({ ...LOGGED_OUT, loading: true });

/* Keeps track of who is logged in. Any component can ask with useAuth(). */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ ...LOGGED_OUT, loading: true });

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setState(LOGGED_OUT);
      return;
    }

    /* Counts login changes, so a slow "is this an admin?" answer for an earlier one is dropped */
    let latest = 0;

    return onAuthStateChanged(firebaseAuth(), async (firebaseUser) => {
      const change = ++latest;
      if (!firebaseUser) {
        setState(LOGGED_OUT);
        return;
      }

      let isAdmin = false;
      try {
        const adminDoc = await getDoc(
          doc(firestore(), "admins", firebaseUser.uid),
        );
        isAdmin = adminDoc.exists();
      } catch {
        isAdmin = false;
      }

      if (change !== latest) return;

      const email = firebaseUser.email ?? "";
      setState({
        user: {
          uid: firebaseUser.uid,
          email,
          name: firebaseUser.displayName || email.split("@")[0],
        },
        isAdmin,
        loading: false,
      });
    });
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  return useContext(AuthContext);
}
