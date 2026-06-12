"use client";

import Link from "next/link";

interface DietPlan {
  id: number;
  planName: string;
  startDate: string | null;
  endDate: string | null;
  active: boolean;
}

interface WeightLog {
  weight: number;
  logDate: string;
}

interface Props {
  dietPlans: DietPlan[];
  hasAssessment: boolean;
  weightLogs: WeightLog[];
  loading?: boolean;
}

type BannerType = "ASSESSMENT_PENDING" | "EXPIRING_PLAN" | "NO_ACTIVE_PLAN" | "GOAL_ACHIEVED" | "PROGRESS_UPDATE" | "WELCOME";

interface BannerData {
  type: BannerType;
  activePlan?: DietPlan;
  daysRemaining?: number;
  weightLost?: number;
  daysRunning?: number;
}

function daysUntil(endDate: string | null): number {
  if (!endDate) return Infinity;
  return Math.ceil((new Date(endDate).getTime() - Date.now()) / 86400000);
}

function computeBanner(
  plans: DietPlan[],
  hasAssessment: boolean,
  logs: WeightLog[]
): BannerData {
  if (!hasAssessment) return { type: "ASSESSMENT_PENDING" };

  const activePlan = plans.find((p) => p.active);

  if (!activePlan) return { type: "NO_ACTIVE_PLAN" };

  const daysRemaining = daysUntil(activePlan.endDate);
  if (daysRemaining <= 7 && daysRemaining > 0) {
    return { type: "EXPIRING_PLAN", activePlan, daysRemaining };
  }

  // 30-day milestone: celebrate between day 28 and day 35 to create a visible window
  if (activePlan.startDate) {
    const daysRunning = Math.floor((Date.now() - new Date(activePlan.startDate).getTime()) / 86400000);
    if (daysRunning >= 28 && daysRunning <= 35) {
      return { type: "GOAL_ACHIEVED", activePlan, daysRunning };
    }
  }

  if (logs.length >= 2) {
    const first = logs[logs.length - 1].weight;
    const latest = logs[0].weight;
    const weightLost = parseFloat((first - latest).toFixed(1));
    if (weightLost > 0) return { type: "PROGRESS_UPDATE", activePlan, weightLost };
  }

  return { type: "WELCOME", activePlan };
}

