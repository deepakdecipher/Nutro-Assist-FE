const BASE = "/backend";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token") ?? localStorage.getItem("adminToken");
}

export function getAdminToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("adminToken") ?? localStorage.getItem("token");
}

// Single in-flight refresh — prevents N parallel requests from each triggering their own refresh
let refreshPromise: Promise<void> | null = null;

async function doRefresh(): Promise<void> {
  const refreshToken = localStorage.getItem("refreshToken");
  if (!refreshToken) throw new Error("No refresh token");

  const res = await fetch(`${BASE}/userApi/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) throw new Error("Refresh failed");

  const data = await res.json() as { token: string; refreshToken: string };
  localStorage.setItem("token", data.token);
  localStorage.setItem("refreshToken", data.refreshToken);
  // Keep adminToken in sync if the user is an admin browsing the main app
  if (localStorage.getItem("adminToken")) {
    localStorage.setItem("adminToken", data.token);
    localStorage.setItem("adminRefreshToken", data.refreshToken);
  }
}

function tryRefresh(): Promise<void> {
  if (!refreshPromise) {
    refreshPromise = doRefresh().finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

function redirectToLogin(): void {
  clearAuth();
  if (typeof window !== "undefined") window.location.href = "/login";
}

async function fetchWithBody(url: string, options: RequestInit & { headers: Record<string, string> }) {
  const res = await fetch(url, options);
  const contentType = res.headers.get("content-type") ?? "";
  const data = contentType.includes("application/json") ? await res.json() : await res.text();
  return { res, data };
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  useAdminToken = false
): Promise<T> {
  const buildHeaders = (): Record<string, string> => {
    const token = useAdminToken ? getAdminToken() : getToken();
    const h: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };
    if (token) h["Authorization"] = `Bearer ${token}`;
    return h;
  };

  let { res, data } = await fetchWithBody(`${BASE}${path}`, { ...options, headers: buildHeaders() });

  // On 401, try refreshing once then retry the original request
  if (res.status === 401) {
    try {
      await tryRefresh();
    } catch {
      redirectToLogin();
      throw new Error("Session expired. Please log in again.");
    }
    ({ res, data } = await fetchWithBody(`${BASE}${path}`, { ...options, headers: buildHeaders() }));
  }

  if (!res.ok) {
    const fallback =
      res.status === 401
        ? "Session expired. Please log in again."
        : res.status === 403
          ? "Access denied."
          : "Request failed";
    const msg =
      typeof data === "object"
        ? data.message || data.error || fallback
        : (data as string) || fallback;
    // If the retry also returned 401, the refresh token itself is expired
    if (res.status === 401) redirectToLogin();
    throw new Error(msg);
  }
  return data as T;
}

export const api = {
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  get: <T>(path: string) => request<T>(path),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  adminGet: <T>(path: string) => request<T>(path, {}, true),
  adminPost: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }, true),
  adminDelete: <T>(path: string) =>
    request<T>(path, { method: "DELETE" }, true),
};

// ── Regular user auth ─────────────────────────────────────────────────────

export function saveAuth(token: string, refreshToken: string) {
  localStorage.setItem("token", token);
  localStorage.setItem("refreshToken", refreshToken);
  // Wipe any leftover admin session from a previous login on the same browser
  localStorage.removeItem("adminToken");
  localStorage.removeItem("adminRefreshToken");
  localStorage.removeItem("adminRoles");
}

export function clearAuth() {
  localStorage.removeItem("token");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("adminToken");
  localStorage.removeItem("adminRefreshToken");
  localStorage.removeItem("adminRoles");
}

export function isAuthenticated(): boolean {
  if (typeof window === "undefined") return false;
  return !!(localStorage.getItem("token") || localStorage.getItem("adminToken"));
}

// ── Admin auth ────────────────────────────────────────────────────────────

export function saveAdminAuth(token: string, refreshToken: string) {
  localStorage.setItem("adminToken", token);
  localStorage.setItem("adminRefreshToken", refreshToken);
  // Mirror into the regular token slot so admin can view the app without a separate login
  localStorage.setItem("token", token);
  localStorage.setItem("refreshToken", refreshToken);
}

export function clearAdminAuth() {
  localStorage.removeItem("adminToken");
  localStorage.removeItem("adminRefreshToken");
  localStorage.removeItem("adminRoles");
}

export function isAdminAuthenticated(): boolean {
  return !!getAdminToken();
}

export function getSavedAdminRoles(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem("adminRoles") ?? "[]");
  } catch {
    return [];
  }
}

export function saveAdminRoles(roles: string[]) {
  localStorage.setItem("adminRoles", JSON.stringify(roles));
}
