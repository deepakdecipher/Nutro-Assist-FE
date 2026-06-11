"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

export function AdminSidebar({
  collapsed,
  onCollapse,
}: {
  collapsed: boolean;
  onCollapse: () => void;
}) {
  const pathname = usePathname();

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-30 hidden flex-col bg-[#121244] text-white shadow-2xl shadow-violet-950/20 transition-all duration-300 lg:flex ${
        collapsed ? "w-20" : "w-72"
      }`}>
      <div className="flex h-16 items-center gap-3 px-5">
        <Image
          src="/nutro-assist-logo.svg"
          alt="Nutro Assist"
          width={34}
          height={34}
          className="h-9 w-9 rounded-xl object-cover"
          priority
        />
        {!collapsed && <span className="text-sm font-bold">Nutro Assist</span>}
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-4 pb-4">
        <NavLink href="/admin/dashboard" icon="▦" label="Dashboard" active={pathname === "/admin/dashboard"} collapsed={collapsed} />

        <div>
          {!collapsed && (
            <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Administration
            </p>
          )}
          <div className="space-y-1">
            <NavLink href="/admin/dashboard" icon="👥" label="Users" active={pathname === "/admin/dashboard"} collapsed={collapsed} />
          </div>
        </div>

        <div>
          {!collapsed && (
            <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              AI & Content
            </p>
          )}
          <div className="space-y-1">
            <NavLink href="/admin/knowledge" icon="🧠" label="Knowledge Base" active={pathname === "/admin/knowledge"} collapsed={collapsed} />
          </div>
        </div>

        <div>
          {!collapsed && (
            <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Application
            </p>
          )}
          <div className="space-y-1">
            <Link
              href="/dashboard"
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
        </div>
      </nav>

      <button
        type="button"
        onClick={onCollapse}
        className="m-4 rounded-xl px-3 py-2 text-left text-xs font-semibold text-slate-300 transition hover:bg-white/10">
        {collapsed ? "→" : "↔ Collapse"}
      </button>
    </aside>
  );
}

function NavLink({
  href,
  icon,
  label,
  active,
  collapsed,
}: {
  href: string;
  icon: string;
  label: string;
  active: boolean;
  collapsed: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex h-10 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold transition ${
        active
          ? "bg-violet-600 text-white shadow-lg shadow-violet-950/25"
          : "text-slate-300 hover:bg-white/10 hover:text-white"
      }`}>
      <span className="w-5 text-center text-xs">{icon}</span>
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  );
}
