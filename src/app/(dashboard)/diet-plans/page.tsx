"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { isAuthenticated, api, SessionExpiredError, ensureFreshToken } from "@/lib/api";
import { Sidebar } from "@/components/Sidebar";

// ── Types ────────────────────────────────────────────────────
interface PlanMeal {
  planMealId: number;
  mealType: string;
  mealName: string;
  description: string;
  plannedCalories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  isLogged: boolean;
  consumedCalories: number;
}

interface PlanDay {
  planDayId: number;
  date: string;
  dayNumber: number;
  dayLabel: string;
  isToday: boolean;
  totalPlannedCalories: number;
  totalConsumedCalories: number;
  meals: PlanMeal[];
}

interface WeekView {
  planId: number;
  planName: string;
  planType: string;
  planStatus: string;
  dailyCalorieTarget: number;
  startDate: string;
  endDate: string;
  todayConsumedCalories: number;
  week: PlanDay[];
}

interface TemplateSummary {
  id: number;
  name: string;
  goal: string;
  totalDays: number;
}

// ── Meal metadata ────────────────────────────────────────────
const MEAL_META: Record<string, { icon: string; label: string; gradient: string; shadow: string }> = {
  BREAKFAST:     { icon: "🌅", label: "Breakfast",     gradient: "linear-gradient(135deg,#f59e0b,#fbbf24)", shadow: "rgba(245,158,11,0.3)" },
  MORNING_SNACK: { icon: "🍎", label: "Morning Snack", gradient: "linear-gradient(135deg,#10b981,#34d399)", shadow: "rgba(16,185,129,0.25)" },
  LUNCH:         { icon: "🍽️", label: "Lunch",         gradient: "linear-gradient(135deg,#7c3aed,#9333ea)", shadow: "rgba(124,58,237,0.3)" },
  EVENING_SNACK: { icon: "🍊", label: "Evening Snack", gradient: "linear-gradient(135deg,#ea580c,#f97316)", shadow: "rgba(234,88,12,0.25)" },
  DINNER:        { icon: "🌙", label: "Dinner",        gradient: "linear-gradient(135deg,#2563eb,#0ea5e9)", shadow: "rgba(37,99,235,0.25)" },
};

// ── Calorie bar ───────────────────────────────────────────────
function CalorieBar({ consumed, target }: { consumed: number; target: number }) {
  const pct = target > 0 ? Math.min((consumed / target) * 100, 100) : 0;
  const remaining = Math.max(target - consumed, 0);
  const col = pct > 95 ? "#ef4444" : pct > 75 ? "#f97316" : "#7c3aed";

  return (
    <div className="bg-white rounded-2xl border p-5"
      style={{ borderColor: "rgba(139,92,246,0.07)", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Today&apos;s Calories</p>
        <span className="text-xs text-gray-400">{remaining} kcal remaining</span>
      </div>
      <div className="flex items-baseline gap-1.5 mb-3">
        <span className="text-2xl font-extrabold transition-all" style={{ color: col }}>{consumed}</span>
        <span className="text-sm text-gray-400 font-medium">/ {target} kcal</span>
      </div>
      <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: `linear-gradient(90deg,${col},${col}cc)`, boxShadow: `0 0 8px ${col}40` }} />
      </div>
      {pct > 95 && (
        <p className="text-[11px] text-red-500 font-semibold mt-1.5">Daily target reached!</p>
      )}
    </div>
  );
}

