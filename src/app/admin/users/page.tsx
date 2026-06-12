"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { api, clearAdminAuth, getSavedAdminRoles, isAdminAuthenticated } from "@/lib/api";

type UserView = "all" | "admins" | "regular";
type SortValue = "createdAt,desc" | "createdAt,asc" | "name,asc" | "name,desc";

interface AdminUser {
  id: number;
  fullName: string;
  email: string;
  roles: string[];
  status: string;
  createdAt?: string | null;
  updatedAt?: string | null;
  phone?: string | null;
  address?: string | null;
  lastLoginAt?: string | null;
  totalLogins?: number | null;
}

interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

const ADMIN_ROLES = ["ADMIN", "SUPER_ADMIN"];

function useDebouncedValue(value: string, delay = 400) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

function userEndpoint(view: UserView) {
  if (view === "admins") return "/api/admin/users/admins";
  if (view === "regular") return "/api/admin/users/regular";
  return "/api/admin/users";
}

function viewTitle(view: UserView) {
  if (view === "admins") return "Administrator Accounts";
  if (view === "regular") return "Regular Users";
  return "Users List";
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  }).format(new Date(value));
}

function initials(user?: Pick<AdminUser, "fullName" | "email"> | null) {
  const source = user?.fullName || user?.email || "?";
  return source.trim().charAt(0).toUpperCase();
}

function roleBadge(roleName: string) {
  const colors: Record<string, string> = {
    SUPER_ADMIN: "bg-fuchsia-100 text-fuchsia-700",
    ADMIN: "bg-blue-100 text-blue-700",
    USER: "bg-violet-100 text-violet-700",
  };
  return colors[roleName] ?? "bg-gray-100 text-gray-600";
}

function statusBadge(status: string) {
  return status === "ACTIVE"
    ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"
    : "bg-amber-50 text-amber-700 ring-1 ring-amber-100";
}