export function DashboardBanner({ dietPlans, hasAssessment, weightLogs, loading }: Props) {
  if (loading) {
    return <div className="h-32 rounded-3xl shimmer" />;
  }

  const { type, activePlan, daysRemaining, weightLost } = computeBanner(dietPlans, hasAssessment, weightLogs);

  if (type === "ASSESSMENT_PENDING") {
    return (
      <div
        className="anim-fade-in-up relative rounded-3xl p-7 lg:p-8 text-white overflow-hidden"
        style={{ background: "linear-gradient(135deg,#1e3a5f 0%,#1e40af 40%,#2563eb 100%)", boxShadow: "0 20px 50px -10px rgba(37,99,235,0.35)" }}
      >
        <div className="absolute top-0 right-0 w-52 h-52 rounded-full opacity-20 -translate-y-1/3 translate-x-1/4"
          style={{ background: "radial-gradient(circle,#93c5fd,transparent)" }} />
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.2) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.2) 1px,transparent 1px)", backgroundSize: "32px 32px" }} />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-5">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0"
            style={{ background: "rgba(255,255,255,0.15)" }}>📋</div>
          <div className="flex-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold text-blue-200 mb-2"
              style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.15)" }}>
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
              Action Required
            </div>
            <h2 className="text-xl lg:text-2xl font-extrabold text-white mb-1">Complete Your Assessment</h2>
            <p className="text-blue-200 text-sm">Complete your assessment to unlock personalized diet recommendations.</p>
          </div>
          <Link
            href="/assessments"
            className="flex-shrink-0 inline-flex items-center gap-2 bg-white text-blue-700 text-sm font-bold px-6 py-3 rounded-2xl hover:bg-blue-50 transition shadow-xl hover:-translate-y-0.5 active:translate-y-0 whitespace-nowrap"
          >
            Start Assessment
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
          </Link>
        </div>
      </div>
    );
  }

  if (type === "EXPIRING_PLAN") {
    return (
      <div
        className="anim-fade-in-up relative rounded-3xl p-7 lg:p-8 text-white overflow-hidden"
        style={{ background: "linear-gradient(135deg,#7c2d12 0%,#c2410c 40%,#ea580c 100%)", boxShadow: "0 20px 50px -10px rgba(234,88,12,0.35)" }}
      >
        <div className="absolute top-0 right-0 w-52 h-52 rounded-full opacity-20 -translate-y-1/3 translate-x-1/4"
          style={{ background: "radial-gradient(circle,#fed7aa,transparent)" }} />
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.2) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.2) 1px,transparent 1px)", backgroundSize: "32px 32px" }} />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-5">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0"
            style={{ background: "rgba(255,255,255,0.15)" }}>⏰</div>
          <div className="flex-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold text-orange-200 mb-2"
              style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.15)" }}>
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-300 animate-pulse" />
              Expiring Soon
            </div>
            <h2 className="text-xl lg:text-2xl font-extrabold text-white mb-1">Your Plan Expires Soon</h2>
            <p className="text-orange-200 text-sm">
              <span className="font-semibold text-white">{activePlan?.planName || "Your plan"}</span> expires in{" "}
              <span className="font-bold text-white">{daysRemaining} day{daysRemaining === 1 ? "" : "s"}</span>. Renew now to continue your nutrition journey.
            </p>
          </div>
          <Link
            href="/subscriptions"
            className="flex-shrink-0 inline-flex items-center gap-2 bg-white text-orange-700 text-sm font-bold px-6 py-3 rounded-2xl hover:bg-orange-50 transition shadow-xl hover:-translate-y-0.5 active:translate-y-0 whitespace-nowrap"
          >
            Renew Plan
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
          </Link>
        </div>
      </div>
    );
  }

  if (type === "NO_ACTIVE_PLAN") {
    return (
      <div
        className="anim-fade-in-up relative rounded-3xl p-7 lg:p-8 text-white overflow-hidden"
        style={{ background: "linear-gradient(135deg,#1e1b4b 0%,#3730a3 30%,#6d28d9 65%,#7c3aed 100%)" }}
      >
        <div className="anim-float absolute top-0 right-0 w-64 h-64 rounded-full opacity-20 -translate-y-1/3 translate-x-1/4"
          style={{ background: "radial-gradient(circle,#a78bfa,transparent)" }} />
        <div className="anim-float-2 absolute bottom-0 right-24 w-36 h-36 rounded-full opacity-20 translate-y-1/3"
          style={{ background: "radial-gradient(circle,#f472b6,transparent)", animationDelay: "1s" }} />
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.2) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.2) 1px,transparent 1px)", backgroundSize: "32px 32px" }} />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold text-violet-200 mb-3"
              style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.15)" }}>
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Ready to start
            </div>
            <h2 className="text-2xl lg:text-3xl font-extrabold text-white mb-2 leading-tight">Start Your Wellness Journey</h2>
            <p className="text-violet-200 text-sm max-w-md">Choose a plan designed to help you achieve your health goals and get your personalized AI diet plan.</p>
          </div>
          <Link
            href="/subscriptions"
            className="flex-shrink-0 inline-flex items-center gap-2 bg-white text-violet-700 text-sm font-bold px-6 py-3 rounded-2xl hover:bg-violet-50 transition shadow-xl hover:-translate-y-0.5 active:translate-y-0"
          >
            Browse Plans
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
          </Link>
        </div>
      </div>
    );
  }

  if (type === "GOAL_ACHIEVED") {
    return (
      <div
        className="anim-fade-in-up relative rounded-3xl p-7 lg:p-8 text-white overflow-hidden"
        style={{ background: "linear-gradient(135deg,#4c1d95 0%,#7c3aed 45%,#ec4899 100%)", boxShadow: "0 20px 50px -10px rgba(124,58,237,0.4)" }}
      >
        <div className="anim-float absolute top-0 right-0 w-52 h-52 rounded-full opacity-20 -translate-y-1/3 translate-x-1/4"
          style={{ background: "radial-gradient(circle,#f9a8d4,transparent)" }} />
        <div className="anim-float-2 absolute bottom-0 left-8 w-32 h-32 rounded-full opacity-15 translate-y-1/3"
          style={{ background: "radial-gradient(circle,#c4b5fd,transparent)", animationDelay: "0.8s" }} />
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.2) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.2) 1px,transparent 1px)", backgroundSize: "32px 32px" }} />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-5">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0"
            style={{ background: "rgba(255,255,255,0.18)" }}>🏆</div>
          <div className="flex-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold text-pink-200 mb-2"
              style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.15)" }}>
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-300 animate-pulse" />
              Milestone Reached 🎉
            </div>
            <h2 className="text-xl lg:text-2xl font-extrabold text-white mb-1">Congratulations!</h2>
            <p className="text-pink-200 text-sm">
              You&apos;ve completed{" "}
              <span className="font-bold text-white">30 days</span> on your plan. You&apos;re making amazing progress — keep up the great work on your health journey!
            </p>
          </div>
          <Link
            href="/weight-logs"
            className="flex-shrink-0 inline-flex items-center gap-2 bg-white text-violet-700 text-sm font-bold px-6 py-3 rounded-2xl hover:bg-violet-50 transition shadow-xl hover:-translate-y-0.5 active:translate-y-0 whitespace-nowrap"
          >
            View Progress
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
          </Link>
        </div>
      </div>
    );
  }

  if (type === "PROGRESS_UPDATE") {
    return (
      <div
        className="anim-fade-in-up relative rounded-3xl p-7 lg:p-8 text-white overflow-hidden"
        style={{ background: "linear-gradient(135deg,#064e3b 0%,#059669 50%,#10b981 100%)", boxShadow: "0 20px 50px -10px rgba(5,150,105,0.35)" }}
      >
        <div className="absolute top-0 right-0 w-52 h-52 rounded-full opacity-20 -translate-y-1/3 translate-x-1/4"
          style={{ background: "radial-gradient(circle,#6ee7b7,transparent)" }} />
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.2) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.2) 1px,transparent 1px)", backgroundSize: "32px 32px" }} />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-5">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0"
            style={{ background: "rgba(255,255,255,0.15)" }}>📈</div>
          <div className="flex-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold text-emerald-200 mb-2"
              style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.15)" }}>
              <span className="w-1.5 h-1.5 rounded-full bg-green-300 animate-pulse" />
              Progress Update
            </div>
            <h2 className="text-xl lg:text-2xl font-extrabold text-white mb-1">Great Progress! 🎉</h2>
            <p className="text-emerald-200 text-sm">
              You&apos;ve lost <span className="font-bold text-white">{weightLost} kg</span> so far. Stay consistent and keep moving forward!
            </p>
          </div>
          <Link
            href="/weight-logs"
            className="flex-shrink-0 inline-flex items-center gap-2 bg-white text-emerald-700 text-sm font-bold px-6 py-3 rounded-2xl hover:bg-emerald-50 transition shadow-xl hover:-translate-y-0.5 active:translate-y-0 whitespace-nowrap"
          >
            View Progress
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
          </Link>
        </div>
      </div>
    );
  }

  // WELCOME (default — active plan, no special condition)
  const days = daysUntil(activePlan?.endDate ?? null);
  const daysLabel = days === Infinity ? null : days > 0 ? `${days} days remaining` : "Plan ended";

  return (
    <div
      className="anim-fade-in-up relative rounded-3xl p-7 lg:p-8 text-white overflow-hidden"
      style={{ background: "linear-gradient(135deg, #1e1b4b 0%, #3730a3 30%, #6d28d9 65%, #7c3aed 100%)" }}
    >
      <div className="anim-float absolute top-0 right-0 w-64 h-64 rounded-full opacity-20 -translate-y-1/3 translate-x-1/4"
        style={{ background: "radial-gradient(circle,#a78bfa,transparent)" }} />
      <div className="anim-float-2 absolute bottom-0 right-24 w-36 h-36 rounded-full opacity-20 translate-y-1/3"
        style={{ background: "radial-gradient(circle,#f472b6,transparent)", animationDelay: "1s" }} />
      <div className="anim-float-3 absolute top-6 right-44 w-12 h-12 rounded-full opacity-30"
        style={{ background: "radial-gradient(circle,#7dd3fc,transparent)", animationDelay: "1.8s" }} />
      <div className="absolute inset-0 opacity-[0.04]"
        style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.2) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.2) 1px,transparent 1px)", backgroundSize: "32px 32px" }} />
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold text-violet-200 mb-3"
            style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.15)" }}>
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            Plan active
          </div>
          <h2 className="text-2xl lg:text-3xl font-extrabold text-white mb-2 leading-tight">
            Your plan is running 🎉
          </h2>
          <p className="text-violet-200 text-sm max-w-md">
            {activePlan?.planName && <><span className="font-semibold text-white">{activePlan.planName}</span> · </>}
            {daysLabel && <span className="font-semibold text-white">{daysLabel}</span>}
            {!daysLabel && "Track your weight, chat with your AI coach, and stay on target."}
          </p>
        </div>
        <Link
          href="/diet-plans"
          className="flex-shrink-0 inline-flex items-center gap-2 bg-white text-violet-700 text-sm font-bold px-6 py-3 rounded-2xl hover:bg-violet-50 transition shadow-xl hover:-translate-y-0.5 active:translate-y-0"
        >
          View My Plan
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
        </Link>
      </div>
    </div>
  );
}
