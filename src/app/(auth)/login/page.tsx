"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { api, saveAuth } from "@/lib/api";
import { firebaseAuth } from "@/lib/firebase";
import {
  ConfirmationResult,
  RecaptchaVerifier,
  signInWithPhoneNumber,
} from "firebase/auth";

type Step = "identifier" | "otp";
type InputMode = "email" | "phone";

/** Detects whether the input looks like an E.164 / local phone number vs. an email. */
function detectInputMode(value: string): InputMode {
  const trimmed = value.trim();
  // Phone: starts with + followed by digits, or is purely digits (≥ 7)
  if (/^[+]?\d[\d\s\-()\\.]{6,}$/.test(trimmed)) return "phone";
  return "email";
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [step, setStep] = useState<Step>("identifier");
  const [identifier, setIdentifier] = useState(""); // email or phone
  const [inputMode, setInputMode] = useState<InputMode>("email");
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(false);

  // 5-minute countdown
  const [secondsLeft, setSecondsLeft] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Firebase phone auth refs
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);
  const confirmationResultRef = useRef<ConfirmationResult | null>(null);

  const otp = otpDigits.join("");

  useEffect(() => {
    if (searchParams.get("verified") === "1") setVerified(true);
  }, [searchParams]);

  // Initialise invisible reCAPTCHA once (needed for Firebase phone auth)
  useEffect(() => {
    if (!recaptchaVerifierRef.current) {
      recaptchaVerifierRef.current = new RecaptchaVerifier(
        firebaseAuth,
        "recaptcha-container",
        { size: "invisible" }
      );
    }
    return () => {
      // Cleanup on unmount so it doesn't linger across HMR reloads
      recaptchaVerifierRef.current?.clear();
      recaptchaVerifierRef.current = null;
    };
  }, []);

  function startTimer(s = 300) {
    if (timerRef.current) clearInterval(timerRef.current);
    setSecondsLeft(s);
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

  function handleIdentifierChange(value: string) {
    setIdentifier(value);
    setInputMode(detectInputMode(value));
  }

  // ── Step 1: send OTP (email → Brevo, phone → Firebase SMS) ───────────────
  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (inputMode === "phone") {
        await sendFirebasePhoneOtp();
      } else {
        await sendEmailOtp();
      }

      setOtpDigits(["", "", "", "", "", ""]);
      startTimer(300);
      setStep("otp");
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unable to send OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function sendEmailOtp() {
    await api.post(`/userApi/unified/generate-otp/${encodeURIComponent(identifier.trim().toLowerCase())}`, {});
    setSuccessMsg("OTP sent! Check your inbox.");
  }

  async function sendFirebasePhoneOtp() {
    let phone = identifier.trim().replace(/[\s\-().]/g, "");
    // Auto-prepend +91 for plain 10-digit Indian mobile numbers
    if (/^\d{10}$/.test(phone)) {
      phone = "+91" + phone;
    } else if (!phone.startsWith("+")) {
      throw new Error("Enter a 10-digit number (e.g. 9876543210) or include the country code (e.g. +91 9876543210).");
    }
    if (!recaptchaVerifierRef.current) {
      recaptchaVerifierRef.current = new RecaptchaVerifier(
        firebaseAuth,
        "recaptcha-container",
        { size: "invisible" }
      );
    }
    confirmationResultRef.current = await signInWithPhoneNumber(
      firebaseAuth,
      phone,
      recaptchaVerifierRef.current
    );
    setSuccessMsg("SMS sent! Enter the 6-digit code.");
  }

  // ── Step 2: verify OTP and login ──────────────────────────────────────────
  async function handleVerifyAndLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (otp.length < 6) { setError("Please enter the 6-digit OTP."); return; }
    setLoading(true);

    try {
      if (inputMode === "phone") {
        await verifyFirebaseOtpAndLogin();
      } else {
        await verifyEmailOtpAndLogin();
      }

      if (timerRef.current) clearInterval(timerRef.current);
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unable to verify OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function verifyEmailOtpAndLogin() {
    const email = identifier.trim().toLowerCase();
    const data = await api.post<{ token: string; refreshToken: string; roles: string[] }>(
      "/userApi/unified/login-otp",
      { email, otp }
    );
    saveAuth(data.token, data.refreshToken);
  }

  async function verifyFirebaseOtpAndLogin() {
    if (!confirmationResultRef.current) {
      throw new Error("Session expired — please go back and resend the OTP.");
    }
    const credential = await confirmationResultRef.current.confirm(otp);
    const idToken = await credential.user.getIdToken();
    const data = await api.post<{ token: string; refreshToken: string; roles: string[] }>(
      "/userApi/unified/login-phone",
      { idToken }
    );
    saveAuth(data.token, data.refreshToken);
  }

  async function handleResendOtp() {
    if (secondsLeft > 0) return;
    setError("");
    setSuccessMsg("");
    setLoading(true);
    try {
      if (inputMode === "phone") {
        await sendFirebasePhoneOtp();
      } else {
        await sendEmailOtp();
      }
      startTimer(300);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not resend OTP.");
    } finally {
      setLoading(false);
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

  const identifierLabel = "Email address or phone number";
  const identifierPlaceholder = inputMode === "phone"
    ? "+91 9876543210 (include country code)"
    : "you@example.com";
  const otpDescription = inputMode === "phone"
    ? `Enter the 6-digit code sent via SMS to ${identifier}`
    : `Enter the 6-digit code sent to ${identifier}`;

  return (
    <div className="flex h-screen overflow-hidden">
      {/* ── Left gradient panel ── */}
      <div className="hidden lg:flex flex-col justify-between w-[46%] relative overflow-hidden p-12"
        style={{ background: "linear-gradient(145deg, #2e1065 0%, #4c1d95 30%, #6d28d9 65%, #7c3aed 100%)" }}>

        <div className="anim-float absolute top-0 right-0 w-80 h-80 rounded-full opacity-20 -translate-y-1/2 translate-x-1/3"
          style={{ background: "radial-gradient(circle, #a78bfa, transparent)" }} />
        <div className="anim-float-2 absolute bottom-0 left-0 w-64 h-64 rounded-full opacity-15 translate-y-1/3 -translate-x-1/4"
          style={{ background: "radial-gradient(circle, #c084fc, transparent)", animationDelay: "1s" }} />
        <div className="absolute inset-0 opacity-5"
          style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.15) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />

        <div className="anim-slide-left relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl shadow-lg"
            style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.25)" }}>
            🥗
          </div>
          <span className="text-white font-bold text-xl tracking-tight">Nutro Assist</span>
        </div>

        <div className="relative z-10">
          <div className="anim-slide-left delay-100 inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-6 text-xs font-semibold text-violet-200"
            style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)" }}>
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            AI-Powered Nutrition Platform
          </div>
          <h1 className="anim-slide-left delay-150 text-5xl font-extrabold text-white leading-[1.15] mb-4">
            Your smartest<br />nutrition<br />partner
          </h1>
          <p className="anim-slide-left delay-200 text-violet-200 text-base leading-relaxed mb-10 max-w-sm">
            Personalized AI diet plans, intelligent weight tracking, and a 24/7 nutrition coach — all in one place.
          </p>

          <div className="space-y-3">
            {[
              { icon: "🎯", title: "AI-Generated Plans",  desc: "Tailored to your goals & lifestyle",  delay: "delay-250" },
              { icon: "⚖️", title: "Smart Tracking",      desc: "Visualize your weight journey",       delay: "delay-300" },
              { icon: "🤖", title: "24/7 AI Coach",       desc: "Ask anything about nutrition",        delay: "delay-400" },
            ].map((f) => (
              <div key={f.title}
                className={`anim-slide-left ${f.delay} flex items-center gap-4 rounded-2xl p-4 transition-all hover:scale-[1.02]`}
                style={{ background: "rgba(255,255,255,0.08)", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.12)" }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                  style={{ background: "rgba(255,255,255,0.15)" }}>{f.icon}</div>
                <div>
                  <div className="text-sm font-semibold text-white">{f.title}</div>
                  <div className="text-xs text-violet-300">{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="anim-slide-left delay-500 relative z-10 rounded-2xl p-4"
          style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.10)" }}>
          <p className="text-violet-300 text-xs mb-2">Trusted by nutrition professionals</p>
          <div className="flex items-center gap-4">
            <div className="text-center"><p className="text-white font-bold text-lg leading-none">10k+</p><p className="text-violet-400 text-xs">Users</p></div>
            <div className="w-px h-8 bg-white/15" />
            <div className="text-center"><p className="text-white font-bold text-lg leading-none">50k+</p><p className="text-violet-400 text-xs">Plans made</p></div>
            <div className="w-px h-8 bg-white/15" />
            <div className="text-center"><p className="text-white font-bold text-lg leading-none">4.9 ★</p><p className="text-violet-400 text-xs">Rating</p></div>
          </div>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex-1 flex flex-col justify-center bg-white px-8 md:px-16 lg:px-20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-72 h-72 rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(139,92,246,0.06), transparent)" }} />

        {/* Mobile logo */}
        <div className="anim-fade-in lg:hidden flex items-center gap-2.5 mb-10">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shadow-md btn-gradient">🥗</div>
          <span className="text-xl font-bold text-violet-700">Nutro Assist</span>
        </div>

        <div className="w-full max-w-sm">
          <div className="anim-fade-in-up">
            <div className="mb-7 flex justify-center">
              <Image
                src="/nutro-assist-logo.svg"
                alt="Nutro Assist"
                width={176}
                height={99}
                priority
                className="h-auto w-44"
              />
            </div>
            <h2 className="text-3xl font-extrabold text-gray-900 mb-2 text-center">Welcome to Nutro Assist</h2>
            <p className="text-sm text-gray-400 mb-8">
              {step === "identifier"
                ? "Create your account or sign in to access your personalized nutrition journey."
                : otpDescription}
            </p>
          </div>

          {/* Verified banner */}
          {verified && step === "identifier" && (
            <div className="anim-scale-in mb-6 flex items-center gap-3 rounded-2xl bg-green-50 border border-green-100 px-4 py-3.5">
              <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-3 h-3 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="text-sm text-green-700 font-medium">Verified! Enter your email or phone to sign in.</span>
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

          {/* ── Identifier step ── */}
          {step === "identifier" && (
            <form onSubmit={handleSendOtp} className="space-y-5">
              <div className="anim-fade-in-up delay-100">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">
                  {identifierLabel}
                </label>
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => handleIdentifierChange(e.target.value)}
                  className="input-field"
                  placeholder="Email address or phone number"
                  autoFocus
                />
                {/* Contextual hint */}
                <p className="mt-1.5 text-xs text-gray-400">
                  {inputMode === "phone"
                    ? "Enter 10-digit number — +91 added automatically"
                    : "Use email or start typing a phone number"}
                </p>
              </div>
              <div className="anim-fade-in-up delay-150 pt-1">
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

          {/* ── OTP step ── */}
          {step === "otp" && (
            <form onSubmit={handleVerifyAndLogin} className="space-y-6">
              {/* 5-min timer */}
              <div className="flex justify-center">
                <div className={`text-sm font-semibold px-3 py-1 rounded-full ${secondsLeft > 0 ? "bg-violet-50 text-violet-600" : "bg-red-50 text-red-500"}`}>
                  {secondsLeft > 0 ? `⏱ OTP expires in ${formatTime(secondsLeft)}` : "⚠ OTP expired"}
                </div>
              </div>

              <div className="anim-fade-in-up delay-100">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">Enter OTP</label>
                <div className="flex gap-3 justify-between" onPaste={handleOtpPaste}>
                  {otpDigits.map((digit, i) => (
                    <input key={i}
                      ref={(el) => { otpRefs.current[i] = el; }}
                      type="text" inputMode="numeric" maxLength={1} value={digit}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      className="w-12 h-14 text-center text-xl font-bold rounded-2xl border-2 outline-none transition-all duration-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
                      style={{ borderColor: digit ? "#7c3aed" : "#e5e7eb", color: "#1f2937" }}
                    />
                  ))}
                </div>
              </div>

              <div className="text-center">
                <p className="text-sm text-gray-400">
                  Didn&apos;t receive it?{" "}
                  {secondsLeft > 0 ? (
                    <span className="text-gray-400 font-medium">Resend in {formatTime(secondsLeft)}</span>
                  ) : (
                    <button type="button" onClick={handleResendOtp} disabled={loading}
                      className="text-violet-600 font-semibold hover:text-violet-700 disabled:opacity-50">
                      Resend OTP
                    </button>
                  )}
                </p>
              </div>

              <button type="submit" disabled={loading || otp.length < 6}
                className="w-full py-3.5 rounded-2xl text-sm font-bold text-white btn-gradient disabled:opacity-60 shadow-lg shadow-violet-200">
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Verifying…
                  </span>
                ) : "Verify & Continue →"}
              </button>

              <div className="text-center">
                <button type="button"
                  onClick={() => {
                    setStep("identifier");
                    setError("");
                    setSuccessMsg("");
                    confirmationResultRef.current = null;
                    if (timerRef.current) clearInterval(timerRef.current);
                  }}
                  className="text-xs text-gray-400 hover:text-gray-600">
                  ← Change {inputMode === "phone" ? "phone number" : "email"}
                </button>
              </div>
            </form>
          )}

          {/* Admin login link */}
          <div className="mt-8 pt-6 border-t border-gray-100 text-center">
            <Link href="/admin/login"
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors font-medium">
              Login as Administrator
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </div>

      {/* Invisible reCAPTCHA container required by Firebase phone auth */}
      <div id="recaptcha-container" />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
