import { useEffect, useMemo, useState } from "react";
import { AuthContext } from "./AuthContext";
import {
  clearSession,
  getAccessToken,
  getRefreshToken,
  refreshSession,
  saveSession,
} from "../lib/api";

const AUTH_EVENT = "chat-auth-updated";

function decodeUser(token) {
  try {
    const encoded = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(encoded.padEnd(Math.ceil(encoded.length / 4) * 4, "=")));
    return { id: payload.id, name: payload.name, email: payload.email };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [status, setStatus] = useState(() =>
    getAccessToken() || getRefreshToken() ? "loading" : "unauthenticated"
  );
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);

  useEffect(() => {
    let active = true;
    const syncSession = () => {
      const token = getAccessToken();
      setAccessToken(token);
      setUser(token ? decodeUser(token) : null);
      setStatus(token ? "authenticated" : "unauthenticated");
    };

    window.addEventListener(AUTH_EVENT, syncSession);
    if (getAccessToken() || getRefreshToken()) {
      refreshSession()
        .then((session) => {
          if (!active) return;
          setAccessToken(session.token);
          setUser(session.user);
          setStatus("authenticated");
        })
        .catch(() => {
          if (active) {
            setAccessToken(null);
            setUser(null);
            setStatus("unauthenticated");
          }
        });
    }

    return () => {
      active = false;
      window.removeEventListener(AUTH_EVENT, syncSession);
    };
  }, []);

  useEffect(() => {
    if (status !== "authenticated" || !accessToken) return undefined;
    let expiresAt = 0;
    try {
      const encoded = accessToken.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
      expiresAt = JSON.parse(atob(encoded.padEnd(Math.ceil(encoded.length / 4) * 4, "="))).exp * 1000;
    } catch {
      return undefined;
    }

    const refreshIn = Math.max(expiresAt - Date.now() - 60_000, 5_000);
    const timer = window.setTimeout(() => {
      refreshSession().catch((error) => {
        if (getAccessToken() && !getRefreshToken()) {
          clearSession();
        } else {
          console.error("Could not refresh the session:", error);
          setStatus("unauthenticated");
          setUser(null);
          setAccessToken(null);
        }
      });
    }, refreshIn);

    return () => window.clearTimeout(timer);
  }, [accessToken, status]);

  const value = useMemo(() => ({
    status,
    user,
    accessToken,
    signIn(session) {
      saveSession(session);
    },
    signOut() {
      clearSession();
    },
  }), [accessToken, status, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
