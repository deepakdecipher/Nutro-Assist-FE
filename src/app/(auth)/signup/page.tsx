"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";

function SignupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Step 1 = email + password form  |  Step 2 = OTP verification
  const [step, setStep] = useState<1 | 2>(1);
  const [redirectMsg, setRedirectMsg] = useState("");
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  useEffect(() => {
    const hint = searchParams.get("hint");
    if (hint) {
      setEmail(decodeURIComponent(hint));
      setRedirectMsg("User not found. Please register to create your account.");
    }
  }, [searchParams]);
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // 5-minute countdown (300 s)
  const [secondsLeft, setSecondsLeft] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const otp = otpDigits.join("");

  function startTimer(seconds = 300) {
    if (timerRef.current) clearInterval(timerRef.current);
    setSecondsLeft(seconds);
    timerRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) { clearInterval(timerRef.current!); return 0; }
        return prev - 1;
      });
    }, 1000);
  }

  function formatTime(s: number) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!firstName.trim()) { setError("First name is required."); return; }

    setLoading(true);
    try {
      const prefix = email.split("@")[0].replace(/[^a-zA-Z0-9]/g, "");
      const userName = prefix + Math.floor(1000 + Math.random() * 9000);
      // Random password — user logs in via OTP, never needs this
      const autoPassword = crypto.randomUUID().replace(/-/g, "") + "Aa1!";

      await api.post("/userApi/sign-up", {
        userFullName: `${firstName.trim()} ${lastName.trim()}`.trim(),
        userName,
        email,
        password: autoPassword,
        role: [{ roleName: "USER" }],
      });

      setSuccessMsg("OTP sent successfully! Check your inbox.");
      setOtpDigits(["", "", "", "", "", ""]);
      startTimer(300);
      setStep(2);
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed. Please try again.");
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
      await api.post(`/userApi/verify-otp/${otp}?emailId=${encodeURIComponent(email)}`, {});
      if (timerRef.current) clearInterval(timerRef.current);
      router.push("/login?verified=1");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Invalid OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResendOtp() {
    if (secondsLeft > 0) return;
    setError("");
    setSuccessMsg("");
    try {
      await api.post(`/userApi/generate-otp/${encodeURIComponent(email)}`, {});
      setSuccessMsg("OTP resent successfully!");
      startTimer(300);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not resend OTP. Please try again.");
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

  return (
    <div className="flex h-screen overflow-hidden">
      {/* ── Left gradient panel ── */}
      <div className="hidden lg:flex flex-col justify-between w-[46%] relative overflow-hidden p-12"
        style={{ background: "linear-gradient(145deg, #1e1b4b 0%, #3730a3 30%, #6d28d9 65%, #7c3aed 100%)" }}>
        <div className="anim-float absolute top-0 right-0 w-80 h-80 rounded-full opacity-20 -translate-y-1/2 translate-x-1/3"
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
            <p className="text-indigo-300 text-xs font-semibold uppercase tracking-widest mb-5">How it works</p>
            <div className="space-y-4">
              {[
                { n: "1", label: "Enter your name & email", active: step === 1 },
                { n: "2", label: "Verify with a 6-digit OTP",   active: step === 2 },
                { n: "3", label: "Start your nutrition journey", active: false },
              ].map((s) => (
                <div key={s.n} className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all duration-500 ${
                    s.active ? "text-white shadow-lg shadow-violet-400/40" : "text-white/40"
                  }`}
                    style={s.active
                      ? { background: "linear-gradient(135deg,rgba(255,255,255,0.3),rgba(255,255,255,0.15))", border: "1px solid rgba(255,255,255,0.3)" }
                      : { background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)" }
                    }>{s.n}</div>
                  <span className={`text-sm font-medium transition-colors duration-300 ${s.active ? "text-white" : "text-white/40"}`}>{s.label}</span>
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
          {/* Step indicator */}
          <div className="anim-fade-in flex items-center gap-2 mb-6">
            {[1, 2].map((s) => (
              <div key={s} className={`h-1.5 rounded-full transition-all duration-500 ${s === step ? "w-10" : s < step ? "w-5" : "w-5 bg-gray-200"}`}
                style={s <= step ? { background: "linear-gradient(90deg,#7c3aed,#a855f7)" } : {}} />
            ))}
            <span className="ml-2 text-xs text-gray-400 font-medium">Step {step} / 2</span>
          </div>

          <div className="anim-fade-in-up">
            <p className="text-xs font-semibold text-violet-500 uppercase tracking-widest mb-2">Create Account</p>
            <h2 className="text-3xl font-extrabold text-gray-900 mb-1">
              {step === 1 ? "Get started" : "Verify your email"}
            </h2>
            <p className="text-sm text-gray-400 mb-8">
              {step === 1
                ? "Enter your name and email to get started"
                : `We sent a 6-digit code to ${email}`}
            </p>
          </div>

          {/* Redirect from login banner */}
          {redirectMsg && (
            <div className="anim-scale-in mb-6 flex items-start gap-3 rounded-2xl bg-amber-50 border border-amber-100 px-4 py-3.5">
              <div className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-amber-600 text-xs font-bold">i</span>
              </div>
              <span className="text-sm text-amber-700">{redirectMsg}</span>
            </div>
          )}

          {/* Success banner */}
          {successMsg && (
            <div className="anim-scale-in mb-6 flex items-center gap-3 rounded-2xl bg-green-50 border border-green-100 px-4 py-3.5">
              <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-3 h-3 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="text-sm text-green-700 font-medium">{successMsg}</span>
            </div>
          )}

          {/* Error banner */}
          {error && (
            <div className="anim-scale-in mb-6 flex items-start gap-3 rounded-2xl bg-red-50 border border-red-100 px-4 py-3.5">
              <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-red-500 text-xs font-bold">!</span>
              </div>
              <span className="text-sm text-red-600">{error}</span>
            </div>
          )}

          {/* ── Step 1: Name + Email ── */}
          {step === 1 && (
            <form onSubmit={handleRegister} className="space-y-5">
              <div className="anim-fade-in-up delay-100 flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">First name</label>
                  <input type="text" required value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="input-field" placeholder="John" autoFocus />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">Last name</label>
                  <input type="text" value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="input-field" placeholder="Doe" />
                </div>
              </div>
              <div className="anim-fade-in-up delay-150">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">Email address</label>
                <input type="email" required value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field" placeholder="you@example.com" />
              </div>
              <div className="anim-fade-in-up delay-200 pt-1">
                <button type="submit" disabled={loading}
                  className="w-full py-3.5 rounded-2xl text-sm font-bold text-white btn-gradient disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-violet-200">
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Sending OTP…
                    </span>
                  ) : "Send OTP →"}
                </button>
              </div>
            </form>
          )}

          {/* ── Step 2: OTP verification ── */}
          {step === 2 && (
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              {/* 5-min countdown */}
              <div className="anim-fade-in flex items-center justify-center gap-2">
                <div className={`text-sm font-semibold px-3 py-1 rounded-full ${secondsLeft > 0 ? "bg-violet-50 text-violet-600" : "bg-red-50 text-red-500"}`}>
                  {secondsLeft > 0 ? `⏱ OTP expires in ${formatTime(secondsLeft)}` : "⚠ OTP expired"}
                </div>
              </div>

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
                  {secondsLeft > 0 ? (
                    <span className="text-gray-400 font-medium">Resend available in {formatTime(secondsLeft)}</span>
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

              <div className="text-center">
                <button type="button" onClick={() => { setStep(1); setError(""); setSuccessMsg(""); if (timerRef.current) clearInterval(timerRef.current); }}
                  className="text-xs text-gray-400 hover:text-gray-600">
                  ← Change details
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

export default function SignupPage() {
  return (
    <Suspense>
      <SignupContent />
    </Suspense>
  );
}