export default function AdminUsersPage() {
  const router = useRouter();
  const [accessDenied, setAccessDenied] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const [activeView, setActiveView] = useState<UserView>("all");
  const [pageData, setPageData] = useState<PageResponse<AdminUser> | null>(null);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState("");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);
  const [page, setPage] = useState(0);
  const [sort, setSort] = useState<SortValue>("createdAt,desc");
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const inFlightUsers = useRef<AbortController | null>(null);

  const hasAdminAccess = useMemo(() => {
    const roles = getSavedAdminRoles();
    if (roles.length === 0) return true;
    return roles.some((role) => ADMIN_ROLES.includes(role));
  }, []);

  const handleAuthFailure = useCallback((message: string) => {
    const normalized = message.toLowerCase();
    if (normalized.includes("403") || normalized.includes("access denied")) {
      setAccessDenied(true);
      window.setTimeout(() => router.replace("/dashboard"), 1600);
      return true;
    }
    if (normalized.includes("401") || normalized.includes("unauthori") || normalized.includes("session expired")) {
      clearAdminAuth();
      router.replace("/admin/login");
      return true;
    }
    return false;
  }, [router]);

  const fetchUsers = useCallback(async () => {
    inFlightUsers.current?.abort();
    const controller = new AbortController();
    inFlightUsers.current = controller;
    setUsersLoading(true);
    setUsersError("");

    const params = new URLSearchParams({
      page: String(page), size: "10", search: debouncedSearch, sort,
    });

    try {
      const data = await api.adminGet<PageResponse<AdminUser>>(`${userEndpoint(activeView)}?${params.toString()}`);
      if (!controller.signal.aborted) setPageData(data);
    } catch (err: unknown) {
      if (controller.signal.aborted) return;
      const msg = err instanceof Error ? err.message : "Unable to load users. Please try again.";
      if (!handleAuthFailure(msg)) setUsersError("Unable to load users. Please try again.");
    } finally {
      if (!controller.signal.aborted) setUsersLoading(false);
    }
  }, [activeView, debouncedSearch, handleAuthFailure, page, sort]);

  useEffect(() => {
    if (!isAdminAuthenticated()) { router.replace("/admin/login"); return; }
    if (!hasAdminAccess) {
      setAccessDenied(true);
      window.setTimeout(() => router.replace("/dashboard"), 1600);
      return;
    }
  }, [hasAdminAccess, router]);

  useEffect(() => {
    if (!isAdminAuthenticated() || !hasAdminAccess || accessDenied) return;
    fetchUsers();
    return () => inFlightUsers.current?.abort();
  }, [accessDenied, fetchUsers, hasAdminAccess]);

  useEffect(() => { setPage(0); }, [activeView, debouncedSearch, sort]);

  function handleSignOut() {
    clearAdminAuth();
    router.push("/login");
  }

  const users = pageData?.content ?? [];

  if (accessDenied) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="max-w-md rounded-2xl border border-red-100 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 h-12 w-12 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center font-bold">!</div>
          <h1 className="text-2xl font-extrabold text-slate-950">Access Denied</h1>
          <p className="mt-2 text-sm text-slate-500">Only administrator accounts can access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <Sidebar collapsed={sidebarCollapsed} onCollapse={() => setSidebarCollapsed((v) => !v)} />

      <div className={`min-h-screen transition-all duration-300 ${sidebarCollapsed ? "lg:pl-20" : "lg:pl-72"}`}>
        <Topbar search={search} onSearch={setSearch} onSignOut={handleSignOut} />

        <main className="px-4 py-6 sm:px-6 lg:px-8">
          {/* Page header with logo */}
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#121244] shadow-lg shadow-violet-950/20">
                <Image src="/nutro-assist-logo.svg" alt="Nutro Assist" width={36} height={36} className="h-9 w-9 object-contain" priority />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight text-slate-950">Users</h1>
                <p className="mt-0.5 text-sm text-slate-500">Manage all platform users and accounts.</p>
              </div>
            </div>
            <button type="button" onClick={fetchUsers} disabled={usersLoading}
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-60">
              {usersLoading ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          {/* Recent Users + Top Active Users panels */}
          <section className="grid grid-cols-1 gap-5 xl:grid-cols-3">
            <CompactList
              title="Recent Users"
              users={users.slice(0, 5)}
              onSelect={setSelectedUser}
            />
            <ActiveList
              title="Top Active Users"
              users={users.filter((u) => u.status === "ACTIVE").slice(0, 5)}
              onSelect={setSelectedUser}
            />
          </section>

          {/* Full users table */}
          <section className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-950">{viewTitle(activeView)}</h2>
                <p className="mt-1 text-xs text-slate-500">Click any user row to open the details drawer.</p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <select value={activeView} onChange={(e) => setActiveView(e.target.value as UserView)}
                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-600 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                  aria-label="Filter users by role">
                  <option value="all">All users</option>
                  <option value="admins">Admins</option>
                  <option value="regular">Regular users</option>
                </select>
                <select value={sort} onChange={(e) => setSort(e.target.value as SortValue)}
                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-600 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                  aria-label="Sort users">
                  <option value="createdAt,desc">Newest first</option>
                  <option value="createdAt,asc">Oldest first</option>
                  <option value="name,asc">Name A-Z</option>
                  <option value="name,desc">Name Z-A</option>
                </select>
              </div>
            </div>

            {usersError && <div className="p-5"><ErrorBanner message={usersError} onRetry={fetchUsers} /></div>}

            {usersLoading && !pageData ? (
              <TableSkeleton />
            ) : users.length === 0 ? (
              <EmptyState />
            ) : (
              <UsersTable users={users} activeView={activeView} onSelect={setSelectedUser} loading={usersLoading} />
            )}

            <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-slate-500">
                Page {(pageData?.page ?? page) + 1} of {Math.max(pageData?.totalPages ?? 1, 1)}
              </p>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setPage((c) => Math.max(c - 1, 0))}
                  disabled={usersLoading || page === 0}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50">
                  Previous
                </button>
                <button type="button" onClick={() => setPage((c) => c + 1)}
                  disabled={usersLoading || !pageData || page + 1 >= pageData.totalPages}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50">
                  Next
                </button>
              </div>
            </div>
          </section>
        </main>
      </div>

      <UserDrawer user={selectedUser} onClose={() => setSelectedUser(null)} />
    </div>
  );
}

function Sidebar({ collapsed, onCollapse }: { collapsed: boolean; onCollapse: () => void }) {
  return (
    <aside className={`fixed inset-y-0 left-0 z-30 hidden flex-col bg-[#121244] text-white shadow-2xl shadow-violet-950/20 transition-all duration-300 lg:flex ${collapsed ? "w-20" : "w-72"}`}>
      <div className="flex h-16 items-center gap-3 px-5">
        <Image src="/nutro-assist-logo.svg" alt="Nutro Assist" width={34} height={34} className="h-9 w-9 rounded-xl object-cover" priority />
        {!collapsed && <span className="text-sm font-bold">Nutro Assist</span>}
      </div>
      <nav className="flex-1 space-y-5 overflow-y-auto px-4 pb-4">
        <Link href="/admin/dashboard"
          className="flex h-10 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold transition text-slate-300 hover:bg-white/10 hover:text-white">
          <span className="w-5 text-center text-xs">▦</span>
          {!collapsed && <span className="truncate">Dashboard</span>}
        </Link>
        <div>
          {!collapsed && <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Administration</p>}
          <Link href="/admin/users"
            className="flex h-10 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold transition bg-violet-600 text-white shadow-lg shadow-violet-950/25">
            <span className="w-5 text-center text-xs">👥</span>
            {!collapsed && <span className="truncate">Users</span>}
          </Link>
        </div>
        <div>
          {!collapsed && <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Application</p>}
          <Link href="/dashboard"
            className="flex h-10 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold transition bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30 hover:text-emerald-200">
            <span className="w-5 text-center text-xs">🚀</span>
            {!collapsed && (
              <span className="flex flex-1 items-center justify-between truncate">
                View App
                <svg className="h-3 w-3 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </span>
            )}
          </Link>
        </div>
      </nav>
      <button type="button" onClick={onCollapse}
        className="m-4 rounded-xl px-3 py-2 text-left text-xs font-semibold text-slate-300 transition hover:bg-white/10">
        {collapsed ? "→" : "↔ Collapse"}
      </button>
    </aside>
  );
}

