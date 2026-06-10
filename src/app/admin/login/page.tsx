"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, saveAdminAuth, saveAdminRoles } from "@/lib/api";

const ADMIN_ROLES = ["ADMIN", "SUPER_ADMIN"];

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await api.post<{ token: string; refreshToken: string; roles: string[] }>(
        "/userApi/login", { email, password }
      );
      const hasAccess = data.roles?.some((r) => ADMIN_ROLES.includes(r));
      if (!hasAccess) {
        setError("Access denied. Only ADMIN and SUPER_ADMIN accounts can access the admin panel.");
        return;
      }
      saveAdminAuth(data.token, data.refreshToken);
      saveAdminRoles(data.roles ?? []);
      router.push("/admin/dashboard");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Login failed";
      if (msg.toLowerCase().includes("not found") || msg.toLowerCase().includes("no user")) {
        setError("No account found with this email.");
      } else if (msg.toLowerCase().includes("invalid") || msg.toLowerCase().includes("password") || msg.toLowerCase().includes("credentials")) {
        setError("Incorrect email or password.");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      {/* Background blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full -translate-y-1/2 translate-x-1/2 opacity-30"
          style={{ background: "radial-gradient(circle, rgba(109,40,217,0.12), transparent)" }} />
        <div className="absolute bottom-0 left-0 w-96 h-96 rounded-full translate-y-1/2 -translate-x-1/2 opacity-20"
          style={{ background: "radial-gradient(circle, rgba(139,92,246,0.1), transparent)" }} />
      </div>

      <div className="relative w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-3xl shadow-xl shadow-gray-100 border border-gray-100 p-8 md:p-10">
          {/* Logo */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl btn-gradient shadow-md">🥗</div>
            <span className="text-xl font-bold text-gray-900">Nutro Assist</span>
          </div>

          {/* Badge */}
          <div className="flex justify-center mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-50 border border-violet-100">
              <span className="text-base">🔐</span>
              <span className="text-xs font-semibold text-violet-600 uppercase tracking-wider">Administrator Portal</span>
            </div>
          </div>

          <h1 className="text-2xl font-extrabold text-gray-900 text-center mb-1">Admin Sign In</h1>
          <p className="text-sm text-gray-400 text-center mb-8">Restricted to ADMIN &amp; SUPER_ADMIN accounts</p>

          {/* Error banner */}
          {error && (
            <div className="anim-scale-in mb-6 flex items-start gap-3 rounded-2xl bg-red-50 border border-red-100 px-4 py-3.5">
              <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-red-500 text-xs font-bold">!</span>
              </div>
              <span className="text-sm text-red-600">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">Email address</label>
              <input type="email" required value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field" placeholder="admin@example.com" autoFocus />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">Password</label>
              <input type="password" required value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field" placeholder="••••••••" />
            </div>
            <div className="pt-1">
              <button type="submit" disabled={loading}
                className="w-full py-3.5 rounded-2xl text-sm font-bold text-white btn-gradient disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-violet-200">
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in…
                  </span>
                ) : "Sign In to Admin Panel →"}
              </button>
            </div>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-100 text-center">
            <Link href="/login"
              className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors font-medium">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Back to user login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
