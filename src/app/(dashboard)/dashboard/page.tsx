"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { clearAuth, isAuthenticated, api } from "@/lib/api";
import { Sidebar } from "@/components/Sidebar";

interface DietPlan { id: number; planStatus: string; planType: string; startDate: string; }
interface WeightLog { id: number; weight: number; logDate: string; }

/* ── Mini sparkline ─────────────────────────────── */
function MiniSparkline({ values, color = "#7c3aed" }: { values: number[]; color?: string }) {
  if (values.length < 2) return null;
  const W = 60, H = 24;
  const min = Math.min(...values), max = Math.max(...values), r = max - min || 1;
  const pts = values.map((v, i) => ({
    x: (i / (values.length - 1)) * W,
    y: H - ((v - min) / r) * (H - 4) - 2,
  }));
  let d = `M${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const mx = (pts[i - 1].x + pts[i].x) / 2;
    d += ` C${mx} ${pts[i - 1].y} ${mx} ${pts[i].y} ${pts[i].x} ${pts[i].y}`;
  }
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-14 h-5" preserveAspectRatio="none">
      <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" className="draw-line" />
    </svg>
  );
}

/* ── Shimmer skeleton ──────────────────────────── */
function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border p-5" style={{ borderColor: "rgba(139,92,246,0.07)" }}>
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 rounded-xl shimmer" />
        <div className="w-14 h-4 rounded-full shimmer" />
      </div>
      <div className="w-16 h-2.5 rounded shimmer mb-2.5" />
      <div className="w-24 h-6 rounded shimmer" />
    </div>
  );
}

/* ── Greeting ──────────────────────────────────── */
function getGreeting() {
  const h = new Date().getHours();
  if (h < 6)  return { text: "Good night", emoji: "🌙" };
  if (h < 12) return { text: "Good morning", emoji: "🌅" };
  if (h < 18) return { text: "Good afternoon", emoji: "☀️" };
  return { text: "Good evening", emoji: "🌆" };
}

const STAGGER = ["delay-50", "delay-100", "delay-150", "delay-200"];

const TIPS = [
  { icon: "💧", title: "Stay hydrated", body: "Drink 8–10 glasses of water daily to support metabolism and digestion." },
  { icon: "🥦", title: "Eat the rainbow", body: "Including colorful vegetables provides a wide range of vitamins and antioxidants." },
  { icon: "⏰", title: "Meal timing matters", body: "Eating at consistent times helps regulate blood sugar and hunger hormones." },
  { icon: "🛌", title: "Sleep & nutrition", body: "Poor sleep increases appetite by up to 24%. Aim for 7–9 hours nightly." },
];

export default function DashboardPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dietPlans, setDietPlans] = useState<DietPlan[]>([]);
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [tipIdx] = useState(() => Math.floor(Math.random() * TIPS.length));
  const greeting = getGreeting();

  useEffect(() => {
    setMounted(true);
    if (!isAuthenticated()) { router.replace("/login"); return; }
    Promise.all([
      api.get<DietPlan[]>("/api/diet-plans/history").catch(() => []),
      api.get<WeightLog[]>("/api/weight-logs").catch(() => []),
    ]).then(([plans, logs]) => {
      setDietPlans(plans);
      setWeightLogs(logs);
      setLoadingData(false);
    });
  }, [router]);

  if (!mounted) return null;

  const stats = [
    {
      label: "Active Plan",
      value: dietPlans.length > 0 ? (dietPlans[0].planType || "Running") : "None",
      sub: `${dietPlans.length} total`,
      icon: "🥗",
      gradient: "linear-gradient(135deg,#7c3aed,#9333ea)",
      shadow: "rgba(124,58,237,0.35)",
      badge: "bg-violet-100 text-violet-700",
      spark: null,
    },
    {
      label: "Current Weight",
      value: weightLogs.length > 0 ? `${weightLogs[0].weight} kg` : "—",
      sub: `${weightLogs.length} entries`,
      icon: "⚖️",
      gradient: "linear-gradient(135deg,#2563eb,#0ea5e9)",
      shadow: "rgba(37,99,235,0.3)",
      badge: "bg-blue-100 text-blue-700",
      spark: weightLogs.length >= 2 ? weightLogs.slice(0,8).reverse().map(l => l.weight) : null,
    },
    {
      label: "AI Coach",
      value: "Ready",
      sub: "Always available",
      icon: "🤖",
      gradient: "linear-gradient(135deg,#db2777,#ec4899)",
      shadow: "rgba(219,39,119,0.3)",
      badge: "bg-pink-100 text-pink-700",
      spark: null,
    },
    {
      label: "Day Streak",
      value: "0 days",
      sub: "Log daily to grow",
      icon: "🔥",
      gradient: "linear-gradient(135deg,#ea580c,#f97316)",
      shadow: "rgba(234,88,12,0.3)",
      badge: "bg-orange-100 text-orange-700",
      spark: null,
    },
  ];

  const actions = [
    { label: "Log Today's Weight", icon: "⚖️", href: "/weight-logs",  gradient: "linear-gradient(135deg,#2563eb,#0ea5e9)", shadow: "rgba(37,99,235,0.25)" },
    { label: "Take an Assessment",  icon: "📋", href: "/assessments",  gradient: "linear-gradient(135deg,#7c3aed,#9333ea)", shadow: "rgba(124,58,237,0.25)" },
    { label: "Chat with AI Coach",  icon: "🤖", href: "/ai-chat",      gradient: "linear-gradient(135deg,#db2777,#ec4899)", shadow: "rgba(219,39,119,0.25)" },
    { label: "View Diet Plans",     icon: "🥗", href: "/diet-plans",   gradient: "linear-gradient(135deg,#059669,#10b981)", shadow: "rgba(5,150,105,0.25)" },
  ];

  const tip = TIPS[tipIdx];

  return (
    <div className="flex h-screen bg-mesh overflow-hidden">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* ── Header ── */}
        <header className="anim-fade-in flex items-center justify-between px-6 py-4 bg-white/80 backdrop-blur-sm border-b" style={{ borderColor: "rgba(139,92,246,0.08)" }}>
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-xl text-gray-500 hover:bg-violet-50 hover:text-violet-600 transition">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <div>
              <h1 className="text-base font-bold text-gray-900">{greeting.text} {greeting.emoji}</h1>
              <p className="text-xs text-gray-400 hidden sm:block">Here&apos;s your nutrition overview</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Notification bell */}
            <button className="relative p-2 rounded-xl text-gray-400 hover:bg-violet-50 hover:text-violet-600 transition">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-pink-500 border border-white" />
            </button>
            {/* Avatar with gradient ring */}
            <div className="relative w-9 h-9 flex-shrink-0">
              <div className="absolute inset-0 rounded-full spin-slow" style={{ background: "conic-gradient(#7c3aed,#ec4899,#0ea5e9,#7c3aed)", padding: "2px" }} />
              <div className="absolute inset-[2px] rounded-full bg-white flex items-center justify-center">
                <div className="w-full h-full rounded-full flex items-center justify-center text-white text-xs font-bold"
                  style={{ background: "linear-gradient(135deg,#7c3aed,#9333ea)" }}>U</div>
              </div>
            </div>
            <button onClick={() => { clearAuth(); router.push("/login"); }}
              className="hidden sm:flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-500 transition px-3 py-1.5 rounded-full hover:bg-red-50">
              Sign out
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-5 lg:p-6">
          <div className="max-w-5xl mx-auto space-y-6">

            {/* ── Hero banner ── */}
            <div className="anim-fade-in-up relative rounded-3xl p-7 lg:p-8 text-white overflow-hidden"
              style={{ background: "linear-gradient(135deg, #1e1b4b 0%, #3730a3 30%, #6d28d9 65%, #7c3aed 100%)" }}>
              <div className="anim-float   absolute top-0 right-0 w-64 h-64 rounded-full opacity-20 -translate-y-1/3 translate-x-1/4" style={{ background: "radial-gradient(circle,#a78bfa,transparent)" }} />
              <div className="anim-float-2 absolute bottom-0 right-24 w-36 h-36 rounded-full opacity-20 translate-y-1/3" style={{ background: "radial-gradient(circle,#f472b6,transparent)", animationDelay:"1s" }} />
              <div className="anim-float-3 absolute top-6 right-44 w-12 h-12 rounded-full opacity-30" style={{ background: "radial-gradient(circle,#7dd3fc,transparent)", animationDelay:"1.8s" }} />
              <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.2) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.2) 1px,transparent 1px)", backgroundSize: "32px 32px" }} />
              <div className="relative z-10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold text-violet-200 mb-3" style={{ background:"rgba(255,255,255,0.12)", border:"1px solid rgba(255,255,255,0.15)" }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                    {dietPlans.length === 0 ? "Ready to start" : "Plan active"}
                  </div>
                  <h2 className="text-2xl lg:text-3xl font-extrabold text-white mb-2 leading-tight">
                    {dietPlans.length === 0 ? "Begin your AI nutrition journey" : "Your plan is running 🎉"}
                  </h2>
                  <p className="text-violet-200 text-sm max-w-md">
                    {dietPlans.length === 0
                      ? "A 5-minute health assessment is all it takes to get your personalized AI diet plan."
                      : "Track your weight, chat with your AI coach, and stay on target."}
                  </p>
                </div>
                <Link href={dietPlans.length === 0 ? "/assessments" : "/diet-plans"}
                  className="flex-shrink-0 inline-flex items-center gap-2 bg-white text-violet-700 text-sm font-bold px-6 py-3 rounded-2xl hover:bg-violet-50 transition shadow-xl hover:-translate-y-0.5 active:translate-y-0">
                  {dietPlans.length === 0 ? "Start Assessment" : "View My Plan"}
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                </Link>
              </div>
            </div>

            {/* ── Stat cards ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {loadingData
                ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
                : stats.map((s, i) => (
                    <div key={s.label}
                      className={`anim-fade-in-up ${STAGGER[i]} bg-white rounded-2xl border p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg cursor-default`}
                      style={{ borderColor:"rgba(139,92,246,0.07)", boxShadow:"0 1px 4px rgba(0,0,0,0.04)" }}>
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                          style={{ background: s.gradient, boxShadow:`0 4px 14px -3px ${s.shadow}` }}>
                          {s.icon}
                        </div>
                        {s.spark
                          ? <MiniSparkline values={s.spark} color="#2563eb" />
                          : <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${s.badge}`}>{s.sub}</span>
                        }
                      </div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{s.label}</p>
                      <p className="text-xl font-extrabold text-gray-900 truncate">{s.value}</p>
                      {s.spark && <p className="text-[10px] text-gray-400 mt-0.5">{s.sub}</p>}
                    </div>
                  ))
              }
            </div>

            {/* ── Two columns ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Quick actions */}
              <div className="anim-fade-in-up delay-300 bg-white rounded-2xl border p-6" style={{ borderColor:"rgba(139,92,246,0.07)", boxShadow:"0 1px 4px rgba(0,0,0,0.04)" }}>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4">Quick Actions</p>
                <div className="space-y-2">
                  {actions.map((a, i) => (
                    <Link key={a.label} href={a.href}
                      className={`anim-fade-in-up ${STAGGER[i]} flex items-center gap-4 p-3.5 rounded-xl hover:bg-gray-50 transition-all group`}>
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 transition-transform group-hover:scale-110"
                        style={{ background: a.gradient, boxShadow:`0 4px 12px -2px ${a.shadow}` }}>
                        {a.icon}
                      </div>
                      <span className="text-sm font-semibold text-gray-700 group-hover:text-gray-900">{a.label}</span>
                      <div className="ml-auto w-7 h-7 rounded-lg bg-gray-50 flex items-center justify-center group-hover:bg-violet-50 transition-colors">
                        <svg className="w-3.5 h-3.5 text-gray-400 group-hover:text-violet-500 group-hover:translate-x-0.5 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Plans + tip */}
              <div className="flex flex-col gap-4">
                {/* Plans card */}
                <div className="anim-fade-in-up delay-400 bg-white rounded-2xl border overflow-hidden flex-1" style={{ borderColor:"rgba(139,92,246,0.07)", boxShadow:"0 1px 4px rgba(0,0,0,0.04)" }}>
                  <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor:"rgba(139,92,246,0.07)" }}>
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Diet Plans</p>
                    <Link href="/diet-plans" className="text-xs font-bold text-violet-600 hover:text-violet-700">View all →</Link>
                  </div>
                  {loadingData ? (
                    <div className="p-4 space-y-3">
                      {[1,2].map(k => <div key={k} className="h-10 rounded-xl shimmer" />)}
                    </div>
                  ) : dietPlans.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 px-5 text-center">
                      <div className="anim-pop-in text-4xl mb-2">🥗</div>
                      <p className="text-xs font-semibold text-gray-700 mb-1">No plans yet</p>
                      <p className="text-[11px] text-gray-400 mb-3">Take an assessment to generate your first AI diet plan</p>
                      <Link href="/assessments" className="text-xs font-bold text-white px-4 py-2 rounded-xl btn-gradient shadow-md">Start →</Link>
                    </div>
                  ) : (
                    <div className="divide-y" style={{ borderColor:"rgba(139,92,246,0.07)" }}>
                      {dietPlans.slice(0, 3).map((plan, i) => (
                        <Link key={plan.id} href={`/diet-plans/${plan.id}`}
                          className={`anim-fade-in-up ${STAGGER[i]} flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition`}>
                          <div className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm" style={{ background:"linear-gradient(135deg,#ede9fe,#ddd6fe)" }}>🥗</div>
                            <div>
                              <p className="text-xs font-semibold text-gray-900">{plan.planType || "AI Diet Plan"}</p>
                              <p className="text-[10px] text-gray-400">{plan.startDate}</p>
                            </div>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${plan.planStatus === "ACTIVE" ? "bg-violet-100 text-violet-700" : "bg-gray-100 text-gray-500"}`}>{plan.planStatus}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

                {/* Tip card */}
                <div className="anim-fade-in-up delay-500 rounded-2xl p-5 relative overflow-hidden"
                  style={{ background:"linear-gradient(135deg,#f5f3ff,#ede9fe)", border:"1px solid rgba(139,92,246,0.12)" }}>
                  <div className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-30 -translate-y-1/3 translate-x-1/3"
                    style={{ background:"radial-gradient(circle,#a78bfa,transparent)" }} />
                  <div className="relative z-10 flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xl flex-shrink-0 bg-white shadow-sm">{tip.icon}</div>
                    <div>
                      <p className="text-[10px] font-bold text-violet-500 uppercase tracking-widest mb-0.5">Tip of the day</p>
                      <p className="text-sm font-bold text-gray-900 mb-1">{tip.title}</p>
                      <p className="text-xs text-gray-500 leading-relaxed">{tip.body}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
