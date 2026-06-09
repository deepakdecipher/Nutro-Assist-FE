"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated } from "@/lib/api";
import { Sidebar } from "@/components/Sidebar";

const plans = [
  {
    name: "Free",
    price: "€0",
    period: "/month",
    desc: "Get started at no cost",
    features: ["1 AI diet plan / month", "Basic weight tracking", "Community access", "Email support"],
    cta: "Current Plan",
    current: true,
    gradient: null,
    delay: "delay-100",
  },
  {
    name: "Pro",
    price: "€9",
    period: "/month",
    desc: "For serious health goals",
    features: ["Unlimited AI diet plans", "Advanced weight analytics", "Unlimited AI coach chats", "Priority support", "Export as PDF", "Custom macro targets"],
    cta: "Upgrade to Pro",
    current: false,
    gradient: "linear-gradient(145deg,#1e1b4b 0%,#3730a3 40%,#7c3aed 100%)",
    delay: "delay-200",
  },
  {
    name: "Team",
    price: "€29",
    period: "/month",
    desc: "For professionals & coaches",
    features: ["Everything in Pro", "Up to 10 client profiles", "Client progress dashboard", "White-label reports", "API access", "Dedicated support"],
    cta: "Contact Sales",
    current: false,
    gradient: null,
    delay: "delay-300",
  },
];

const features = [
  { label: "AI Diet Plans", free: "1 / month",  pro: "Unlimited",  team: "Unlimited" },
  { label: "Weight Tracking", free: "Basic", pro: "Advanced + charts", team: "Advanced + charts" },
  { label: "AI Coach Chats", free: "5 / month", pro: "Unlimited", team: "Unlimited" },
  { label: "Export as PDF", free: "—", pro: "✓", team: "✓" },
  { label: "Client Profiles", free: "—", pro: "—", team: "Up to 10" },
  { label: "API Access", free: "—", pro: "—", team: "✓" },
];

const FAQS = [
  { q: "Can I cancel anytime?", a: "Yes. No contracts, no commitments. Cancel from your account settings at any time — your plan stays active until the period ends." },
  { q: "Is there a free trial?", a: "All paid plans include a 14-day free trial. No credit card required to start." },
  { q: "What payment methods do you accept?", a: "We accept all major credit cards and debit cards via Stripe. Bank transfers available for Team plans." },
  { q: "What happens to my data if I downgrade?", a: "Your data is always yours. If you downgrade, you retain access to previously generated plans in read-only mode." },
];

