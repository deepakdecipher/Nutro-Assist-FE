"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { api, getUserId, isAuthenticated } from "@/lib/api";
import { Sidebar } from "@/components/Sidebar";

interface FoodItem {
  foodItemId: number;
  foodName: string;
  quantityG: number;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  servingUnit: string | null;
}

interface MealSlot {
  slot: string;
  slotLabel: string;
  targetCalories: number;
  items: FoodItem[];
}

interface DaySchedule {
  dayId: number;
  dayNumber: number;
  totalDays: number;
  dailyCalories: number;
  meals: MealSlot[];
}

interface DietPlan {
  id: number;
  planName: string;
  dailyCalories: number;
  protein: number;
  carbs: number;
  fat: number;
  status: string;
  planType: string | null;
  startDate: string | null;
  endDate: string | null;
  active: boolean;
}

const SLOT_ICONS: Record<string, string> = {
  EARLY_MORNING: "🌅",
  MORNING:       "☀️",
  AFTERNOON:     "🌤️",
  EVENING:       "🌆",
  NIGHT:         "🌙",
};

const SLOT_COLORS: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  EARLY_MORNING: { bg: "#fef9c3", border: "#fde047", text: "#854d0e", badge: "#fef08a" },
  MORNING:       { bg: "#ede9fe", border: "#a78bfa", text: "#5b21b6", badge: "#ddd6fe" },
  AFTERNOON:     { bg: "#dcfce7", border: "#86efac", text: "#166534", badge: "#bbf7d0" },
  EVENING:       { bg: "#ffedd5", border: "#fdba74", text: "#9a3412", badge: "#fed7aa" },
  NIGHT:         { bg: "#e0e7ff", border: "#a5b4fc", text: "#3730a3", badge: "#c7d2fe" },
};

