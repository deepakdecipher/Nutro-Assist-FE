"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ userFullName: "", userName: "", email: "", password: "", confirmPassword: "" });
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const otp = otpDigits.join("");

  function startCooldown() {
    setResendCooldown(60);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setResendCooldown(prev => {
        if (prev <= 1) { clearInterval(cooldownRef.current!); return 0; }
        return prev - 1;
      });
    }, 1000);
  }

  function handleNext(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.userFullName.trim() || !form.userName.trim()) { setError("Please fill in all fields."); return; }
    setStep(2);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirmPassword) { setError("Passwords do not match."); return; }
    setLoading(true);
    try {
      const { confirmPassword, ...payload } = form;
      void confirmPassword;
      // Sign-up auto-generates and sends OTP — move to step 3 on success
      await api.post("/userApi/sign-up", { ...payload, role: [{ roleName: "USER" }] });
      // generate-otp may return 500 for unauthenticated callers (library @PreAuthorize);
      // OTP is already sent by sign-up so we swallow the error and proceed
      try {
        await api.post(`/userApi/generate-otp/${encodeURIComponent(form.email)}`, {});
      } catch {
        // OTP already dispatched by sign-up — ignore
      }
      startCooldown();
      setStep(3);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (otp.length < 6) { setError("Please enter the 6-digit OTP."); return; }
    setLoading(true);
    try {
      await api.post(`/userApi/verify-otp/${otp}`, {});
      router.push("/login?verified=1");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Invalid OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResendOtp() {
    if (resendCooldown > 0) return;
    setError("");
    try {
      await api.post(`/userApi/generate-otp/${encodeURIComponent(form.email)}`, {});
      startCooldown();
    } catch {
      // generate-otp requires authentication on resend; show a hint instead
      setError("Could not resend OTP. Please check your email for the code sent during registration.");
      startCooldown();
    }
  }

  function handleOtpChange(index: number, value: string) {
    if (!/^\d?$/.test(value)) return;
    const next = [...otpDigits];
    next[index] = value;
    setOtpDigits(next);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  }

  function handleOtpPaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!text) return;
    const next = [...otpDigits];
    text.split("").forEach((ch, i) => { next[i] = ch; });
    setOtpDigits(next);
    otpRefs.current[Math.min(text.length, 5)]?.focus();
  }

  const leftSteps = [
    { n: 1, label: "Personal details",    done: step >= 1 },
    { n: 2, label: "Account credentials", done: step >= 2 },
    { n: 3, label: "Verify your email",   done: step >= 3 },
  ];

  return (
    <div className="flex h-screen overflow-hidden">
      {/* ── Left gradient panel ── */}
      <div className="hidden lg:flex flex-col justify-between w-[46%] relative overflow-hidden p-12"
        style={{ background: "linear-gradient(145deg, #1e1b4b 0%, #3730a3 30%, #6d28d9 65%, #7c3aed 100%)" }}>
        <div className="anim-float   absolute top-0 right-0 w-80 h-80 rounded-full opacity-20 -translate-y-1/2 translate-x-1/3"
          style={{ background: "radial-gradient(circle, #818cf8, transparent)" }} />
        <div className="anim-float-2 absolute bottom-0 left-0 w-64 h-64 rounded-full opacity-15 translate-y-1/3 -translate-x-1/4"
          style={{ background: "radial-gradient(circle, #a78bfa, transparent)", animationDelay: "1s" }} />
        <div className="absolute inset-0 opacity-5"
          style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.15) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />

        <div className="anim-slide-left relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl"
            style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)" }}>🥗</div>
          <span className="text-white font-bold text-xl tracking-tight">Nutro Assist</span>
        </div>

        <div className="relative z-10">
          <h1 className="anim-slide-left text-5xl font-extrabold text-white leading-[1.15] mb-4">
            Start your<br />health journey<br />today
          </h1>
          <p className="anim-slide-left delay-100 text-indigo-200 text-base mb-10">
            Get a fully personalized AI diet plan in minutes, tailored to your goals and lifestyle.
          </p>

          <div className="anim-slide-left delay-200 rounded-2xl p-6"
            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}>
            <p className="text-indigo-300 text-xs font-semibold uppercase tracking-widest mb-5">Setup progress</p>
            <div className="space-y-4">
              {leftSteps.map((s, i) => (
                <div key={s.n} className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all duration-500 ${
                    s.done ? "text-white shadow-lg shadow-violet-400/40" : "text-white/40"
                  }`}
                    style={s.done
                      ? { background: "linear-gradient(135deg, rgba(255,255,255,0.3), rgba(255,255,255,0.15))", border: "1px solid rgba(255,255,255,0.3)" }
                      : { background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)" }
                    }>
                    {s.done && s.n < step ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : s.n}
                  </div>
                  <div className="flex-1">
                    <span className={`text-sm font-medium transition-all duration-300 ${s.done ? "text-white" : "text-white/40"}`}>{s.label}</span>
                  </div>
                  {i < 2 && <div className={`w-2 h-2 rounded-full transition-all ${s.done && step > s.n ? "bg-violet-300" : "bg-white/20"}`} />}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="anim-slide-left delay-400 relative z-10">
          <p className="text-indigo-300 text-xs">Already have an account?{" "}
            <Link href="/login" className="text-white font-semibold hover:underline">Sign in →</Link>
          </p>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex-1 flex flex-col justify-center bg-white px-8 md:px-16 lg:px-20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-72 h-72 rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(139,92,246,0.05), transparent)" }} />

        <div className="anim-fade-in lg:hidden flex items-center gap-2.5 mb-10">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg btn-gradient shadow-md">🥗</div>
          <span className="text-xl font-bold text-violet-700">Nutro Assist</span>
        </div>

        <div className="w-full max-w-sm">
          {/* Step dots */}
          <div className="anim-fade-in flex items-center gap-2 mb-6">
            {[1, 2, 3].map((s) => (
              <div key={s} className={`h-1.5 rounded-full transition-all duration-500 ${s === step ? "w-10" : s < step ? "w-5" : "w-5 bg-gray-200"}`}
                style={s <= step ? { background: "linear-gradient(90deg, #7c3aed, #a855f7)" } : {}} />
            ))}
            <span className="ml-2 text-xs text-gray-400 font-medium">Step {step} / 3</span>
          </div>

          <div className="anim-fade-in-up">
            <p className="text-xs font-semibold text-violet-500 uppercase tracking-widest mb-2">Create Account</p>
            <h2 className="text-3xl font-extrabold text-gray-900 mb-1">
              {step === 1 ? "Tell us about you" : step === 2 ? "Set your credentials" : "Verify your email"}
            </h2>
            <p className="text-sm text-gray-400 mb-8">
              {step === 1 ? "We'll personalize your experience"
                : step === 2 ? "Choose a secure password"
                : `We sent a 6-digit code to ${form.email}`}
            </p>
          </div>

          {error && (
            <div className="anim-scale-in mb-6 flex items-start gap-3 rounded-2xl bg-red-50 border border-red-100 px-4 py-3.5">
              <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-red-500 text-xs font-bold">!</span>
              </div>
              <span className="text-sm text-red-600">{error}</span>
            </div>
          )}

          {/* Step 1 */}
          {step === 1 && (
            <form onSubmit={handleNext} className="space-y-5">
              <div className="anim-fade-in-up delay-100">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">Full Name</label>
                <input type="text" required value={form.userFullName}
                  onChange={(e) => setForm({ ...form, userFullName: e.target.value })}
                  className="input-field" placeholder="John Doe" />
              </div>
              <div className="anim-fade-in-up delay-150">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">Username</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">@</span>
                  <input type="text" required value={form.userName}
                    onChange={(e) => setForm({ ...form, userName: e.target.value })}
                    className="input-field pl-8" placeholder="johndoe" />
                </div>
              </div>
              <div className="anim-fade-in-up delay-200 pt-1">
                <button type="submit" className="w-full py-3.5 rounded-2xl text-sm font-bold text-white btn-gradient shadow-lg shadow-violet-200">
                  Continue →
                </button>
              </div>
            </form>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="anim-fade-in-up delay-50">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">Email</label>
                <input type="email" required value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="input-field" placeholder="john@example.com" />
              </div>
              <div className="anim-fade-in-up delay-100">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">Password</label>
                <input type="password" required minLength={6} value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="input-field" placeholder="Min. 6 characters" />
              </div>
              <div className="anim-fade-in-up delay-150">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">Confirm Password</label>
                <input type="password" required value={form.confirmPassword}
                  onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                  className="input-field" placeholder="••••••••" />
              </div>
              <div className="anim-fade-in-up delay-200 flex gap-3 pt-1">
                <button type="button" onClick={() => { setStep(1); setError(""); }}
                  className="flex-1 py-3.5 rounded-2xl border-2 border-gray-200 bg-white text-sm font-bold text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition">
                  ← Back
                </button>
                <button type="submit" disabled={loading}
                  className="flex-[2] py-3.5 rounded-2xl text-sm font-bold text-white btn-gradient disabled:opacity-60 shadow-lg shadow-violet-200">
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Creating…
                    </span>
                  ) : "Create Account"}
                </button>
              </div>
            </form>
          )}

          {/* Step 3 — OTP */}
          {step === 3 && (
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              {/* 6-box OTP input */}
              <div className="anim-fade-in-up delay-100">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">Enter OTP</label>
                <div className="flex gap-3 justify-between" onPaste={handleOtpPaste}>
                  {otpDigits.map((digit, i) => (
                    <input
                      key={i}
                      ref={(el) => { otpRefs.current[i] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      className="w-12 h-14 text-center text-xl font-bold rounded-2xl border-2 outline-none transition-all duration-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
                      style={{ borderColor: digit ? "#7c3aed" : "#e5e7eb", color: "#1f2937" }}
                    />
                  ))}
                </div>
              </div>

              <div className="anim-fade-in-up delay-150 text-center">
                <p className="text-sm text-gray-400">
                  Didn&apos;t receive it?{" "}
                  {resendCooldown > 0 ? (
                    <span className="text-gray-400 font-medium">Resend in {resendCooldown}s</span>
                  ) : (
                    <button type="button" onClick={handleResendOtp}
                      className="text-violet-600 font-semibold hover:text-violet-700">
                      Resend OTP
                    </button>
                  )}
                </p>
              </div>

              <div className="anim-fade-in-up delay-200">
                <button type="submit" disabled={loading || otp.length < 6}
                  className="w-full py-3.5 rounded-2xl text-sm font-bold text-white btn-gradient disabled:opacity-60 shadow-lg shadow-violet-200">
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Verifying…
                    </span>
                  ) : "Verify & Continue →"}
                </button>
              </div>
            </form>
          )}

          <p className="anim-fade-in delay-500 mt-8 text-center text-sm text-gray-400">
            Already have an account?{" "}
            <Link href="/login" className="font-bold text-violet-600 hover:text-violet-700">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