export default function SubscriptionsPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    setMounted(true);
    if (!isAuthenticated()) { router.replace("/login"); }
  }, [router]);

  if (!mounted) return null;

  return (
    <div className="flex h-screen bg-mesh overflow-hidden">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="anim-fade-in flex items-center gap-4 px-6 py-4 bg-white/80 backdrop-blur-sm border-b" style={{ borderColor:"rgba(139,92,246,0.08)" }}>
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-xl text-gray-500 hover:bg-violet-50 hover:text-violet-600 transition">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <div>
            <h1 className="text-base font-bold text-gray-900">Subscriptions</h1>
            <p className="text-xs text-gray-400 hidden sm:block">Choose the plan that fits you best</p>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-5 lg:p-6">
          <div className="max-w-4xl mx-auto space-y-10">

            {/* Header */}
            <div className="anim-fade-in-up text-center">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold text-violet-600 mb-4"
                style={{ background:"linear-gradient(135deg,rgba(124,58,237,0.08),rgba(168,85,247,0.08))", border:"1px solid rgba(124,58,237,0.15)" }}>
                💎 Simple, transparent pricing
              </div>
              <h2 className="text-3xl font-extrabold text-gray-900 mb-2">Invest in your health</h2>
              <p className="text-gray-400 text-sm">14-day free trial · Cancel anytime · No hidden fees</p>
            </div>

            {/* Plans */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start">
              {plans.map((plan) => (
                <div key={plan.name}
                  className={`anim-fade-in-up ${plan.delay} relative rounded-3xl p-7 flex flex-col transition-all duration-300 hover:-translate-y-2 ${
                    plan.gradient ? "text-white glow-pulse" : "bg-white border"
                  }`}
                  style={plan.gradient
                    ? { background: plan.gradient, boxShadow:"0 20px 50px -10px rgba(124,58,237,0.4)" }
                    : { borderColor:"rgba(139,92,246,0.07)", boxShadow:"0 1px 4px rgba(0,0,0,0.04)" }
                  }>
                  {/* Grid overlay on dark card */}
                  {plan.gradient && (
                    <div className="absolute inset-0 opacity-[0.04] rounded-3xl overflow-hidden"
                      style={{ backgroundImage:"linear-gradient(rgba(255,255,255,.25) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.25) 1px,transparent 1px)", backgroundSize:"28px 28px" }} />
                  )}
                  {/* Top blob on dark card */}
                  {plan.gradient && (
                    <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-15 -translate-y-1/3 translate-x-1/3"
                      style={{ background:"radial-gradient(circle,#a78bfa,transparent)" }} />
                  )}
                  {/* Popular badge */}
                  {plan.name === "Pro" && (
                    <div className="anim-pop-in absolute -top-3.5 left-1/2 -translate-x-1/2 flex items-center gap-1 px-4 py-1.5 rounded-full text-xs font-bold text-white shadow-lg"
                      style={{ background:"linear-gradient(135deg,#ec4899,#f472b6)", boxShadow:"0 4px 16px rgba(236,72,153,0.45)" }}>
                      ✨ Most Popular
                    </div>
                  )}

                  <div className="relative z-10">
                    <p className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${plan.gradient ? "text-violet-300" : "text-gray-400"}`}>{plan.name}</p>
                    <div className="flex items-end gap-1 mb-1">
                      <span className={`text-5xl font-extrabold ${plan.gradient ? "text-white" : "text-gray-900"}`}>{plan.price}</span>
                      <span className={`text-sm mb-2 ${plan.gradient ? "text-violet-300" : "text-gray-400"}`}>{plan.period}</span>
                    </div>
                    <p className={`text-xs mb-7 ${plan.gradient ? "text-violet-200" : "text-gray-400"}`}>{plan.desc}</p>

                    {/* Progress bar — visual accent */}
                    {plan.gradient && (
                      <div className="mb-6 h-1 rounded-full bg-white/20 overflow-hidden">
                        <div className="bar-fill h-full rounded-full bg-white/60" style={{ width:"75%" }} />
                      </div>
                    )}

                    <ul className="space-y-3 mb-8">
                      {plan.features.map((f, fi) => (
                        <li key={f}
                          className={`anim-fade-in flex items-center gap-3 text-sm ${plan.gradient ? "text-violet-100" : "text-gray-600"}`}
                          style={{ animationDelay:`${300 + fi * 50}ms` }}>
                          <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                            style={plan.gradient ? { background:"rgba(255,255,255,0.2)" } : { background:"linear-gradient(135deg,#ede9fe,#ddd6fe)" }}>
                            <svg className={`w-3 h-3 ${plan.gradient ? "text-white" : "text-violet-600"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                          {f}
                        </li>
                      ))}
                    </ul>

                    <button disabled={plan.current}
                      className={`w-full py-3.5 rounded-2xl text-sm font-bold transition-all ${
                        plan.current
                          ? "bg-gray-100 text-gray-400 cursor-default"
                          : plan.gradient
                            ? "bg-white text-violet-700 hover:bg-violet-50 shadow-lg hover:-translate-y-0.5 active:translate-y-0"
                            : "text-white btn-gradient shadow-md shadow-violet-200 hover:-translate-y-0.5 active:translate-y-0"
                      }`}>
                      {plan.cta}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Feature comparison table */}
            <div className="anim-fade-in-up delay-400 bg-white rounded-2xl border overflow-hidden" style={{ borderColor:"rgba(139,92,246,0.07)", boxShadow:"0 1px 4px rgba(0,0,0,0.04)" }}>
              <div className="px-6 py-4 border-b" style={{ borderColor:"rgba(139,92,246,0.07)" }}>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Feature Comparison</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b" style={{ borderColor:"rgba(139,92,246,0.07)" }}>
                      <th className="text-left px-6 py-3 text-xs font-bold text-gray-400 uppercase tracking-widest w-2/5">Feature</th>
                      {["Free","Pro","Team"].map(h => (
                        <th key={h} className={`px-4 py-3 text-xs font-bold uppercase tracking-widest text-center ${h === "Pro" ? "text-violet-600" : "text-gray-400"}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {features.map((row, i) => (
                      <tr key={row.label} className={`border-b hover:bg-gray-50/50 transition ${i % 2 === 0 ? "" : "bg-gray-50/30"}`} style={{ borderColor:"rgba(139,92,246,0.05)" }}>
                        <td className="px-6 py-3 text-xs font-medium text-gray-700">{row.label}</td>
                        {[row.free, row.pro, row.team].map((v, j) => (
                          <td key={j} className={`px-4 py-3 text-xs text-center font-medium ${v === "—" ? "text-gray-300" : j === 1 ? "text-violet-600" : "text-gray-600"}`}>
                            {v}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* FAQ */}
            <div className="anim-fade-in-up delay-500 space-y-3">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4">Frequently Asked Questions</p>
              {FAQS.map((faq, i) => (
                <div key={i}
                  className="bg-white rounded-2xl border overflow-hidden transition-all"
                  style={{ borderColor: openFaq === i ? "rgba(124,58,237,0.2)" : "rgba(139,92,246,0.07)", boxShadow: openFaq === i ? "0 4px 16px rgba(124,58,237,0.08)" : "0 1px 4px rgba(0,0,0,0.04)" }}>
                  <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between px-6 py-4 text-left">
                    <span className="text-sm font-semibold text-gray-900">{faq.q}</span>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ml-3 transition-all ${openFaq === i ? "text-white" : "text-gray-400 bg-gray-50"}`}
                      style={openFaq === i ? { background:"linear-gradient(135deg,#7c3aed,#9333ea)" } : {}}>
                      <svg className={`w-3 h-3 transition-transform ${openFaq === i ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>
                  {openFaq === i && (
                    <div className="px-6 pb-5">
                      <p className="text-sm text-gray-500 leading-relaxed">{faq.a}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <p className="anim-fade-in text-center text-xs text-gray-300 pb-4">
              Secure payments via Stripe · SOC 2 compliant · Your data is never sold
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
