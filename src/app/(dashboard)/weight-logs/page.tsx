"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated, api } from "@/lib/api";
import { Sidebar } from "@/components/Sidebar";

interface WeightLog { id: number; weightKg: number; logDate: string; }

/* ── Full sparkline chart ─────────────────────── */
function WeightChart({ logs }: { logs: WeightLog[] }) {
  const data = [...logs].reverse(); // chronological order
  const values = data.map(l => l.weightKg);
  if (values.length < 2) return (
    <div className="flex flex-col items-center justify-center h-28 text-gray-300 gap-2">
      <span className="text-2xl">📈</span>
      <span className="text-xs">Log 2+ entries to see your trend</span>
    </div>
  );

  const W = 400, H = 100, PX = 16, PY = 12;
  const min = Math.min(...values) - 0.5;
  const max = Math.max(...values) + 0.5;
  const range = max - min;
  const toX = (i: number) => PX + (i / (data.length - 1)) * (W - PX * 2);
  const toY = (v: number) => PY + (1 - (v - min) / range) * (H - PY * 2);

  const pts = data.map((d, i) => ({ x: toX(i), y: toY(d.weightKg) }));
  let line = `M${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const mx = (pts[i - 1].x + pts[i].x) / 2;
    line += ` C${mx} ${pts[i - 1].y} ${mx} ${pts[i].y} ${pts[i].x} ${pts[i].y}`;
  }
  const area = `${line} L${pts[pts.length - 1].x} ${H} L${pts[0].x} ${H}Z`;
  const isDown = values[values.length - 1] <= values[0];
  const col = isDown ? "#059669" : "#7c3aed";

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-28" preserveAspectRatio="none">
        <defs>
          <linearGradient id="wg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={col} stopOpacity="0.22" />
            <stop offset="100%" stopColor={col} stopOpacity="0.01" />
          </linearGradient>
          <filter id="dot-glow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        {/* Grid lines */}
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1={PX} x2={W - PX} y1={PY + f * (H - PY * 2)} y2={PY + f * (H - PY * 2)}
            stroke="rgba(139,92,246,0.08)" strokeWidth="1" strokeDasharray="4 4" />
        ))}
        {/* Area fill */}
        <path d={area} fill="url(#wg)" />
        {/* Line */}
        <path d={line} fill="none" stroke={col} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="draw-line" />
        {/* Data points */}
        {pts.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={i === pts.length - 1 ? 5 : 3}
            fill={i === pts.length - 1 ? col : "white"} stroke={col} strokeWidth="2"
            filter={i === pts.length - 1 ? "url(#dot-glow)" : undefined} />
        ))}
      </svg>
      {/* X-axis labels */}
      <div className="flex justify-between px-4 mt-1">
        <span className="text-[10px] text-gray-400">{data[0]?.logDate}</span>
        {data.length > 2 && <span className="text-[10px] text-gray-400">{data[Math.floor(data.length/2)]?.logDate}</span>}
        <span className="text-[10px] text-gray-400">{data[data.length - 1]?.logDate}</span>
      </div>
    </div>
  );
}

export default function WeightLogsPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [logs, setLogs] = useState<WeightLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [weight, setWeight] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!isAuthenticated()) { router.replace("/login"); return; }
    api.get<WeightLog[]>("/api/weight-logs").catch(() => []).then((data) => { setLogs(data); setLoading(false); });
  }, [router]);

  async function handleLog(e: React.FormEvent) {
    e.preventDefault();
    if (!weight) return;
    setSaving(true); setError("");
    try {
      const entry = await api.post<WeightLog>("/api/weight-logs", { weightKg: parseFloat(weight), logDate: new Date().toISOString().split("T")[0] });
      setLogs([entry, ...logs]);
      setWeight("");
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally { setSaving(false); }
  }

  if (!mounted) return null;

  const values = logs.map(l => l.weightKg);
  const minW = values.length ? Math.min(...values) : null;
  const maxW = values.length ? Math.max(...values) : null;
  const diffRaw = values.length >= 2 ? values[0] - values[values.length - 1] : null;
  const diff = diffRaw !== null ? diffRaw.toFixed(1) : null;
  const isLoss = diffRaw !== null && diffRaw <= 0;

  return (
    <div className="flex h-screen bg-mesh overflow-hidden">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="anim-fade-in flex items-center gap-4 px-6 py-4 bg-white/80 backdrop-blur-sm border-b" style={{ borderColor:"rgba(139,92,246,0.08)" }}>
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-xl text-gray-500 hover:bg-violet-50 hover:text-violet-600 transition">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <div className="flex-1">
            <h1 className="text-base font-bold text-gray-900">Weight Tracker</h1>
            <p className="text-xs text-gray-400 hidden sm:block">Log and visualize your progress</p>
          </div>
          {logs.length > 0 && (
            <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${isLoss ? "bg-green-50 text-green-700" : "bg-orange-50 text-orange-700"}`}>
              {isLoss ? "↓" : "↑"} {diff !== null ? `${Math.abs(parseFloat(diff))} kg` : ""}
              <span className="font-normal opacity-70">overall</span>
            </div>
          )}
        </header>

        <main className="flex-1 overflow-y-auto p-5 lg:p-6">
          <div className="max-w-2xl mx-auto space-y-5">

            {/* Stats row */}
            {logs.length > 0 && (
              <div className="anim-fade-in-up grid grid-cols-3 gap-3">
                {[
                  { label: "Current", value: `${values[0]} kg`, gradient:"linear-gradient(135deg,#7c3aed,#9333ea)", shadow:"rgba(124,58,237,0.3)" },
                  { label: "Lowest",  value: minW !== null ? `${minW} kg` : "—", gradient:"linear-gradient(135deg,#059669,#10b981)", shadow:"rgba(5,150,105,0.25)" },
                  { label: "Change",  value: diff !== null ? `${parseFloat(diff) > 0 ? "+" : ""}${diff} kg` : "—",
                    gradient: isLoss ? "linear-gradient(135deg,#059669,#10b981)" : "linear-gradient(135deg,#ea580c,#f97316)",
                    shadow: isLoss ? "rgba(5,150,105,0.25)" : "rgba(234,88,12,0.25)" },
                ].map((s) => (
                  <div key={s.label} className="bg-white rounded-2xl border p-4 text-center hover:-translate-y-0.5 transition-all" style={{ borderColor:"rgba(139,92,246,0.07)" }}>
                    <div className="w-8 h-8 rounded-xl mx-auto mb-2.5 flex items-center justify-center shadow-md"
                      style={{ background: s.gradient, boxShadow:`0 4px 10px -2px ${s.shadow}` }}>
                      <span className="text-white text-xs">⚖</span>
                    </div>
                    <p className="text-lg font-extrabold text-gray-900 leading-tight">{s.value}</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Chart card */}
            <div className="anim-fade-in-up delay-100 bg-white rounded-2xl border overflow-hidden" style={{ borderColor:"rgba(139,92,246,0.07)", boxShadow:"0 1px 4px rgba(0,0,0,0.04)" }}>
              <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor:"rgba(139,92,246,0.07)" }}>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Weight Trend</p>
                {maxW !== null && <span className="text-[10px] text-gray-300">High: {maxW} kg</span>}
              </div>
              <div className="px-4 pt-4 pb-2">
                {loading ? (
                  <div className="h-28 rounded-xl shimmer" />
                ) : (
                  <WeightChart logs={logs} />
                )}
              </div>
            </div>

            {/* Log form */}
            <div className="anim-fade-in-up delay-150 bg-white rounded-2xl border p-6" style={{ borderColor:"rgba(139,92,246,0.07)", boxShadow:"0 1px 4px rgba(0,0,0,0.04)" }}>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4">Log Today&apos;s Weight</p>
              {error && (
                <div className="anim-scale-in mb-4 flex items-center gap-2.5 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                  <span className="text-red-500">⚠</span><p className="text-xs text-red-600">{error}</p>
                </div>
              )}
              {justSaved && (
                <div className="anim-scale-in mb-4 flex items-center gap-2.5 bg-green-50 border border-green-100 rounded-xl px-4 py-3">
                  <span className="text-green-500">✓</span><p className="text-xs text-green-700 font-semibold">Logged successfully!</p>
                </div>
              )}
              <form onSubmit={handleLog} className="flex gap-3">
                <div className="flex-1 relative">
                  <input type="number" step="0.1" min="10" max="500" required value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    className="input-field pr-10" placeholder="e.g. 72.5" />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-semibold">kg</span>
                </div>
                <button type="submit" disabled={saving}
                  className="px-6 py-3 rounded-xl text-sm font-bold text-white btn-gradient disabled:opacity-60 shadow-md shadow-violet-200 whitespace-nowrap hover:-translate-y-0.5 active:translate-y-0">
                  {saving ? <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving…</span> : "Log Weight"}
                </button>
              </form>
            </div>

            {/* History */}
            <div className="anim-fade-in-up delay-200 bg-white rounded-2xl border overflow-hidden" style={{ borderColor:"rgba(139,92,246,0.07)", boxShadow:"0 1px 4px rgba(0,0,0,0.04)" }}>
              <div className="px-6 py-4 border-b" style={{ borderColor:"rgba(139,92,246,0.07)" }}>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">History</p>
              </div>
              {loading ? (
                <div className="p-4 space-y-3">
                  {[1,2,3].map(k => <div key={k} className="h-10 rounded-xl shimmer" />)}
                </div>
              ) : logs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="anim-pop-in text-4xl mb-3">⚖️</div>
                  <p className="anim-fade-in-up delay-100 text-sm font-bold text-gray-700">No entries yet</p>
                  <p className="anim-fade-in-up delay-150 text-xs text-gray-400">Log your first weight above to begin tracking</p>
                </div>
              ) : (
                <div className="divide-y" style={{ borderColor:"rgba(139,92,246,0.06)" }}>
                  {logs.map((log, i) => {
                    const prev = logs[i + 1];
                    const delta = prev ? (log.weightKg - prev.weightKg).toFixed(1) : null;
                    return (
                      <div key={log.id}
                        className="anim-fade-in-up flex items-center justify-between px-6 py-3.5 hover:bg-gray-50/80 transition"
                        style={{ animationDelay:`${i * 40}ms` }}>
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${i === 0 ? "scale-125" : ""}`}
                            style={i === 0 ? { background:"linear-gradient(135deg,#7c3aed,#9333ea)" } : { background:"#e5e7eb" }} />
                          <div>
                            <p className="text-sm font-medium text-gray-700">{log.logDate}</p>
                            {i === 0 && <p className="text-[10px] text-violet-500 font-semibold">Latest</p>}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {delta !== null && (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${parseFloat(delta) < 0 ? "bg-green-50 text-green-600" : parseFloat(delta) > 0 ? "bg-orange-50 text-orange-600" : "bg-gray-50 text-gray-400"}`}>
                              {parseFloat(delta) > 0 ? "+" : ""}{delta}
                            </span>
                          )}
                          <p className={`text-sm font-bold ${i === 0 ? "text-violet-700" : "text-gray-700"}`}>{log.weightKg} kg</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
