"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { isAuthenticated, api } from "@/lib/api";
import { Sidebar } from "@/components/Sidebar";

interface DietPlan { id: number; planStatus: string; planType: string; startDate: string; }

export default function DietPlansPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [plans, setPlans] = useState<DietPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
    if (!isAuthenticated()) { router.replace("/login"); return; }
    api.get<DietPlan[]>("/api/diet-plans/history").catch(() => []).then((data) => {
      setPlans(data);
      setLoading(false);
    });
  }, [router]);

  if (!mounted) return null;

  return (
    <div className="flex h-screen bg-mesh overflow-hidden">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="anim-fade-in flex items-center justify-between px-6 py-4 bg-white/80 backdrop-blur-sm border-b" style={{ borderColor: "rgba(139,92,246,0.08)" }}>
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-xl text-gray-500 hover:bg-violet-50 hover:text-violet-600 transition">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <div>
              <h1 className="text-base font-bold text-gray-900">Diet Plans</h1>
              <p className="text-xs text-gray-400 hidden sm:block">Your personalized AI meal plans</p>
            </div>
          </div>
          <Link href="/assessments"
            className="text-xs font-bold text-white px-4 py-2 rounded-xl btn-gradient shadow-md shadow-violet-200">
            + New Plan
          </Link>
        </header>

        <main className="flex-1 overflow-y-auto p-5 lg:p-6">
          <div className="max-w-4xl mx-auto">
            {loading ? (
              <div className="flex items-center justify-center h-48">
                <div className="w-8 h-8 border-2 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
              </div>
            ) : plans.length === 0 ? (
              <div className="anim-scale-in flex flex-col items-center justify-center py-24 text-center">
                <div className="anim-pop-in w-24 h-24 rounded-3xl flex items-center justify-center text-5xl mb-6 mx-auto"
                  style={{ background: "linear-gradient(135deg,#ede9fe,#f5f3ff)", boxShadow: "0 8px 24px rgba(139,92,246,0.12)" }}>
                  🥗
                </div>
                <h2 className="anim-fade-in-up delay-100 text-xl font-extrabold text-gray-900 mb-2">No diet plans yet</h2>
                <p className="anim-fade-in-up delay-150 text-sm text-gray-400 mb-7 max-w-xs leading-relaxed">
                  Complete a health assessment and our AI will generate a personalized plan just for you.
                </p>
                <Link href="/assessments"
                  className="anim-fade-in-up delay-200 text-sm font-bold text-white px-7 py-3 rounded-2xl btn-gradient shadow-lg shadow-violet-200">
                  Take Assessment →
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {plans.map((plan, i) => (
                  <div key={plan.id}
                    className="anim-fade-in-up bg-white rounded-2xl border p-5 flex items-center justify-between hover:-translate-y-0.5 hover:shadow-md transition-all duration-200"
                    style={{ borderColor: "rgba(139,92,246,0.07)", boxShadow: "0 1px 4px rgba(0,0,0,0.04)", animationDelay: `${i * 60}ms` }}>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 transition-transform hover:scale-110"
                        style={{ background: "linear-gradient(135deg,#ede9fe,#ddd6fe)" }}>🥗</div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">{plan.planType || "AI Diet Plan"}</p>
                        <p className="text-xs text-gray-400">Started {plan.startDate}</p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-3 py-1.5 rounded-full ${plan.planStatus === "ACTIVE" ? "bg-violet-100 text-violet-700" : "bg-gray-100 text-gray-500"}`}>
                      {plan.planStatus}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
