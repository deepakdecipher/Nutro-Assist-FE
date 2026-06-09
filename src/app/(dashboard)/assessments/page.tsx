"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated } from "@/lib/api";
import { Sidebar } from "@/components/Sidebar";

const steps = [
  { icon: "👤", label: "Personal Info",     desc: "Age, height, current weight",         gradient: "linear-gradient(135deg,#7c3aed,#9333ea)", shadow: "rgba(124,58,237,0.3)" },
  { icon: "🎯", label: "Health Goals",      desc: "Lose weight, build muscle, maintain",  gradient: "linear-gradient(135deg,#2563eb,#0ea5e9)", shadow: "rgba(37,99,235,0.25)" },
  { icon: "🍽️", label: "Food Preferences",  desc: "Dietary restrictions & allergies",     gradient: "linear-gradient(135deg,#059669,#10b981)", shadow: "rgba(5,150,105,0.25)" },
  { icon: "🏃", label: "Activity Level",    desc: "Sedentary to very active",             gradient: "linear-gradient(135deg,#ea580c,#f97316)", shadow: "rgba(234,88,12,0.25)" },
  { icon: "🤖", label: "AI Plan Ready",     desc: "Your personalized plan is generated",  gradient: "linear-gradient(135deg,#db2777,#ec4899)", shadow: "rgba(219,39,119,0.25)" },
];

export default function AssessmentsPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!isAuthenticated()) { router.replace("/login"); }
  }, [router]);

  if (!mounted) return null;

  return (
    <div className="flex h-screen bg-mesh overflow-hidden">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="anim-fade-in flex items-center gap-4 px-6 py-4 bg-white/80 backdrop-blur-sm border-b" style={{ borderColor: "rgba(139,92,246,0.08)" }}>
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-xl text-gray-500 hover:bg-violet-50 hover:text-violet-600 transition">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <div>
            <h1 className="text-base font-bold text-gray-900">Assessments</h1>
            <p className="text-xs text-gray-400 hidden sm:block">Build your health profile</p>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-5 lg:p-6">
          <div className="max-w-2xl mx-auto space-y-5">
            {/* Hero */}
            <div className="anim-fade-in-up relative rounded-3xl p-8 text-white overflow-hidden"
              style={{ background: "linear-gradient(135deg, #1e1b4b 0%, #3730a3 40%, #6d28d9 75%, #7c3aed 100%)" }}>
              <div className="anim-float   absolute top-0 right-0 w-44 h-44 rounded-full opacity-20 -translate-y-1/3 translate-x-1/3"
                style={{ background: "radial-gradient(circle,#a78bfa,transparent)" }} />
              <div className="anim-float-2 absolute bottom-0 right-16 w-24 h-24 rounded-full opacity-20 translate-y-1/3"
                style={{ background: "radial-gradient(circle,#f472b6,transparent)", animationDelay: "1s" }} />
              <div className="absolute inset-0 opacity-[0.04]"
                style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.2) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.2) 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold text-indigo-200 mb-4"
                  style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)" }}>
                  ⏱ 5 minute assessment
                </div>
                <h2 className="text-2xl font-extrabold mb-2">Get your personalized AI plan</h2>
                <p className="text-indigo-200 text-sm mb-5 max-w-sm">
                  Answer a few simple questions and our AI will build a nutrition plan perfectly suited to your goals and lifestyle.
                </p>
                <button disabled
                  className="inline-flex items-center gap-2 bg-white text-violet-700 text-sm font-bold px-6 py-2.5 rounded-xl opacity-70 cursor-not-allowed shadow-lg">
                  Coming Soon
                </button>
              </div>
            </div>

            {/* Steps */}
            <div className="anim-fade-in-up delay-150 bg-white rounded-2xl border p-6"
              style={{ borderColor: "rgba(139,92,246,0.07)", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-5">What to expect</p>
              <div className="relative">
                {/* Vertical connector */}
                <div className="absolute left-5 top-5 bottom-5 w-px bg-gradient-to-b from-violet-200 to-transparent" />
                <div className="space-y-5">
                  {steps.map((s, i) => (
                    <div key={s.label}
                      className="anim-fade-in-up flex items-center gap-4 relative"
                      style={{ animationDelay: `${200 + i * 80}ms` }}>
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 relative z-10 transition-transform hover:scale-110"
                        style={{ background: s.gradient, boxShadow: `0 4px 12px -2px ${s.shadow}` }}>
                        {s.icon}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">{s.label}</p>
                        <p className="text-xs text-gray-400">{s.desc}</p>
                      </div>
                      <div className="ml-auto text-xs text-gray-300 font-semibold">{i + 1}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
