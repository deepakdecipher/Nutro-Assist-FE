"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { api, clearAdminAuth, getSavedAdminRoles, isAdminAuthenticated } from "@/lib/api";

type UserView = "all" | "admins" | "regular";
type SortValue = "createdAt,desc" | "createdAt,asc" | "name,asc" | "name,desc";

interface DashboardSummary {
  totalUsers: number;
  totalAdmins: number;
  totalRegularUsers: number;
  totalActiveUsers?: number | null;
  totalPlans?: number | null;
  revenue?: number | null;
}

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
let summaryCache: DashboardSummary | null = null;

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
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function displayValue(value?: number | null, prefix = "") {
  if (value === null || value === undefined) return "N/A";
  return `${prefix}${new Intl.NumberFormat().format(value)}`;
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

export default function AdminDashboard() {
  const router = useRouter();
  const [accessDenied, setAccessDenied] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [summary, setSummary] = useState<DashboardSummary | null>(summaryCache);
  const [summaryLoading, setSummaryLoading] = useState(!summaryCache);
  const [summaryRefreshing, setSummaryRefreshing] = useState(false);
  const [summaryError, setSummaryError] = useState("");

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
  const inFlightSummary = useRef(false);

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

  const fetchSummary = useCallback(async (force = false) => {
    if (inFlightSummary.current) return;
    if (summaryCache && !force) {
      setSummary(summaryCache);
      setSummaryLoading(false);
      return;
    }

    inFlightSummary.current = true;
    setSummaryError("");
    setSummaryLoading(!summaryCache);
    setSummaryRefreshing(!!summaryCache);
    try {
      const data = await api.adminGet<DashboardSummary>("/api/admin/dashboard/summary");
      summaryCache = data;
      setSummary(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unable to load dashboard data. Please try again.";
      if (!handleAuthFailure(msg)) setSummaryError("Unable to load dashboard data. Please try again.");
    } finally {
      inFlightSummary.current = false;
      setSummaryLoading(false);
      setSummaryRefreshing(false);
    }
  }, [handleAuthFailure]);

  const fetchUsers = useCallback(async () => {
    inFlightUsers.current?.abort();
    const controller = new AbortController();
    inFlightUsers.current = controller;
    setUsersLoading(true);
    setUsersError("");

    const params = new URLSearchParams({
      page: String(page),
      size: "10",
      search: debouncedSearch,
      sort,
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
    if (!isAdminAuthenticated()) {
      router.replace("/admin/login");
      return;
    }
    if (!hasAdminAccess) {
      setAccessDenied(true);
      window.setTimeout(() => router.replace("/dashboard"), 1600);
      return;
    }
    fetchSummary();
  }, [fetchSummary, hasAdminAccess, router]);

  useEffect(() => {
    if (!isAdminAuthenticated() || !hasAdminAccess || accessDenied) return;
    fetchUsers();
    return () => inFlightUsers.current?.abort();
  }, [accessDenied, fetchUsers, hasAdminAccess]);

  useEffect(() => {
    setPage(0);
  }, [activeView, debouncedSearch, sort]);

  function handleSignOut() {
    clearAdminAuth();
    router.push("/login");
  }

  function handleRefresh() {
    fetchSummary(true);
    fetchUsers();
  }

  const users = pageData?.content ?? [];
  const roleCounts = useMemo(() => ({
    admins: summary?.totalAdmins ?? 0,
    regular: summary?.totalRegularUsers ?? 0,
    total: summary?.totalUsers ?? 0,
  }), [summary]);

  const stats = [
    { view: "all" as const, label: "Total Users", value: summary?.totalUsers, icon: "👥", tone: "violet" },
    { view: "admins" as const, label: "Admins", value: summary?.totalAdmins, icon: "🔐", tone: "amber" },
    { view: "regular" as const, label: "Regular Users", value: summary?.totalRegularUsers, icon: "👤", tone: "orange" },
    { view: "all" as const, label: "Active Users", value: summary?.totalActiveUsers, icon: "🛡", tone: "emerald" },
    { view: "all" as const, label: "Total Plans", value: summary?.totalPlans, icon: "▣", tone: "rose" },
    { view: "all" as const, label: "Revenue", value: summary?.revenue, prefix: "$", icon: "▤", tone: "blue" },
  ];

  if (accessDenied) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="max-w-md rounded-2xl border border-red-100 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 h-12 w-12 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center font-bold">!</div>
          <h1 className="text-2xl font-extrabold text-slate-950">Access Denied</h1>
          <p className="mt-2 text-sm text-slate-500">Only administrator accounts can access this dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <Sidebar
        collapsed={sidebarCollapsed}
        activeView={activeView}
        onCollapse={() => setSidebarCollapsed((value) => !value)}
        onUsers={(view) => setActiveView(view)}
      />

      <div className={`min-h-screen transition-all duration-300 ${sidebarCollapsed ? "lg:pl-20" : "lg:pl-72"}`}>
        <Topbar search={search} onSearch={setSearch} onSignOut={handleSignOut} />

        <main className="px-4 py-6 sm:px-6 lg:px-8">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-950">Dashboard</h1>
              <p className="mt-1 text-sm text-slate-500">Welcome back. Here&apos;s what&apos;s happening with your platform today.</p>
            </div>
            <button
              type="button"
              onClick={handleRefresh}
              disabled={summaryRefreshing || usersLoading}
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-60">
              {summaryRefreshing || usersLoading ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          {summaryError && <ErrorBanner message={summaryError} onRetry={() => fetchSummary(true)} />}

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6">
            {stats.map((item) => (
              <KpiCard
                key={item.label}
                label={item.label}
                value={summaryLoading ? undefined : item.value}
                prefix={item.prefix}
                icon={item.icon}
                tone={item.tone}
                loading={summaryLoading}
                onClick={() => setActiveView(item.view)}
                active={item.view === activeView && ["Total Users", "Admins", "Regular Users"].includes(item.label)}
              />
            ))}
          </section>

          <section className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-3">
            <ChartPanel title="User Growth" subtitle="Current result set">
              <LineChart values={growthValues(users)} />
            </ChartPanel>
            <ChartPanel title="Users by Role" subtitle={`Total ${displayValue(summary?.totalUsers)} users`}>
              <DonutChart admins={roleCounts.admins} regular={roleCounts.regular} total={roleCounts.total} />
            </ChartPanel>
            <ChartPanel title="New Users" subtitle="Current page">
              <BarChart values={barValues(users)} />
            </ChartPanel>
          </section>

          <section className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-3">
            <CompactList title="Recent Users" users={users.slice(0, 5)} action={() => setActiveView("all")} onSelect={setSelectedUser} />
            <ActiveList title="Top Active Users" users={users.filter((user) => user.status === "ACTIVE").slice(0, 5)} onSelect={setSelectedUser} />
            <SystemOverview onRefresh={handleRefresh} />
          </section>

          <section className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-950">{viewTitle(activeView)}</h2>
                <p className="mt-1 text-xs text-slate-500">Click any user row to open the details drawer.</p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <select
                  value={activeView}
                  onChange={(event) => setActiveView(event.target.value as UserView)}
                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-600 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                  aria-label="Filter users by role">
                  <option value="all">All users</option>
                  <option value="admins">Admins</option>
                  <option value="regular">Regular users</option>
                </select>
                <select
                  value={sort}
                  onChange={(event) => setSort(event.target.value as SortValue)}
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
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(current - 1, 0))}
                  disabled={usersLoading || page === 0}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50">
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setPage((current) => current + 1)}
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

function Sidebar({
  collapsed,
  activeView,
  onCollapse,
  onUsers,
}: {
  collapsed: boolean;
  activeView: UserView;
  onCollapse: () => void;
  onUsers: (view: UserView) => void;
}) {
  return (
    <aside className={`fixed inset-y-0 left-0 z-30 hidden flex-col bg-[#121244] text-white shadow-2xl shadow-violet-950/20 transition-all duration-300 lg:flex ${collapsed ? "w-20" : "w-72"}`}>
      <div className="flex h-16 items-center gap-3 px-5">
        <Image src="/nutro-assist-logo.svg" alt="Nutro Assist" width={34} height={34} className="h-9 w-9 rounded-xl object-cover" priority />
        {!collapsed && <span className="text-sm font-bold">Nutro Assist</span>}
      </div>
      <nav className="flex-1 space-y-5 overflow-y-auto px-4 pb-4">
        <SidebarButton label="Dashboard" icon="▦" active={activeView === "all"} collapsed={collapsed} onClick={() => onUsers("all")} />
        <div>
          {!collapsed && <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Administration</p>}
          <div className="space-y-1">
            <SidebarButton
              label="Users"
              icon="👥"
              active={activeView !== "admins" && activeView !== "regular"}
              collapsed={collapsed}
              onClick={() => onUsers("all")}
            />
          </div>
        </div>

        <div>
          {!collapsed && <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">AI & Content</p>}
          <div className="space-y-1">
            <Link
              href="/admin/knowledge"
              className="flex h-10 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold transition text-slate-300 hover:bg-white/10 hover:text-white">
              <span className="w-5 text-center text-xs">🧠</span>
              {!collapsed && <span className="truncate">Knowledge Base</span>}
            </Link>
          </div>
        </div>

        <div>
          {!collapsed && <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Application</p>}
          <div className="space-y-1">
            <Link
              href="/dashboard"
              className={`flex h-10 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold transition bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30 hover:text-emerald-200`}>
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
        </div>
      </nav>
      <button type="button" onClick={onCollapse} className="m-4 rounded-xl px-3 py-2 text-left text-xs font-semibold text-slate-300 transition hover:bg-white/10">
        {collapsed ? "→" : "↔ Collapse"}
      </button>
    </aside>
  );
}

function SidebarButton({ label, icon, active, collapsed, onClick }: { label: string; icon: string; active?: boolean; collapsed: boolean; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-10 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold transition ${active ? "bg-violet-600 text-white shadow-lg shadow-violet-950/25" : "text-slate-300 hover:bg-white/10 hover:text-white"}`}>
      <span className="w-5 text-center text-xs">{icon}</span>
      {!collapsed && <span className="truncate">{label}</span>}
    </button>
  );
}

function Topbar({ search, onSearch, onSignOut }: { search: string; onSearch: (value: string) => void; onSignOut: () => void }) {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur sm:px-6 lg:px-8">
      <div className="flex items-center justify-between gap-4">
        <div className="relative hidden w-full max-w-md sm:block">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">⌕</span>
          <input
            type="search"
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            placeholder="Search anything..."
            className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-20 text-sm text-slate-700 outline-none transition focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"
          />
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

function KpiCard({ label, value, icon, tone, loading, prefix = "", active, onClick }: {
  label: string;
  value?: number | null;
  icon: string;
  tone: string;
  loading: boolean;
  prefix?: string;
  active?: boolean;
  onClick: () => void;
}) {
  const toneClasses: Record<string, string> = {
    violet: "bg-violet-50 text-violet-700",
    amber: "bg-amber-50 text-amber-700",
    orange: "bg-orange-50 text-orange-700",
    emerald: "bg-emerald-50 text-emerald-700",
    rose: "bg-rose-50 text-rose-700",
    blue: "bg-blue-50 text-blue-700",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-4 focus:ring-violet-100 ${active ? "border-violet-200 ring-2 ring-violet-100" : "border-slate-200"}`}>
      <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-2xl text-lg ${toneClasses[tone]}`}>
        {icon}
      </div>
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      {loading ? <div className="mt-2 h-7 w-16 rounded-lg bg-slate-100 animate-pulse" /> : <p className="mt-1 text-2xl font-extrabold text-slate-950">{displayValue(value, prefix)}</p>}
      <p className="mt-1 text-xs font-bold text-emerald-600">{value === null || value === undefined ? "Backend unavailable" : "Live"}</p>
    </button>
  );
}

function ChartPanel({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-sm font-bold text-slate-950">{title}</h2>
        <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

function growthValues(users: AdminUser[]) {
  if (users.length === 0) return [0, 0, 0, 0, 0, 0, 0];
  return Array.from({ length: 7 }, (_, index) => users.filter((_, userIndex) => userIndex % 7 <= index).length);
}

function barValues(users: AdminUser[]) {
  return Array.from({ length: 7 }, (_, index) => users.filter((_, userIndex) => userIndex % 7 === index).length);
}

function LineChart({ values }: { values: number[] }) {
  const max = Math.max(...values, 1);
  const points = values.map((value, index) => {
    const x = 8 + index * 14;
    const y = 88 - (value / max) * 72;
    return `${x},${y}`;
  }).join(" ");

  return (
    <div className="h-44">
      <svg viewBox="0 0 100 100" className="h-full w-full" role="img" aria-label="User growth line chart">
        <defs>
          <linearGradient id="growth-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[16, 34, 52, 70, 88].map((y) => <line key={y} x1="6" x2="98" y1={y} y2={y} stroke="#e2e8f0" strokeWidth="0.5" />)}
        <polygon points={`8,88 ${points} 92,88`} fill="url(#growth-fill)" />
        <polyline points={points} fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {points.split(" ").map((point) => {
          const [cx, cy] = point.split(",");
          return <circle key={point} cx={cx} cy={cy} r="1.7" fill="#7c3aed" />;
        })}
      </svg>
    </div>
  );
}

function DonutChart({ admins, regular, total }: { admins: number; regular: number; total: number }) {
  const adminPercent = total > 0 ? Math.round((admins / total) * 100) : 0;
  const regularPercent = total > 0 ? Math.round((regular / total) * 100) : 0;
  const circumference = 2 * Math.PI * 34;

  return (
    <div className="flex h-44 items-center justify-center gap-6">
      <svg viewBox="0 0 100 100" className="h-36 w-36" role="img" aria-label="Users by role donut chart">
        <circle cx="50" cy="50" r="34" fill="none" stroke="#ede9fe" strokeWidth="14" />
        <circle cx="50" cy="50" r="34" fill="none" stroke="#8b5cf6" strokeWidth="14" strokeDasharray={`${circumference * regularPercent / 100} ${circumference}`} strokeLinecap="round" transform="rotate(-90 50 50)" />
        <circle cx="50" cy="50" r="34" fill="none" stroke="#3b82f6" strokeWidth="14" strokeDasharray={`${circumference * adminPercent / 100} ${circumference}`} strokeDashoffset={-(circumference * regularPercent / 100)} strokeLinecap="round" transform="rotate(-90 50 50)" />
        <circle cx="50" cy="50" r="20" fill="white" />
      </svg>
      <div className="space-y-3 text-xs">
        <Legend color="bg-violet-500" label="Regular Users" value={`${regular} (${regularPercent}%)`} />
        <Legend color="bg-blue-500" label="Admins" value={`${admins} (${adminPercent}%)`} />
      </div>
    </div>
  );
}

function BarChart({ values }: { values: number[] }) {
  const max = Math.max(...values, 1);
  return (
    <div className="flex h-44 items-end gap-4 px-3 pb-2">
      {values.map((value, index) => (
        <div key={index} className="flex flex-1 flex-col items-center gap-2">
          <div className="w-full rounded-t-lg bg-gradient-to-t from-violet-600 to-fuchsia-400" style={{ height: `${Math.max((value / max) * 128, value > 0 ? 16 : 4)}px` }} />
          <span className="text-[10px] font-semibold text-slate-400">D{index + 1}</span>
        </div>
      ))}
    </div>
  );
}

function Legend({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
      <span className="text-slate-500">{label}</span>
      <span className="font-bold text-slate-700">{value}</span>
    </div>
  );
}

function CompactList({ title, users, action, onSelect }: { title: string; users: AdminUser[]; action: () => void; onSelect: (user: AdminUser) => void }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-bold text-slate-950">{title}</h2>
        <button type="button" onClick={action} className="text-xs font-bold text-violet-600">View All</button>
      </div>
      <div className="space-y-3">
        {users.length === 0 ? <p className="text-sm text-slate-400">No users found.</p> : users.map((user) => (
          <button key={user.id} type="button" onClick={() => onSelect(user)} className="grid w-full grid-cols-[1fr_auto_auto] items-center gap-3 text-left text-xs">
            <span className="flex items-center gap-2 font-semibold text-slate-700"><Avatar user={user} />{user.fullName || user.email}</span>
            <span className={`rounded-full px-2 py-0.5 font-bold ${roleBadge(user.roles[0] ?? "USER")}`}>{user.roles[0] ?? "USER"}</span>
            <span className={`rounded-full px-2 py-0.5 font-bold ${statusBadge(user.status)}`}>{user.status}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function ActiveList({ title, users, onSelect }: { title: string; users: AdminUser[]; onSelect: (user: AdminUser) => void }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-bold text-slate-950">{title}</h2>
      </div>
      <div className="space-y-3">
        {users.length === 0 ? <p className="text-sm text-slate-400">No active users found.</p> : users.map((user) => (
          <button key={user.id} type="button" onClick={() => onSelect(user)} className="grid w-full grid-cols-[1fr_auto] items-center gap-3 text-left text-xs">
            <span className="font-semibold text-slate-700">{user.fullName || user.email}</span>
            <span className="text-slate-500">{formatDate(user.lastLoginAt)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function SystemOverview({ onRefresh }: { onRefresh: () => void }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-5 text-sm font-bold text-slate-950">System Overview</h2>
      <div className="space-y-4 text-xs">
        <Metric label="Server Status" value="Online" dot="bg-emerald-500" />
        <Metric label="Database" value="Healthy" dot="bg-emerald-500" />
        <div>
          <div className="mb-2 flex justify-between text-slate-500"><span>API Response</span><span>Live</span></div>
          <div className="h-2 rounded-full bg-slate-100"><div className="h-full w-4/5 rounded-full bg-violet-500" /></div>
        </div>
        <button type="button" onClick={onRefresh} className="mt-2 w-full rounded-xl border border-slate-200 py-2 font-bold text-slate-600 transition hover:bg-slate-50">Refresh Data</button>
      </div>
    </div>
  );
}

function Metric({ label, value, dot }: { label: string; value: string; dot: string }) {
  return (
    <div className="flex items-center justify-between text-slate-500">
      <span>{label}</span>
      <span className="flex items-center gap-2 font-semibold text-slate-700"><span className={`h-2 w-2 rounded-full ${dot}`} />{value}</span>
    </div>
  );
}

function UsersTable({ users, activeView, onSelect, loading }: { users: AdminUser[]; activeView: UserView; onSelect: (user: AdminUser) => void; loading: boolean }) {
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
              {activeView === "all" && <td className="px-5 py-4"><div className="flex flex-wrap gap-1">{user.roles.map((role) => <span key={role} className={`rounded-full px-2 py-0.5 text-xs font-bold ${roleBadge(role)}`}>{role}</span>)}</div></td>}
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
              <button type="button" onClick={onClose} className="h-9 w-9 rounded-xl text-slate-500 transition hover:bg-slate-100" aria-label="Close user details">×</button>
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
              ["Total Logins", user.totalLogins === null || user.totalLogins === undefined ? "-" : String(user.totalLogins)],
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
    <div className="mb-5 flex items-center justify-between gap-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3">
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
