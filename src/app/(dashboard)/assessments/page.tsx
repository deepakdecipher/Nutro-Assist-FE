"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { isAuthenticated, api } from "@/lib/api";
import { Sidebar } from "@/components/Sidebar";

// ── Types ────────────────────────────────────────────────────
interface AssessmentStatus { completed: boolean; dailyCalorieTarget: number; }
interface AssessmentResponse {
  id: number; fullName: string; dailyCalorieTarget: number; completed: boolean;
  activityLevel: string; goal: string;
}

interface FormState {
  fullName: string; age: string; gender: string;
  heightCm: string; weightKg: string;
  activityLevel: string; goal: string;
  dietaryPreferences: string; allergies: string; medicalConditions: string;
  foodInterests: string;
}

// ── Step metadata ─────────────────────────────────────────────
const STEPS = [
  { label: "Personal Info",    icon: "👤" },
  { label: "Body Metrics",     icon: "📏" },
  { label: "Activity & Goals", icon: "🎯" },
  { label: "Dietary Info",     icon: "🥗" },
  { label: "Food Interests",   icon: "🍽️" },
];

// ── Activity levels ───────────────────────────────────────────
const ACTIVITY_LEVELS = [
  { value: "SEDENTARY",         label: "Sedentary",         desc: "Desk job, little or no exercise", icon: "🪑" },
  { value: "LIGHTLY_ACTIVE",    label: "Lightly Active",    desc: "Light exercise 1–3 days/week",    icon: "🚶" },
  { value: "MODERATELY_ACTIVE", label: "Moderately Active", desc: "Moderate exercise 3–5 days/week", icon: "🏃" },
  { value: "VERY_ACTIVE",       label: "Very Active",       desc: "Hard exercise 6–7 days/week",     icon: "💪" },
  { value: "EXTRA_ACTIVE",      label: "Extra Active",      desc: "Very hard exercise or physical job", icon: "🏋️" },
];

// ── Goals ─────────────────────────────────────────────────────
const GOALS = [
  { value: "WEIGHT_LOSS",    label: "Lose Weight",      icon: "⬇️", gradient: "linear-gradient(135deg,#059669,#10b981)" },
  { value: "MAINTAIN_WEIGHT",label: "Maintain Weight",  icon: "⚖️", gradient: "linear-gradient(135deg,#2563eb,#0ea5e9)" },
  { value: "WEIGHT_GAIN",    label: "Gain Weight",      icon: "⬆️", gradient: "linear-gradient(135deg,#ea580c,#f97316)" },
  { value: "MUSCLE_BUILDING",label: "Build Muscle",     icon: "💪", gradient: "linear-gradient(135deg,#7c3aed,#9333ea)" },
  { value: "IMPROVE_FITNESS",label: "Improve Fitness",  icon: "🏃", gradient: "linear-gradient(135deg,#db2777,#ec4899)" },
];