function Topbar({ search, onSearch, onSignOut }: { search: string; onSearch: (v: string) => void; onSignOut: () => void }) {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur sm:px-6 lg:px-8">
      <div className="flex items-center justify-between gap-4">
        <div className="relative hidden w-full max-w-md sm:block">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">⌕</span>
          <input type="search" value={search} onChange={(e) => onSearch(e.target.value)}
            placeholder="Search users..."
            className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-20 text-sm text-slate-700 outline-none transition focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100" />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-400">Ctrl + K</span>
        </div>
        <div className="ml-auto flex items-center gap-4">
          <button type="button" className="relative h-10 w-10 rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50" aria-label="Notifications">
            🔔
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
          </button>
          <button type="button" onClick={onSignOut} className="flex items-center gap-3 rounded-xl px-2 py-1.5 transition hover:bg-slate-50">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-500 text-sm font-bold text-white">A</span>
            <span className="hidden text-left sm:block">
              <span className="block text-sm font-bold text-slate-800">Administrator</span>
              <span className="block text-xs text-slate-500">Super Admin</span>
            </span>
            <span className="text-slate-400">⌄</span>
          </button>
        </div>
      </div>
    </header>
  );
}

function CompactList({ title, users, onSelect }: { title: string; users: AdminUser[]; onSelect: (u: AdminUser) => void }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-sm font-bold text-slate-950">{title}</h2>
      <div className="space-y-3">
        {users.length === 0
          ? <p className="text-sm text-slate-400">No users found.</p>
          : users.map((user) => (
            <button key={user.id} type="button" onClick={() => onSelect(user)}
              className="grid w-full grid-cols-[1fr_auto_auto] items-center gap-3 text-left text-xs">
              <span className="flex items-center gap-2 font-semibold text-slate-700">
                <Avatar user={user} />{user.fullName || user.email}
              </span>
              <span className={`rounded-full px-2 py-0.5 font-bold ${roleBadge(user.roles[0] ?? "USER")}`}>{user.roles[0] ?? "USER"}</span>
              <span className={`rounded-full px-2 py-0.5 font-bold ${statusBadge(user.status)}`}>{user.status}</span>
            </button>
          ))}
      </div>
    </div>
  );
}

function ActiveList({ title, users, onSelect }: { title: string; users: AdminUser[]; onSelect: (u: AdminUser) => void }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-sm font-bold text-slate-950">{title}</h2>
      <div className="space-y-3">
        {users.length === 0
          ? <p className="text-sm text-slate-400">No active users found.</p>
          : users.map((user) => (
            <button key={user.id} type="button" onClick={() => onSelect(user)}
              className="grid w-full grid-cols-[1fr_auto] items-center gap-3 text-left text-xs">
              <span className="font-semibold text-slate-700">{user.fullName || user.email}</span>
              <span className="text-slate-500">{formatDate(user.lastLoginAt)}</span>
            </button>
          ))}
      </div>
    </div>
  );
}

