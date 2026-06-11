const BASE = "/backend";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token") ?? localStorage.getItem("adminToken");
}

export function getAdminToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("adminToken") ?? localStorage.getItem("token");
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  useAdminToken = false
): Promise<T> {
  const token = useAdminToken ? getAdminToken() : getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  const contentType = res.headers.get("content-type") ?? "";
  const data = contentType.includes("application/json")
    ? await res.json()
    : await res.text();
  if (!res.ok) {
    const fallback =
      res.status === 401
        ? "Unauthorized. Please log in again."
        : res.status === 403
          ? "Access denied."
          : "Request failed";
    const msg =
      typeof data === "object"
        ? data.message || data.error || fallback
        : (data as string) || fallback;
    throw new Error(msg);
  }
  return data as T;
}

export const api = {
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  get: <T>(path: string) => request<T>(path),
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
}

export function clearAuth() {
  localStorage.removeItem("token");
  localStorage.removeItem("refreshToken");
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