// ── Meal card ─────────────────────────────────────────────────
function MealCard({
  meal, dayId, onLogged,
}: { meal: PlanMeal; dayId: number; onLogged: (mealId: number) => void }) {
  const meta = MEAL_META[meal.mealType] ?? {
    icon: "🍴", label: meal.mealType,
    gradient: "linear-gradient(135deg,#6b7280,#9ca3af)", shadow: "rgba(107,114,128,0.2)",
  };
  const [logging, setLogging] = useState(false);
  const [logError, setLogError] = useState("");

  async function handleLog() {
    if (meal.isLogged || logging) return;
    setLogging(true);
    setLogError("");
    try {
      await ensureFreshToken();
      await api.postLong("/api/food-logs", {
        planDayId: dayId,
        planMealId: meal.planMealId,
      });
      onLogged(meal.planMealId);
    } catch (err) {
      if (err instanceof SessionExpiredError) {
        setLogError("Session expired. Please log in again.");
      }
      // other errors: silent — user can retry
    } finally {
      setLogging(false);
    }
  }

  return (
    <div className={`flex items-start gap-4 p-4 rounded-2xl border bg-white transition-all duration-200 ${
      meal.isLogged ? "opacity-80" : "hover:-translate-y-0.5 hover:shadow-md"
    }`}
      style={{ borderColor: meal.isLogged ? "rgba(5,150,105,0.2)" : "rgba(139,92,246,0.07)", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
        style={{ background: meta.gradient, boxShadow: `0 4px 10px -2px ${meta.shadow}` }}>
        {meta.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{meta.label}</p>
            <p className="text-sm font-bold text-gray-900 leading-tight truncate">{meal.mealName}</p>
          </div>
          <button
            onClick={handleLog}
            disabled={meal.isLogged || logging}
            className={`flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold transition-all duration-200 ${
              meal.isLogged
                ? "bg-green-100 text-green-600 cursor-default"
                : logging
                  ? "bg-violet-100"
                  : "bg-violet-100 text-violet-700 hover:bg-violet-600 hover:text-white hover:-translate-y-0.5 shadow-sm"
            }`}>
            {logging
              ? <span className="w-3 h-3 border-2 border-violet-400 border-t-violet-700 rounded-full animate-spin" />
              : meal.isLogged ? "✓" : "+"}
          </button>
        </div>
        {meal.description && (
          <p className="text-xs text-gray-400 mt-0.5 leading-relaxed line-clamp-2">{meal.description}</p>
        )}
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
            meal.isLogged ? "bg-green-50 text-green-700" : "bg-violet-50 text-violet-700"
          }`}>
            {meal.isLogged ? "✓ " : ""}{meal.plannedCalories} kcal
          </span>
          <span className="text-[10px] text-gray-400">P: {meal.proteinG.toFixed(0)}g</span>
          <span className="text-[10px] text-gray-400">C: {meal.carbsG.toFixed(0)}g</span>
          <span className="text-[10px] text-gray-400">F: {meal.fatG.toFixed(0)}g</span>
        </div>
        {logError && (
          <p className="text-[11px] text-red-500 font-semibold mt-1">{logError}</p>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────
const GOAL_META: Record<string, { label: string; icon: string; color: string; border: string; gradient: string }> = {
  WEIGHT_LOSS:     { label: "Weight Loss",     icon: "🔥", color: "#dc2626", border: "rgba(220,38,38,0.2)",   gradient: "linear-gradient(135deg,#dc2626,#ef4444)" },
  MAINTAIN_WEIGHT: { label: "Balanced",        icon: "⚖️", color: "#0891b2", border: "rgba(8,145,178,0.2)",   gradient: "linear-gradient(135deg,#0891b2,#06b6d4)" },
  MUSCLE_BUILDING: { label: "Muscle Building", icon: "💪", color: "#16a34a", border: "rgba(22,163,74,0.2)",   gradient: "linear-gradient(135deg,#16a34a,#22c55e)" },
};

export default function DietPlansPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pageState, setPageState] = useState<"loading" | "no-plan" | "generating" | "assigning" | "week-view">("loading");
  const [weekData, setWeekData] = useState<WeekView | null>(null);
  const [selectedDayIdx, setSelectedDayIdx] = useState(0);
  const [error, setError] = useState("");
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);

  useEffect(() => {
    setMounted(true);
    if (!isAuthenticated()) { router.replace("/login"); return; }
    loadActivePlan();
    loadTemplates();
  }, [router]);

  async function loadTemplates() {
    try {
      const list = await api.get<TemplateSummary[]>("/api/diet-plans/templates");
      setTemplates(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error("Failed to load templates:", err);
    }
  }

  async function loadActivePlan() {
    setPageState("loading");
    setError("");
    try {
      const result = await api.get<WeekView>("/api/diet-plans/active");
      if (result && typeof result === "object" && "planId" in result) {
        applyWeekData(result);
      } else {
        setPageState("no-plan");
      }
    } catch {
      setPageState("no-plan");
    }
  }

  function applyWeekData(data: WeekView) {
    setWeekData(data);
    const todayIdx = data.week.findIndex(d => d.isToday);
    setSelectedDayIdx(todayIdx >= 0 ? todayIdx : 0);
    setPageState("week-view");
  }

  async function handleGenerate() {
    setPageState("generating");
    setError("");
    try {
      await ensureFreshToken();
      const data = await api.postLong<WeekView>("/api/diet-plans/generate", {});
      applyWeekData(data);
    } catch (err: unknown) {
      if (err instanceof SessionExpiredError) {
        setError("Your session expired while generating the plan. Please log in again and retry.");
      } else {
        setError(err instanceof Error ? err.message : "Failed to generate plan. Please try again.");
      }
      setPageState("no-plan");
    }
  }

  async function handleAssignTemplate(templateId: number) {
    setPageState("assigning");
    setError("");
    try {
      const data = await api.post<WeekView>(`/api/diet-plans/assign/${templateId}`, {});
      applyWeekData(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to assign plan. Please try again.");
      setPageState("no-plan");
    }
  }

  function handleMealLogged(dayIdx: number, mealId: number) {
    if (!weekData) return;
    const newWeek = weekData.week.map((day, di) => {
      if (di !== dayIdx) return day;
      const meals = day.meals.map(m =>
        m.planMealId === mealId
          ? { ...m, isLogged: true, consumedCalories: m.plannedCalories }
          : m
      );
      const consumed = meals.reduce((s, m) => s + (m.isLogged ? m.consumedCalories : 0), 0);
      return { ...day, meals, totalConsumedCalories: consumed };
    });
    const today = newWeek.find(d => d.isToday);
    setWeekData({ ...weekData, week: newWeek, todayConsumedCalories: today?.totalConsumedCalories ?? weekData.todayConsumedCalories });
  }

  if (!mounted) return null;

  const selectedDay = weekData?.week[selectedDayIdx] ?? null;

  return (
    <div className="flex h-screen bg-mesh overflow-hidden">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Header */}
        <header className="anim-fade-in flex items-center justify-between px-6 py-4 bg-white/80 backdrop-blur-sm border-b"
          style={{ borderColor: "rgba(139,92,246,0.08)" }}>
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-xl text-gray-500 hover:bg-violet-50 hover:text-violet-600 transition">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div>
              <h1 className="text-base font-bold text-gray-900">Diet Plans</h1>
              <p className="text-xs text-gray-400 hidden sm:block">Your personalized AI meal plans</p>
            </div>
          </div>
          {weekData && pageState === "week-view" && (
            <span className={`text-[10px] font-bold px-3 py-1.5 rounded-full ${
              weekData.planStatus === "ACTIVE" ? "bg-violet-100 text-violet-700" : "bg-gray-100 text-gray-500"
            }`}>
              {weekData.planType === "AI_GENERATED" ? "🤖" : "👨‍⚕️"} {weekData.planName} · {weekData.planStatus}
            </span>
          )}
        </header>

        <main className="flex-1 overflow-y-auto p-5 lg:p-6">
          <div className="max-w-2xl mx-auto">

            {/* Loading */}
            {pageState === "loading" && (
              <div className="flex items-center justify-center h-48">
                <div className="w-8 h-8 border-2 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
              </div>
            )}

            {/* Generating / Assigning plan */}
            {(pageState === "generating" || pageState === "assigning") && (
              <div className="anim-scale-in flex flex-col items-center justify-center py-24 text-center">
                <div className="relative w-20 h-20 mb-6">
                  <div className="absolute inset-0 rounded-full border-4 border-violet-100" />
                  <div className="absolute inset-0 rounded-full border-4 border-t-violet-600 animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center text-3xl">
                    {pageState === "assigning" ? "📋" : "🤖"}
                  </div>
                </div>
                <h2 className="text-xl font-extrabold text-gray-900 mb-2">
                  {pageState === "assigning" ? "Setting up your plan…" : "Crafting your plan…"}
                </h2>
                <p className="text-sm text-gray-400 max-w-xs leading-relaxed">
                  {pageState === "assigning"
                    ? "Preparing your nutritionist-designed meal plan."
                    : "Our AI is building a 30-day personalized nutrition plan. This takes about 30 seconds."}
                </p>
                <div className="mt-6 flex gap-1">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="w-2 h-2 rounded-full bg-violet-300 animate-bounce"
                      style={{ animationDelay: `${i * 150}ms` }} />
                  ))}
                </div>
              </div>
            )}

            {/* No active plan */}
            {pageState === "no-plan" && (
              <div className="space-y-5">
                {error && (
                  <div className="anim-scale-in flex items-center gap-2.5 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                    <span className="text-red-500 text-lg">⚠</span>
                    <p className="text-xs text-red-600">{error}</p>
                  </div>
                )}
                <div className="anim-scale-in flex flex-col items-center py-10 text-center">
                  <div className="anim-pop-in w-20 h-20 rounded-3xl flex items-center justify-center text-4xl mb-5"
                    style={{ background: "linear-gradient(135deg,#ede9fe,#f5f3ff)", boxShadow: "0 8px 24px rgba(139,92,246,0.12)" }}>
                    🥗
                  </div>
                  <h2 className="anim-fade-in-up delay-100 text-xl font-extrabold text-gray-900 mb-2">Start your nutrition journey</h2>
                  <p className="anim-fade-in-up delay-150 text-sm text-gray-400 max-w-xs leading-relaxed">
                    Generate a personalized AI diet plan or update your health profile first.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Generate AI plan */}
                  <button onClick={handleGenerate}
                    className="anim-fade-in-up delay-200 group relative overflow-hidden rounded-2xl border p-6 text-left bg-white hover:-translate-y-1 hover:shadow-lg transition-all duration-200"
                    style={{ borderColor: "rgba(124,58,237,0.2)", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                    <div className="absolute top-0 right-0 w-24 h-24 rounded-full -translate-y-1/2 translate-x-1/2 opacity-10 group-hover:opacity-20 transition-opacity"
                      style={{ background: "radial-gradient(circle,#7c3aed,transparent)" }} />
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl mb-4 shadow-md"
                      style={{ background: "linear-gradient(135deg,#7c3aed,#9333ea)", boxShadow: "0 4px 12px -2px rgba(124,58,237,0.35)" }}>
                      🤖
                    </div>
                    <p className="font-bold text-gray-900 mb-1">AI Generated Plan</p>
                    <p className="text-xs text-gray-400 leading-relaxed">30-day plan tailored to your goals, body, and preferences</p>
                    <div className="mt-4 text-xs font-bold text-violet-600 group-hover:translate-x-0.5 transition-transform">Generate now →</div>
                  </button>
                  {/* Update profile */}
                  <Link href="/assessments"
                    className="anim-fade-in-up delay-250 group relative overflow-hidden rounded-2xl border p-6 text-left bg-white hover:-translate-y-1 hover:shadow-lg transition-all duration-200"
                    style={{ borderColor: "rgba(37,99,235,0.2)", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                    <div className="absolute top-0 right-0 w-24 h-24 rounded-full -translate-y-1/2 translate-x-1/2 opacity-10 group-hover:opacity-20 transition-opacity"
                      style={{ background: "radial-gradient(circle,#2563eb,transparent)" }} />
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl mb-4 shadow-md"
                      style={{ background: "linear-gradient(135deg,#2563eb,#0ea5e9)", boxShadow: "0 4px 12px -2px rgba(37,99,235,0.3)" }}>
                      👤
                    </div>
                    <p className="font-bold text-gray-900 mb-1">Update Profile</p>
                    <p className="text-xs text-gray-400 leading-relaxed">Complete your health assessment before generating a plan</p>
                    <div className="mt-4 text-xs font-bold text-blue-600 group-hover:translate-x-0.5 transition-transform">Go to assessment →</div>
                  </Link>
                </div>

                {/* Nutritionist sheet plans */}
                {templates.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Nutritionist Plans</p>
                    <div className="grid grid-cols-1 gap-3">
                      {templates.map((t, i) => {
                        const meta = GOAL_META[t.goal] ?? { label: t.goal, icon: "📋", color: "#7c3aed", border: "rgba(124,58,237,0.2)", gradient: "linear-gradient(135deg,#7c3aed,#9333ea)" };
                        return (
                          <button key={t.id} onClick={() => handleAssignTemplate(t.id)}
                            className="anim-fade-in-up group relative overflow-hidden rounded-2xl border p-5 text-left bg-white hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200"
                            style={{ borderColor: meta.border, boxShadow: "0 1px 4px rgba(0,0,0,0.04)", animationDelay: `${(i + 3) * 50}ms` }}>
                            <div className="flex items-center gap-4">
                              <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                                style={{ background: meta.gradient, boxShadow: `0 4px 10px -2px ${meta.border}` }}>
                                {meta.icon}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="font-bold text-gray-900 truncate">{t.name}</p>
                                  <span className="flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full"
                                    style={{ background: `${meta.color}18`, color: meta.color }}>
                                    {meta.label}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-400">{t.totalDays}-day nutritionist-designed meal plan</p>
                              </div>
                              <div className="text-xs font-bold group-hover:translate-x-0.5 transition-transform flex-shrink-0"
                                style={{ color: meta.color }}>→</div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Week view */}
            {pageState === "week-view" && weekData && (
              <div className="space-y-4">

                {/* Calorie tracker */}
                <div className="anim-fade-in-up">
                  <CalorieBar consumed={weekData.todayConsumedCalories} target={weekData.dailyCalorieTarget} />
                </div>

                {/* Day strip */}
                <div className="anim-fade-in-up delay-100 bg-white rounded-2xl border overflow-hidden"
                  style={{ borderColor: "rgba(139,92,246,0.07)", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                  <div className="px-4 pt-4 pb-3 overflow-x-auto">
                    <div className="flex gap-1 min-w-max">
                      {weekData.week.map((day, i) => {
                        const d = new Date(day.date + "T00:00:00");
                        const dayName = d.toLocaleDateString("en-US", { weekday: "short" });
                        const dayNum = d.getDate();
                        const isSelected = i === selectedDayIdx;
                        const logPct = day.totalPlannedCalories > 0
                          ? Math.min((day.totalConsumedCalories / day.totalPlannedCalories) * 100, 100)
                          : 0;

                        return (
                          <button key={day.planDayId}
                            onClick={() => setSelectedDayIdx(i)}
                            className={`flex flex-col items-center gap-1 px-3 py-2.5 rounded-xl transition-all duration-200 min-w-[52px] ${
                              isSelected ? "text-white shadow-md" : "text-gray-500 hover:bg-violet-50 hover:text-violet-700"
                            }`}
                            style={isSelected ? { background: "linear-gradient(135deg,#7c3aed,#9333ea)" } : {}}>
                            <span className="text-[9px] font-bold uppercase tracking-wider leading-none">
                              {day.isToday ? "TODAY" : dayName}
                            </span>
                            <span className="text-lg font-extrabold leading-tight">{dayNum}</span>
                            <div className={`w-7 h-1 rounded-full overflow-hidden ${isSelected ? "bg-white/30" : "bg-gray-100"}`}>
                              {logPct > 0 && (
                                <div className="h-full rounded-full"
                                  style={{ width: `${logPct}%`, background: isSelected ? "white" : "#7c3aed" }} />
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Selected day meals */}
                {selectedDay && (
                  <div className="anim-fade-in-up delay-150 space-y-3">
                    {/* Day summary header */}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-extrabold text-gray-900">
                          {selectedDay.isToday ? "Today" : selectedDay.dayLabel}
                        </p>
                        <p className="text-xs text-gray-400">
                          Day {selectedDay.dayNumber} · {selectedDay.date}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-gray-700">
                          {selectedDay.totalConsumedCalories} / {selectedDay.totalPlannedCalories} kcal
                        </p>
                        <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden mt-1 ml-auto">
                          <div className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${selectedDay.totalPlannedCalories > 0
                                ? Math.min((selectedDay.totalConsumedCalories / selectedDay.totalPlannedCalories) * 100, 100)
                                : 0}%`,
                              background: "linear-gradient(90deg,#7c3aed,#9333ea)",
                            }} />
                        </div>
                      </div>
                    </div>

                    {/* Meal cards */}
                    {selectedDay.meals.map(meal => (
                      <MealCard
                        key={meal.planMealId}
                        meal={meal}
                        dayId={selectedDay.planDayId}
                        onLogged={(mealId) => handleMealLogged(selectedDayIdx, mealId)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>
        </main>
      </div>
    </div>
  );
}
