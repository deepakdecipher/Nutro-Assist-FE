"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearAuth } from "@/lib/api";

const navGroups = [
  {
    label: "Main",
    items: [
      { href: "/dashboard",    label: "Dashboard",       icon: "◈" },
      { href: "/diet-plans",   label: "Diet Plans",      icon: "🥗" },
      { href: "/assessments",  label: "Assessments",     icon: "📋" },
      { href: "/weight-logs",  label: "Weight Tracker",  icon: "⚖️" },
    ],
  },
  {
    label: "Tools",
    items: [
      { href: "/ai-chat",      label: "AI Coach",        icon: "🤖" },
      { href: "/subscriptions", label: "Subscriptions",  icon: "💳" },
    ],
  },
];

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden" onClick={onClose} />
      )}
      <aside className={`fixed inset-y-0 left-0 z-50 flex flex-col w-64 transition-transform duration-300 lg:translate-x-0 lg:static lg:z-auto ${open ? "translate-x-0" : "-translate-x-full"}`}
        style={{ background: "white", borderRight: "1px solid rgba(139,92,246,0.08)" }}>

        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b" style={{ borderColor: "rgba(139,92,246,0.08)" }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shadow-md flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #7c3aed, #9333ea)", boxShadow: "0 4px 14px -2px rgba(124,58,237,0.4)" }}>
            🥗
          </div>
          <div>
            <div className="text-sm font-extrabold text-gray-900 tracking-tight">Nutro Assist</div>
            <div className="text-[10px] text-gray-400 font-medium">AI Nutrition Platform</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
          {navGroups.map((group) => (
            <div key={group.label}>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.12em] px-3 mb-2">{group.label}</p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active = pathname === item.href;
                  return (
                    <Link key={item.href} href={item.href} onClick={onClose}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 group ${
                        active ? "text-white shadow-md" : "text-gray-500 hover:text-gray-900 hover:bg-violet-50/80"
                      }`}
                      style={active ? {
                        background: "linear-gradient(135deg, #7c3aed, #9333ea)",
                        boxShadow: "0 4px 14px -3px rgba(124,58,237,0.35)",
                      } : {}}>
                      <span className={`text-base transition-transform duration-200 ${active ? "" : "group-hover:scale-110"}`}>{item.icon}</span>
                      <span className="font-medium">{item.label}</span>
                      {active && (
                        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white/60" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Upgrade card */}
        <div className="mx-3 mb-3 rounded-2xl p-4 relative overflow-hidden"
          style={{ background: "linear-gradient(135deg, #4c1d95 0%, #6d28d9 50%, #7c3aed 100%)" }}>
          {/* Blob inside card */}
          <div className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-20 -translate-y-1/3 translate-x-1/3"
            style={{ background: "radial-gradient(circle, #e9d5ff, transparent)" }} />
          <div className="relative z-10">
            <div className="text-xl mb-1.5">✨</div>
            <p className="text-white text-xs font-bold mb-0.5">Upgrade to Pro</p>
            <p className="text-violet-300 text-[11px] mb-3 leading-snug">Unlock unlimited AI plans & coaching</p>
            <Link href="/subscriptions"
              className="block text-center text-xs font-bold bg-white text-violet-700 rounded-full py-2 hover:bg-violet-50 transition shadow-md">
              View Plans
            </Link>
          </div>
        </div>

        {/* Sign out */}
        <div className="px-3 pb-4 border-t pt-3" style={{ borderColor: "rgba(139,92,246,0.08)" }}>
          <button onClick={() => { clearAuth(); router.push("/login"); }}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-gray-400 hover:bg-red-50 hover:text-red-500 transition-all duration-200 group">
            <svg className="w-4 h-4 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="font-medium">Sign out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