function UsersTable({ users, activeView, onSelect, loading }: { users: AdminUser[]; activeView: UserView; onSelect: (u: AdminUser) => void; loading: boolean }) {
  return (
    <div className="relative overflow-x-auto">
      {loading && <div className="absolute inset-x-0 top-0 h-1 bg-violet-100"><div className="h-full w-1/3 animate-pulse bg-violet-500" /></div>}
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100">
            <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-slate-400">Full Name</th>
            <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-slate-400">Email Address</th>
            {activeView === "all" && <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-slate-400">Role</th>}
            <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-slate-400">Status</th>
            <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-slate-400">Created At</th>
            {activeView === "all" && <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-slate-400">Last Updated At</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {users.map((user) => (
            <tr key={user.id} onClick={() => onSelect(user)} className="cursor-pointer transition hover:bg-violet-50/40">
              <td className="px-5 py-4"><span className="flex items-center gap-3 font-semibold text-slate-800"><Avatar user={user} />{user.fullName || "Unnamed user"}</span></td>
              <td className="px-5 py-4 text-slate-500">{user.email}</td>
              {activeView === "all" && <td className="px-5 py-4"><div className="flex flex-wrap gap-1">{user.roles.map((r) => <span key={r} className={`rounded-full px-2 py-0.5 text-xs font-bold ${roleBadge(r)}`}>{r}</span>)}</div></td>}
              <td className="px-5 py-4"><span className={`rounded-full px-2 py-0.5 text-xs font-bold ${statusBadge(user.status)}`}>{user.status}</span></td>
              <td className="px-5 py-4 text-slate-500">{formatDate(user.createdAt)}</td>
              {activeView === "all" && <td className="px-5 py-4 text-slate-500">{formatDate(user.updatedAt)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function UserDrawer({ user, onClose }: { user: AdminUser | null; onClose: () => void }) {
  return (
    <div className={`fixed inset-0 z-50 ${user ? "pointer-events-auto" : "pointer-events-none"}`} aria-hidden={!user}>
      <div className={`absolute inset-0 bg-slate-950/20 transition-opacity ${user ? "opacity-100" : "opacity-0"}`} onClick={onClose} />
      <aside className={`absolute right-0 top-0 h-full w-full max-w-md overflow-y-auto border-l border-slate-200 bg-white shadow-2xl transition-transform duration-300 ${user ? "translate-x-0" : "translate-x-full"}`}>
        {user && (
          <div className="p-6">
            <div className="mb-6 flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="text-base font-bold text-slate-950">User Details</h2>
              <button type="button" onClick={onClose} className="h-9 w-9 rounded-xl text-slate-500 transition hover:bg-slate-100" aria-label="Close">×</button>
            </div>
            <div className="mb-6 flex items-center gap-4 border-b border-slate-100 pb-6">
              <Avatar user={user} large />
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-slate-900">{user.fullName || user.email}</p>
                <p className="text-xs text-slate-500">{user.roles.join(", ") || "USER"}</p>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${statusBadge(user.status)}`}>{user.status}</span>
            </div>
            <DetailSection title="Basic Information" rows={[
              ["Full Name", user.fullName || "-"],
              ["Email", user.email],
              ["Role", user.roles.join(", ") || "-"],
              ["Phone", user.phone || "-"],
              ["Status", user.status],
              ["Address", user.address || "-"],
            ]} />
            <DetailSection title="Account Information" rows={[
              ["Created At", formatDate(user.createdAt)],
              ["Updated At", formatDate(user.updatedAt)],
              ["Last Login", formatDate(user.lastLoginAt)],
            ]} />
            <DetailSection title="Activity Summary" rows={[
              ["Total Logins", user.totalLogins == null ? "-" : String(user.totalLogins)],
              ["Last Activity", formatDate(user.lastLoginAt)],
            ]} />
            <button type="button" onClick={onClose} className="mt-6 w-full rounded-xl border border-slate-200 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50">Close</button>
          </div>
        )}
      </aside>
    </div>
  );
}

function DetailSection({ title, rows }: { title: string; rows: [string, string][] }) {
  return (
    <section className="border-b border-slate-100 py-5">
      <h3 className="mb-4 text-sm font-bold text-slate-950">{title}</h3>
      <div className="space-y-3">
        {rows.map(([label, value]) => (
          <div key={label} className="grid grid-cols-[120px_1fr] gap-4 text-xs">
            <span className="font-semibold text-slate-500">{label}</span>
            <span className="break-words text-slate-800">{value}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function Avatar({ user, large = false }: { user: AdminUser; large?: boolean }) {
  return (
    <span className={`flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-500 font-bold text-white ${large ? "h-12 w-12 text-lg" : "h-8 w-8 text-xs"}`}>
      {initials(user)}
    </span>
  );
}

function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3">
      <span className="text-sm font-medium text-red-700">{message}</span>
      <button type="button" onClick={onRetry} className="text-sm font-bold text-red-800">Retry</button>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="p-12 text-center">
      <Image src="/nutro-assist-logo.svg" alt="" width={104} height={59} className="mx-auto mb-4 h-auto w-24 opacity-40" />
      <p className="text-sm font-semibold text-slate-500">No users found.</p>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="p-5 space-y-3">
      {[1, 2, 3, 4, 5].map((item) => (
        <div key={item} className="grid grid-cols-5 gap-4">
          <div className="col-span-2 h-12 rounded-xl bg-slate-100 animate-pulse" />
          <div className="h-12 rounded-xl bg-slate-100 animate-pulse" />
          <div className="h-12 rounded-xl bg-slate-100 animate-pulse" />
          <div className="h-12 rounded-xl bg-slate-100 animate-pulse" />
        </div>
      ))}
    </div>
  );
}
