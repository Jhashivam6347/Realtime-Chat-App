export const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

const ACCESS_TOKEN_KEY = "token";
const REFRESH_TOKEN_KEY = "refreshToken";
const AUTH_EVENT = "chat-auth-updated";

let refreshRequest;

function emitAuthChange() {
  window.dispatchEvent(new Event(AUTH_EVENT));
}

export function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function saveSession(session) {
  localStorage.setItem(ACCESS_TOKEN_KEY, session.token);
  localStorage.setItem(REFRESH_TOKEN_KEY, session.refreshToken);
  if (session.user?.name) localStorage.setItem("userName", session.user.name);
  emitAuthChange();
}

export function clearSession() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem("userName");
  emitAuthChange();
}

export function authHeaders(headers = {}) {
  const token = getAccessToken();
  return {
    ...headers,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export function refreshSession() {
  if (refreshRequest) return refreshRequest;

  const accessToken = getAccessToken();
  const refreshToken = getRefreshToken();
  if (!accessToken && !refreshToken) {
    return Promise.reject(new Error("No saved session"));
  }

  refreshRequest = fetch(`${API_URL}/auth/refresh`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify({ refreshToken }),
  })
    .then(async (response) => {
      const session = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (response.status === 401) clearSession();
        throw new Error(session.msg || "Could not restore the session");
      }
      saveSession(session);
      return session;
    })
    .finally(() => {
      refreshRequest = undefined;
    });

  return refreshRequest;
}

async function request(path, options) {
  const headers = new Headers(options.headers || {});
  if (getAccessToken()) {
    headers.set("Authorization", `Bearer ${getAccessToken()}`);
  }

  const response = await fetch(`${API_URL}${path}`, {
    cache: "no-store",
    ...options,
    headers,
  });
  const data = await response.json().catch(() => ({}));
  return { response, data };
}

export async function apiRequest(path, options = {}) {
  let { response, data } = await request(path, options);
  const shouldRefresh = response.status === 401 &&
    path !== "/login" &&
    path !== "/signup" &&
    path !== "/auth/refresh" &&
    path !== "/auth/logout" &&
    (getRefreshToken() || getAccessToken());

  if (shouldRefresh) {
    await refreshSession();
    ({ response, data } = await request(path, options));
  }

  if (!response.ok) {
    throw new Error(data.msg || `Request failed (${response.status})`);
  }

  return data;
}

export async function endSession() {
  const refreshToken = getRefreshToken();

  try {
    if (refreshToken) {
      await fetch(`${API_URL}/auth/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
    }
  } catch (error) {
    console.error("Could not revoke the server session:", error);
  } finally {
    clearSession();
  }
}
