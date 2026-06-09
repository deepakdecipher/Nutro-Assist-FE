"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, clearAdminAuth, isAdminAuthenticated } from "@/lib/api";

interface UserItem {
  id: number;
  userFullName: string;
  userName: string;
  email: string;
  roles: { roleName: string }[];
}

export default function AdminDashboard() {
  const router = useRouter();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!isAdminAuthenticated()) {
      router.replace("/admin/login");
      return;
    }
    fetchUsers();
  }, [router]);

  async function fetchUsers() {
    setLoadingUsers(true);
    setError("");
    try {
      const data = await api.adminGet<UserItem[]>("/userApi/users");
      setUsers(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load users";
      if (msg.toLowerCase().includes("unauthori") || msg.toLowerCase().includes("403") || msg.toLowerCase().includes("401")) {
        clearAdminAuth();
        router.replace("/admin/login");
      } else {
        setError(msg);
      }
    } finally {
      setLoadingUsers(false);
    }
  }

  function handleSignOut() {
    clearAdminAuth();
    router.push("/login");
  }

  const filtered = users.filter(
    (u) =>
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.userName.toLowerCase().includes(search.toLowerCase()) ||
      (u.userFullName ?? "").toLowerCase().includes(search.toLowerCase())
  );

  function roleBadge(roleName: string) {
    const colors: Record<string, string> = {
      SUPER_ADMIN: "bg-purple-100 text-purple-700",
      ADMIN: "bg-blue-100 text-blue-700",
      USER: "bg-gray-100 text-gray-600",
    };
    return colors[roleName] ?? "bg-gray-100 text-gray-600";
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg btn-gradient shadow-md">🥗</div>
          <div>
            <span className="font-bold text-gray-900 text-lg">Nutro Assist</span>
            <span className="ml-2 text-xs font-semibold text-violet-500 bg-violet-50 px-2 py-0.5 rounded-full">Admin Panel</span>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="text-sm text-gray-500 hover:text-red-500 font-medium transition-colors flex items-center gap-1">
          <span>Sign out</span>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
          {[
            { label: "Total Users", value: users.length, icon: "👥", color: "from-violet-500 to-purple-600" },
            { label: "Admins", value: users.filter(u => u.roles?.some(r => r.roleName === "ADMIN" || r.roleName === "SUPER_ADMIN")).length, icon: "🔐", color: "from-blue-500 to-indigo-600" },
            { label: "Regular Users", value: users.filter(u => u.roles?.every(r => r.roleName === "USER")).length, icon: "🙍", color: "from-emerald-500 to-teal-600" },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-2xl">{s.icon}</span>
                <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center`}>
                  <span className="text-white text-xs font-bold">{loadingUsers ? "…" : s.value}</span>
                </div>
              </div>
              <p className="text-sm text-gray-500">{s.label}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{loadingUsers ? "—" : s.value}</p>
            </div>
          ))}
        </div>

        {/* User table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-4 flex-wrap">
            <h2 className="text-lg font-bold text-gray-900">All Users</h2>
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, email or username…"
                className="input-field text-sm py-2 px-4 w-72"
              />
              <button onClick={fetchUsers}
                className="text-sm px-4 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition font-medium">
                Refresh
              </button>
            </div>
          </div>

          {error && (
            <div className="m-6 flex items-start gap-3 rounded-2xl bg-red-50 border border-red-100 px-4 py-3.5">
              <span className="text-red-500 text-xs font-bold mt-0.5">!</span>
              <span className="text-sm text-red-600">{error}</span>
            </div>
          )}

          {loadingUsers ? (
            <div className="p-8 space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-12 rounded-xl bg-gray-100 animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <p className="text-4xl mb-3">🔍</p>
              <p className="text-sm font-medium">{search ? "No users match your search." : "No users found."}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-widest">User</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-widest">Email</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-widest">Username</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-widest">Roles</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                            style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)" }}>
                            {(u.userFullName ?? u.userName ?? "?")[0].toUpperCase()}
                          </div>
                          <span className="font-medium text-gray-900">{u.userFullName || u.userName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-500">{u.email}</td>
                      <td className="px-6 py-4 text-gray-500">@{u.userName}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {u.roles?.map((r) => (
                            <span key={r.roleName} className={`text-xs font-semibold px-2 py-0.5 rounded-full ${roleBadge(r.roleName)}`}>
                              {r.roleName}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