// ── Stepper ───────────────────────────────────────────────────
function Stepper({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-0 mb-6">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="flex items-center flex-1 last:flex-none">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all duration-300 ${
            i < current ? "text-white shadow-md" : i === current ? "text-white shadow-lg scale-110" : "bg-gray-100 text-gray-400"
          }`}
            style={i <= current ? { background: "linear-gradient(135deg,#7c3aed,#9333ea)" } : {}}>
            {i < current ? "✓" : i + 1}
          </div>
          {i < total - 1 && (
            <div className={`flex-1 h-0.5 mx-1 rounded-full transition-all duration-500 ${i < current ? "bg-violet-400" : "bg-gray-100"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ── Card select ───────────────────────────────────────────────
function CardSelect({ options, value, onChange }: {
  options: { value: string; label: string; desc?: string; icon: string; gradient?: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-2">
      {options.map(opt => (
        <button key={opt.value} type="button"
          onClick={() => onChange(opt.value)}
          className={`flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all duration-200 ${
            value === opt.value
              ? "border-violet-400 bg-violet-50 shadow-sm"
              : "border-gray-100 hover:border-violet-200 hover:bg-violet-50/40"
          }`}>
          <div className="w-9 h-9 rounded-lg flex items-center justify-center text-lg flex-shrink-0"
            style={{ background: opt.gradient ?? (value === opt.value ? "linear-gradient(135deg,#ede9fe,#ddd6fe)" : "#f3f4f6") }}>
            {opt.icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-bold ${value === opt.value ? "text-violet-700" : "text-gray-800"}`}>{opt.label}</p>
            {opt.desc && <p className="text-[11px] text-gray-400 truncate">{opt.desc}</p>}
          </div>
          <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 transition-all ${
            value === opt.value ? "border-violet-600 bg-violet-600" : "border-gray-300"
          }`}>
            {value === opt.value && <div className="w-full h-full rounded-full scale-50 bg-white" />}
          </div>
        </button>
      ))}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────
export default function AssessmentsPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pageState, setPageState] = useState<"checking" | "completed" | "wizard">("checking");
  const [completedData, setCompletedData] = useState<AssessmentStatus | null>(null);
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<FormState>({
    fullName: "", age: "", gender: "male",
    heightCm: "", weightKg: "",
    activityLevel: "MODERATELY_ACTIVE", goal: "MAINTAIN_WEIGHT",
    dietaryPreferences: "", allergies: "", medicalConditions: "",
    foodInterests: "",
  });

  useEffect(() => {
    setMounted(true);
    if (!isAuthenticated()) { router.replace("/login"); return; }
    checkStatus();
  }, [router]);

  async function checkStatus() {
    try {
      const status = await api.get<AssessmentStatus>("/api/assessments/status");
      if (status.completed) {
        setCompletedData(status);
        setPageState("completed");
      } else {
        setPageState("wizard");
      }
    } catch {
      setPageState("wizard");
    }
  }

  function set(key: keyof FormState, value: string) {
    setForm(f => ({ ...f, [key]: value }));
  }

  function canAdvance(): boolean {
    if (step === 0) return form.fullName.trim().length >= 2 && parseInt(form.age) >= 1 && parseInt(form.age) <= 120;
    if (step === 1) {
      const h = parseFloat(form.heightCm), w = parseFloat(form.weightKg);
      return h >= 50 && h <= 300 && w >= 10 && w <= 500;
    }
    return true;
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError("");
    try {
      await api.post<AssessmentResponse>("/api/assessments", {
        fullName: form.fullName.trim(),
        age: parseInt(form.age),
        gender: form.gender,
        heightCm: parseFloat(form.heightCm),
        weightKg: parseFloat(form.weightKg),
        activityLevel: form.activityLevel,
        goal: form.goal,
        dietaryPreferences: form.dietaryPreferences || null,
        allergies: form.allergies || null,
        medicalConditions: form.medicalConditions || null,
        foodInterests: form.foodInterests || null,
      });
      router.push("/diet-plans");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save assessment. Please try again.");
      setSubmitting(false);
    }
  }

  if (!mounted) return null;

  return (
    <div className="flex h-screen bg-mesh overflow-hidden">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="anim-fade-in flex items-center gap-4 px-6 py-4 bg-white/80 backdrop-blur-sm border-b"
          style={{ borderColor: "rgba(139,92,246,0.08)" }}>
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-xl text-gray-500 hover:bg-violet-50 hover:text-violet-600 transition">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div>
            <h1 className="text-base font-bold text-gray-900">Health Assessment</h1>
            <p className="text-xs text-gray-400 hidden sm:block">Build your personalized nutrition profile</p>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-5 lg:p-6">
          <div className="max-w-lg mx-auto">

            {/* Checking status */}
            {pageState === "checking" && (
              <div className="flex items-center justify-center h-48">
                <div className="w-8 h-8 border-2 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
              </div>
            )}

            {/* Already completed */}
            {pageState === "completed" && completedData && (
              <div className="anim-scale-in space-y-5">
                <div className="relative rounded-3xl p-8 text-white overflow-hidden"
                  style={{ background: "linear-gradient(135deg, #1e1b4b 0%, #3730a3 40%, #6d28d9 75%, #7c3aed 100%)" }}>
                  <div className="anim-float absolute top-0 right-0 w-44 h-44 rounded-full opacity-20 -translate-y-1/3 translate-x-1/3"
                    style={{ background: "radial-gradient(circle,#a78bfa,transparent)" }} />
                  <div className="relative z-10">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold text-green-300 mb-4"
                      style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)" }}>
                      ✓ Assessment complete
                    </div>
                    <h2 className="text-2xl font-extrabold mb-1">Your profile is ready</h2>
                    <p className="text-indigo-200 text-sm mb-1">Daily calorie target</p>
                    <p className="text-4xl font-extrabold mb-5">{completedData.dailyCalorieTarget} <span className="text-lg font-normal text-indigo-300">kcal/day</span></p>
                    <div className="flex gap-3 flex-wrap">
                      <Link href="/diet-plans"
                        className="inline-flex items-center gap-2 bg-white text-violet-700 text-sm font-bold px-5 py-2.5 rounded-xl shadow-lg hover:-translate-y-0.5 transition-transform">
                        View Diet Plan →
                      </Link>
                      <button onClick={() => setPageState("wizard")}
                        className="inline-flex items-center gap-2 text-white/80 text-sm font-semibold px-5 py-2.5 rounded-xl hover:text-white transition-colors"
                        style={{ background: "rgba(255,255,255,0.12)" }}>
                        Update Profile
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Wizard */}
            {pageState === "wizard" && (
              <div className="space-y-5">
                {/* Progress */}
                <div className="anim-fade-in-up bg-white rounded-2xl border p-5"
                  style={{ borderColor: "rgba(139,92,246,0.07)", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-extrabold text-gray-900">{STEPS[step].icon} {STEPS[step].label}</p>
                    <span className="text-xs text-gray-400">Step {step + 1} of {STEPS.length}</span>
                  </div>
                  <Stepper current={step} total={STEPS.length} />

                  {error && (
                    <div className="anim-scale-in mb-4 flex items-center gap-2.5 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                      <span className="text-red-500">⚠</span>
                      <p className="text-xs text-red-600">{error}</p>
                    </div>
                  )}

                  {/* Step 0: Personal Info */}
                  {step === 0 && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Full Name</label>
                        <input type="text" value={form.fullName} onChange={e => set("fullName", e.target.value)}
                          className="input-field" placeholder="Your full name" autoFocus />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Age</label>
                        <input type="number" min={1} max={120} value={form.age} onChange={e => set("age", e.target.value)}
                          className="input-field" placeholder="e.g. 28" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Gender</label>
                        <div className="grid grid-cols-2 gap-3">
                          {[{ value: "male", label: "Male", icon: "👨" }, { value: "female", label: "Female", icon: "👩" }].map(g => (
                            <button key={g.value} type="button" onClick={() => set("gender", g.value)}
                              className={`flex items-center justify-center gap-2 py-3 rounded-xl border font-bold text-sm transition-all ${
                                form.gender === g.value
                                  ? "border-violet-400 bg-violet-50 text-violet-700 shadow-sm"
                                  : "border-gray-100 text-gray-500 hover:border-violet-200"
                              }`}>
                              <span className="text-xl">{g.icon}</span> {g.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 1: Body Metrics */}
                  {step === 1 && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Height</label>
                        <div className="relative">
                          <input type="number" step="0.1" min={50} max={300} value={form.heightCm}
                            onChange={e => set("heightCm", e.target.value)}
                            className="input-field pr-10" placeholder="e.g. 175" autoFocus />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-semibold">cm</span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Weight</label>
                        <div className="relative">
                          <input type="number" step="0.1" min={10} max={500} value={form.weightKg}
                            onChange={e => set("weightKg", e.target.value)}
                            className="input-field pr-10" placeholder="e.g. 70.5" />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-semibold">kg</span>
                        </div>
                      </div>
                      {form.heightCm && form.weightKg && (
                        <div className="flex items-center gap-2 p-3 bg-violet-50 rounded-xl border border-violet-100">
                          <span className="text-lg">📊</span>
                          <div>
                            <p className="text-xs text-gray-500">BMI estimate</p>
                            <p className="text-sm font-bold text-violet-700">
                              {(parseFloat(form.weightKg) / Math.pow(parseFloat(form.heightCm) / 100, 2)).toFixed(1)}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Step 2: Activity & Goals */}
                  {step === 2 && (
                    <div className="space-y-5">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Activity Level</label>
                        <CardSelect options={ACTIVITY_LEVELS} value={form.activityLevel} onChange={v => set("activityLevel", v)} />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Your Goal</label>
                        <div className="grid grid-cols-1 gap-2">
                          {GOALS.map(g => (
                            <button key={g.value} type="button" onClick={() => set("goal", g.value)}
                              className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                                form.goal === g.value
                                  ? "border-violet-400 bg-violet-50 shadow-sm"
                                  : "border-gray-100 hover:border-violet-200 hover:bg-violet-50/40"
                              }`}>
                              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base flex-shrink-0"
                                style={{ background: g.gradient }}>
                                {g.icon}
                              </div>
                              <p className={`text-sm font-bold ${form.goal === g.value ? "text-violet-700" : "text-gray-800"}`}>{g.label}</p>
                              <div className={`ml-auto w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                                form.goal === g.value ? "border-violet-600 bg-violet-600" : "border-gray-300"
                              }`} />
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 3: Dietary Info */}
                  {step === 3 && (
                    <div className="space-y-4">
                      <p className="text-xs text-gray-400 -mt-1">All fields optional — the more you share, the better your plan.</p>
                      {[
                        { key: "dietaryPreferences" as keyof FormState, label: "Dietary Preferences", placeholder: "e.g. vegetarian, vegan, keto, no pork…" },
                        { key: "allergies" as keyof FormState, label: "Allergies", placeholder: "e.g. nuts, dairy, gluten, shellfish…" },
                        { key: "medicalConditions" as keyof FormState, label: "Medical Conditions", placeholder: "e.g. diabetes, hypertension, thyroid…" },
                      ].map(field => (
                        <div key={field.key}>
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">{field.label}</label>
                          <textarea value={form[field.key]} onChange={e => set(field.key, e.target.value)}
                            rows={2} className="input-field resize-none" placeholder={field.placeholder} />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Step 4: Food Interests */}
                  {step === 4 && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Food Interests</label>
                        <textarea value={form.foodInterests} onChange={e => set("foodInterests", e.target.value)}
                          rows={3} className="input-field resize-none" autoFocus
                          placeholder="e.g. Indian cuisine, Mediterranean food, high-protein meals, meal prep friendly…" />
                        <p className="text-[11px] text-gray-400 mt-1.5">Help the AI understand your food culture and preferences.</p>
                      </div>
                      <div className="p-4 bg-violet-50 rounded-xl border border-violet-100">
                        <p className="text-xs font-bold text-violet-700 mb-2">Ready to generate your plan</p>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-gray-500">
                          <span>👤 {form.fullName || "—"}</span>
                          <span>📅 Age {form.age || "—"}</span>
                          <span>📏 {form.heightCm || "—"} cm · {form.weightKg || "—"} kg</span>
                          <span>🎯 {GOALS.find(g => g.value === form.goal)?.label || "—"}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Navigation */}
                <div className="flex gap-3">
                  {step > 0 && (
                    <button onClick={() => setStep(s => s - 1)} disabled={submitting}
                      className="flex-1 py-3 rounded-xl border text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all disabled:opacity-60">
                      ← Back
                    </button>
                  )}
                  {step < STEPS.length - 1 ? (
                    <button onClick={() => setStep(s => s + 1)} disabled={!canAdvance()}
                      className="flex-1 py-3 rounded-xl text-sm font-bold text-white btn-gradient shadow-md shadow-violet-200 disabled:opacity-40 hover:-translate-y-0.5 active:translate-y-0 transition-all">
                      Next →
                    </button>
                  ) : (
                    <button onClick={handleSubmit} disabled={submitting}
                      className="flex-1 py-3 rounded-xl text-sm font-bold text-white btn-gradient shadow-md shadow-violet-200 disabled:opacity-60 hover:-translate-y-0.5 active:translate-y-0 transition-all">
                      {submitting
                        ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving…</span>
                        : "Complete Assessment →"}
                    </button>
                  )}
                </div>
              </div>
            )}

          </div>
        </main>
      </div>
    </div>
  );
}