export default function DietPlanSchedulePage() {
  const router = useRouter();
  const params = useParams();
  const planId = params.id as string;

  const [mounted, setMounted]         = useState(false);
  const [sidebarOpen, setSidebarOpen]  = useState(false);
  const [plan, setPlan]               = useState<DietPlan | null>(null);
  const [schedule, setSchedule]       = useState<DaySchedule | null>(null);
  const [scheduleError, setScheduleError] = useState(false);
  const [day, setDay]                 = useState(1);
  const [loading, setLoading]         = useState(true);
  const [dayLoading, setDayLoading]   = useState(false);

  const fetchDay = useCallback(async (d: number) => {
    setDayLoading(true);
    setScheduleError(false);
    try {
      const data = await api.get<DaySchedule>(`/api/meal-plan/${planId}?day=${d}`);
      setSchedule(data ?? null);
    } catch {
      setSchedule(null);
      setScheduleError(true);
    } finally {
      setDayLoading(false);
    }
  }, [planId]);

  useEffect(() => {
    setMounted(true);
    if (!isAuthenticated()) { router.replace("/login"); return; }
    const userId = getUserId();
    if (!userId) { setLoading(false); return; }

    (async () => {
      try {
        const plans = await api.get<DietPlan[]>(`/api/diet-plans/user/${userId}`);
        const found = plans.find(p => String(p.id) === planId);
        if (found) setPlan(found);
      } catch { /* plan metadata unavailable */ }
      await fetchDay(1);
      setLoading(false);
    })();
  }, [router, planId, fetchDay]);

  async function goToDay(d: number) {
    if (d < 1 || d > 30 || d === day) return;
    setDay(d);
    await fetchDay(d);
  }

  if (!mounted) return null;

  return (
    <div className="flex h-screen bg-mesh overflow-hidden">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Header */}
        <header className="anim-fade-in flex items-center justify-between px-6 py-4 bg-white/80 backdrop-blur-sm border-b" style={{ borderColor: "rgba(139,92,246,0.08)" }}>
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-xl text-gray-500 hover:bg-violet-50 hover:text-violet-600 transition">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <div>
              <div className="flex items-center gap-2">
                <Link href="/diet-plans" className="text-xs text-gray-400 hover:text-violet-600 transition">Diet Plans</Link>
                <span className="text-gray-300 text-xs">›</span>
                <span className="text-xs font-semibold text-gray-700">{plan?.planName ?? "30-Day Schedule"}</span>
              </div>
              <p className="text-xs text-gray-400 hidden sm:block">
                Day {day} of 30 · {plan?.dailyCalories ?? "—"} kcal/day
                {plan?.startDate ? ` · ${new Date(plan.startDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – ${new Date(plan.endDate!).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}` : ""}
              </p>
            </div>
          </div>
          {plan && (
            <span className={`text-[10px] font-bold px-3 py-1.5 rounded-full ${plan.planType === "AI_PLAN" ? "bg-violet-100 text-violet-700" : "bg-green-100 text-green-700"}`}>
              {plan.planType === "AI_PLAN" ? "✨ AI Plan" : "Free Plan"}
            </span>
          )}
        </header>

        <main className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-8 h-8 border-2 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
            </div>
          ) : (
            <div className="flex flex-col lg:flex-row h-full">

              {/* ── Day picker sidebar ── */}
              <div className="lg:w-64 flex-shrink-0 bg-white border-r overflow-y-auto" style={{ borderColor: "rgba(139,92,246,0.08)" }}>
                <div className="px-4 py-3 border-b" style={{ borderColor: "rgba(139,92,246,0.08)" }}>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">30-Day Calendar</p>
                </div>
                <div className="grid grid-cols-5 lg:grid-cols-5 gap-1.5 p-3">
                  {Array.from({ length: 30 }, (_, i) => i + 1).map(d => (
                    <button key={d} onClick={() => goToDay(d)}
                      className={`h-10 w-full rounded-xl text-sm font-bold transition-all ${d === day
                        ? "text-white shadow-md"
                        : "text-gray-600 bg-gray-50 hover:bg-violet-50 hover:text-violet-700"}`}
                      style={d === day ? { background: "linear-gradient(135deg,#7c3aed,#9333ea)", boxShadow: "0 4px 10px -2px rgba(124,58,237,0.35)" } : {}}>
                      {d}
                    </button>
                  ))}
                </div>

                {/* Macro summary */}
                {plan && (
                  <div className="mx-3 mb-3 rounded-xl p-3 space-y-2" style={{ background: "linear-gradient(135deg,#f5f3ff,#ede9fe)" }}>
                    <p className="text-[10px] font-bold text-violet-500 uppercase tracking-widest">Daily Targets</p>
                    {[
                      { label: "Calories", value: `${plan.dailyCalories} kcal`, color: "#7c3aed" },
                      { label: "Protein",  value: `${plan.protein} g`,         color: "#2563eb" },
                      { label: "Carbs",    value: `${plan.carbs} g`,           color: "#059669" },
                      { label: "Fat",      value: `${plan.fat} g`,             color: "#ea580c" },
                    ].map(m => (
                      <div key={m.label} className="flex justify-between items-center">
                        <span className="text-xs text-gray-500">{m.label}</span>
                        <span className="text-xs font-bold" style={{ color: m.color }}>{m.value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Day schedule ── */}
              <div className="flex-1 overflow-y-auto p-5 lg:p-6">
                {dayLoading ? (
                  <div className="flex items-center justify-center h-48">
                    <div className="w-7 h-7 border-2 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
                  </div>
                ) : schedule && schedule.meals && schedule.meals.length > 0 ? (
                  <div className="max-w-2xl mx-auto space-y-4">
                    {/* Day header */}
                    <div className="flex items-center justify-between mb-2">
                      <h2 className="text-lg font-extrabold text-gray-900">Day {day}</h2>
                      <div className="flex items-center gap-2">
                        <button onClick={() => goToDay(day - 1)} disabled={day <= 1}
                          className="w-8 h-8 rounded-xl border text-sm font-bold text-gray-500 hover:border-violet-400 hover:text-violet-600 disabled:opacity-30 transition"
                          style={{ borderColor: "rgba(139,92,246,0.15)" }}>‹</button>
                        <button onClick={() => goToDay(day + 1)} disabled={day >= 30}
                          className="w-8 h-8 rounded-xl border text-sm font-bold text-gray-500 hover:border-violet-400 hover:text-violet-600 disabled:opacity-30 transition"
                          style={{ borderColor: "rgba(139,92,246,0.15)" }}>›</button>
                      </div>
                    </div>

                    {/* Meal slots */}
                    {schedule.meals.map(slot => {
                      const colors = SLOT_COLORS[slot.slot] ?? SLOT_COLORS.MORNING;
                      const icon   = SLOT_ICONS[slot.slot] ?? "🍽️";
                      return (
                        <div key={slot.slot} className="anim-fade-in-up rounded-2xl border overflow-hidden"
                          style={{ borderColor: colors.border, background: colors.bg }}>

                          {/* Slot header */}
                          <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: colors.border }}>
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{icon}</span>
                              <span className="text-sm font-bold" style={{ color: colors.text }}>{slot.slotLabel}</span>
                            </div>
                            {slot.targetCalories > 0 && (
                              <span className="text-[10px] font-bold px-2 py-1 rounded-full" style={{ background: colors.badge, color: colors.text }}>
                                ~{slot.targetCalories} kcal
                              </span>
                            )}
                          </div>

                          {/* Food items */}
                          <div className="divide-y" style={{ borderColor: colors.border }}>
                            {slot.items.length === 0 ? (
                              <p className="px-4 py-3 text-xs text-gray-400">No items</p>
                            ) : slot.items.map((food, idx) => (
                              <div key={food.foodItemId} className="flex items-start justify-between px-4 py-3 gap-3">
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                                    style={{ background: colors.badge, color: colors.text }}>
                                    {idx + 1}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-sm font-semibold text-gray-900 truncate">{food.foodName}</p>
                                    <p className="text-xs text-gray-400">{food.quantityG} g{food.servingUnit ? ` · ${food.servingUnit}` : ""}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3 flex-shrink-0 text-right">
                                  <div>
                                    <p className="text-sm font-bold" style={{ color: colors.text }}>{food.calories} kcal</p>
                                    <p className="text-[10px] text-gray-400">
                                      P {food.proteinG}g · C {food.carbsG}g · F {food.fatG}g
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* ── Empty / error state ── */
                  <div className="max-w-2xl mx-auto">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-extrabold text-gray-900">Day {day}</h2>
                      <div className="flex items-center gap-2">
                        <button onClick={() => goToDay(day - 1)} disabled={day <= 1}
                          className="w-8 h-8 rounded-xl border text-sm font-bold text-gray-500 hover:border-violet-400 hover:text-violet-600 disabled:opacity-30 transition"
                          style={{ borderColor: "rgba(139,92,246,0.15)" }}>‹</button>
                        <button onClick={() => goToDay(day + 1)} disabled={day >= 30}
                          className="w-8 h-8 rounded-xl border text-sm font-bold text-gray-500 hover:border-violet-400 hover:text-violet-600 disabled:opacity-30 transition"
                          style={{ borderColor: "rgba(139,92,246,0.15)" }}>›</button>
                      </div>
                    </div>

                    <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "rgba(139,92,246,0.1)", background: "linear-gradient(135deg,#faf5ff,#f5f3ff)" }}>
                      <div className="flex flex-col items-center py-12 px-6 text-center">
                        <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-4"
                          style={{ background: "linear-gradient(135deg,#ede9fe,#ddd6fe)", boxShadow: "0 4px 14px rgba(139,92,246,0.12)" }}>
                          {scheduleError ? "⚠️" : "🗓️"}
                        </div>
                        <p className="text-sm font-bold text-gray-800 mb-1">
                          {scheduleError ? "Meal schedule unavailable" : "No meals for this day"}
                        </p>
                        <p className="text-xs text-gray-400 max-w-xs leading-relaxed">
                          {scheduleError
                            ? "Detailed meal data isn't available for this plan yet. Upgrade to an AI Plan for a personalised daily schedule."
                            : "This day doesn't have a scheduled meal plan. Try a different day or upgrade to an AI Plan."}
                        </p>
                        {plan && (
                          <div className="mt-6 w-full max-w-xs rounded-xl p-4 bg-white/80 border text-left space-y-2" style={{ borderColor: "rgba(139,92,246,0.1)" }}>
                            <p className="text-[10px] font-bold text-violet-500 uppercase tracking-widest mb-3">Your Daily Targets</p>
                            {[
                              { label: "Calories", value: `${plan.dailyCalories} kcal`, color: "#7c3aed" },
                              { label: "Protein",  value: `${plan.protein} g`,         color: "#2563eb" },
                              { label: "Carbs",    value: `${plan.carbs} g`,           color: "#059669" },
                              { label: "Fat",      value: `${plan.fat} g`,             color: "#ea580c" },
                            ].map(m => (
                              <div key={m.label} className="flex justify-between items-center">
                                <span className="text-xs text-gray-500">{m.label}</span>
                                <span className="text-xs font-bold" style={{ color: m.color }}>{m.value}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        <Link href="/subscriptions"
                          className="mt-6 text-xs font-bold text-white px-5 py-2.5 rounded-xl btn-gradient shadow-md shadow-violet-200">
                          Upgrade to AI Plan →
                        </Link>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
