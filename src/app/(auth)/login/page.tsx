"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { api, saveAuth } from "@/lib/api";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (searchParams.get("verified") === "1") setVerified(true);
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await api.post<{ token: string; refreshToken: string }>("/userApi/login", form);
      saveAuth(data.token, data.refreshToken);
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* ── Left gradient panel ── */}
      <div className="hidden lg:flex flex-col justify-between w-[46%] relative overflow-hidden p-12"
        style={{ background: "linear-gradient(145deg, #2e1065 0%, #4c1d95 30%, #6d28d9 65%, #7c3aed 100%)" }}>

        {/* Background blobs */}
        <div className="anim-float   absolute top-0 right-0 w-80 h-80 rounded-full opacity-20 -translate-y-1/2 translate-x-1/3"
          style={{ background: "radial-gradient(circle, #a78bfa, transparent)" }} />
        <div className="anim-float-2 absolute bottom-0 left-0 w-64 h-64 rounded-full opacity-15 translate-y-1/3 -translate-x-1/4"
          style={{ background: "radial-gradient(circle, #c084fc, transparent)", animationDelay: "1s" }} />
        <div className="anim-float-3 absolute top-1/2 right-8 w-40 h-40 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #e879f9, transparent)", animationDelay: "0.5s" }} />
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 opacity-5"
          style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.15) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />

        {/* Logo */}
        <div className="anim-slide-left relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl shadow-lg"
            style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.25)" }}>
            🥗
          </div>
          <span className="text-white font-bold text-xl tracking-tight">Nutro Assist</span>
        </div>

        {/* Main content */}
        <div className="relative z-10">
          <div className="anim-slide-left delay-100 inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-6 text-xs font-semibold text-violet-200"
            style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)" }}>
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            AI-Powered Nutrition Platform
          </div>
          <h1 className="anim-slide-left delay-150 text-5xl font-extrabold text-white leading-[1.15] mb-4">
            Your smartest<br />nutrition<br />partner
          </h1>
          <p className="anim-slide-left delay-200 text-violet-200 text-base leading-relaxed mb-10 max-w-sm">
            Personalized AI diet plans, intelligent weight tracking, and a 24/7 nutrition coach — all in one place.
          </p>

          {/* Glass feature cards */}
          <div className="space-y-3">
            {[
              { icon: "🎯", title: "AI-Generated Plans",  desc: "Tailored to your goals & lifestyle",    delay: "delay-250" },
              { icon: "⚖️", title: "Smart Tracking",      desc: "Visualize your weight journey",         delay: "delay-300" },
              { icon: "🤖", title: "24/7 AI Coach",       desc: "Ask anything about nutrition",          delay: "delay-400" },
            ].map((f) => (
              <div key={f.title}
                className={`anim-slide-left ${f.delay} flex items-center gap-4 rounded-2xl p-4 transition-all hover:scale-[1.02]`}
                style={{ background: "rgba(255,255,255,0.08)", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.12)" }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                  style={{ background: "rgba(255,255,255,0.15)" }}>
                  {f.icon}
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">{f.title}</div>
                  <div className="text-xs text-violet-300">{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom stat */}
        <div className="anim-slide-left delay-500 relative z-10 rounded-2xl p-4"
          style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.10)" }}>
          <p className="text-violet-300 text-xs mb-2">Trusted by nutrition professionals</p>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-white font-bold text-lg leading-none">10k+</p>
              <p className="text-violet-400 text-xs">Users</p>
            </div>
            <div className="w-px h-8 bg-white/15" />
            <div className="text-center">
              <p className="text-white font-bold text-lg leading-none">50k+</p>
              <p className="text-violet-400 text-xs">Plans made</p>
            </div>
            <div className="w-px h-8 bg-white/15" />
            <div className="text-center">
              <p className="text-white font-bold text-lg leading-none">4.9 ★</p>
              <p className="text-violet-400 text-xs">Rating</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex-1 flex flex-col justify-center bg-white px-8 md:px-16 lg:px-20 relative overflow-hidden">
        {/* Subtle top-right blob */}
        <div className="absolute top-0 right-0 w-72 h-72 rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(139,92,246,0.06), transparent)" }} />

        {/* Mobile logo */}
        <div className="anim-fade-in lg:hidden flex items-center gap-2.5 mb-10">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shadow-md btn-gradient">🥗</div>
          <span className="text-xl font-bold text-violet-700">Nutro Assist</span>
        </div>

        <div className="w-full max-w-sm">
          <div className="anim-fade-in-up">
            <p className="text-xs font-semibold text-violet-500 uppercase tracking-widest mb-2">Sign In</p>
            <h2 className="text-3xl font-extrabold text-gray-900 mb-1">Welcome back 👋</h2>
            <p className="text-sm text-gray-400 mb-8">Enter your details to continue</p>
          </div>

          {verified && (
            <div className="anim-scale-in mb-6 flex items-center gap-3 rounded-2xl bg-green-50 border border-green-100 px-4 py-3.5">
              <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-3 h-3 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="text-sm text-green-700 font-medium">Email verified! You can now sign in.</span>
            </div>
          )}

          {error && (
            <div className="anim-scale-in mb-6 flex items-start gap-3 rounded-2xl bg-red-50 border border-red-100 px-4 py-3.5">
              <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-red-500 text-xs">!</span>
              </div>
              <span className="text-sm text-red-600">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="anim-fade-in-up delay-100">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">Email address</label>
              <input type="email" required value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="input-field" placeholder="you@example.com" />
            </div>

            <div className="anim-fade-in-up delay-150">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Password</label>
                <button type="button" className="text-xs text-violet-500 hover:text-violet-700 font-medium">Forgot password?</button>
              </div>
              <input type="password" required value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="input-field" placeholder="••••••••" />
            </div>

            <div className="anim-fade-in-up delay-200 pt-1">
              <button type="submit" disabled={loading}
                className="w-full py-3.5 rounded-2xl text-sm font-bold text-white btn-gradient disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none shadow-lg shadow-violet-200">
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in…
                  </span>
                ) : "Sign In →"}
              </button>
            </div>
          </form>

          <p className="anim-fade-in delay-400 mt-8 text-center text-sm text-gray-400">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="font-bold text-violet-600 hover:text-violet-700">Create one free</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
