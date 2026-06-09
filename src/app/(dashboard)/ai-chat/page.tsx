"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated, api } from "@/lib/api";
import { Sidebar } from "@/components/Sidebar";

interface Message { id: number; role: "user" | "assistant"; content: string; time: string; }

const SUGGESTIONS = [
  { icon: "🥗", text: "What should I eat for breakfast to lose weight?" },
  { icon: "🔢", text: "How many calories do I need daily?" },
  { icon: "💪", text: "Give me a high-protein meal plan" },
  { icon: "⏳", text: "What is intermittent fasting?" },
];

function now() { return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); }

export default function AiChatPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: 0, role: "assistant", content: "Hi! I'm your AI nutrition coach 🥗\nAsk me anything about your diet, macros, meal ideas, or health goals.", time: now() },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
    if (!isAuthenticated()) { router.replace("/login"); }
  }, [router]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  async function send(text: string) {
    if (!text.trim() || sending) return;
    const userMsg: Message = { id: Date.now(), role: "user", content: text.trim(), time: now() };
    setInput("");
    setMessages((prev) => [...prev, userMsg]);
    setSending(true);
    try {
      const res = await api.post<{ response: string }>("/api/ai/chat", { message: text.trim() });
      setMessages((prev) => [...prev, { id: Date.now() + 1, role: "assistant", content: res.response, time: now() }]);
    } catch {
      setMessages((prev) => [...prev, { id: Date.now() + 1, role: "assistant", content: "Sorry, I'm having trouble right now. Please try again.", time: now() }]);
    } finally {
      setSending(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  if (!mounted) return null;

  const msgCount = messages.filter(m => m.role === "user").length;
  const showSuggestions = messages.length === 1;

  return (
    <div className="flex h-screen bg-mesh overflow-hidden">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Header */}
        <header className="anim-fade-in flex items-center justify-between px-6 py-4 bg-white/80 backdrop-blur-sm border-b" style={{ borderColor:"rgba(139,92,246,0.08)" }}>
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-xl text-gray-500 hover:bg-violet-50 hover:text-violet-600 transition mr-1">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <div className="relative w-10 h-10 flex-shrink-0">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                style={{ background:"linear-gradient(135deg,#db2777,#ec4899)", boxShadow:"0 4px 12px rgba(219,39,119,0.35)" }}>
                🤖
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-gray-900">AI Nutrition Coach</h1>
              <p className="text-xs text-green-500 font-semibold">● Online · Powered by AI</p>
            </div>
          </div>
          {msgCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-pink-600 bg-pink-50 border border-pink-100">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
              {msgCount} message{msgCount !== 1 ? "s" : ""}
            </div>
          )}
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-5">
          {messages.map((msg) => (
            <div key={msg.id} className={`anim-fade-in-up flex gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
              {/* Avatar */}
              {msg.role === "assistant" && (
                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0 mt-0.5 self-end"
                  style={{ background:"linear-gradient(135deg,#db2777,#ec4899)" }}>🤖</div>
              )}
              {msg.role === "user" && (
                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mt-0.5 self-end"
                  style={{ background:"linear-gradient(135deg,#7c3aed,#9333ea)" }}>U</div>
              )}

              <div className={`flex flex-col gap-1 max-w-xs lg:max-w-md ${msg.role === "user" ? "items-end" : "items-start"}`}>
                <div className={`px-4 py-3 text-sm leading-relaxed rounded-2xl whitespace-pre-line ${
                  msg.role === "user"
                    ? "text-white rounded-br-sm"
                    : "text-gray-700 bg-white border rounded-bl-sm shadow-sm"
                }`}
                  style={msg.role === "user"
                    ? { background:"linear-gradient(135deg,#7c3aed,#9333ea)", boxShadow:"0 4px 16px rgba(124,58,237,0.3)", borderColor:"transparent" }
                    : { borderColor:"rgba(139,92,246,0.1)" }}>
                  {msg.content}
                </div>
                <span className="text-[10px] text-gray-300 px-1">{msg.time}</span>
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {sending && (
            <div className="anim-fade-in flex gap-2.5">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0 self-end"
                style={{ background:"linear-gradient(135deg,#db2777,#ec4899)" }}>🤖</div>
              <div className="bg-white border rounded-2xl rounded-bl-sm px-5 py-4 flex items-center gap-1.5 shadow-sm"
                style={{ borderColor:"rgba(139,92,246,0.1)" }}>
                {[0, 1, 2].map((d) => (
                  <div key={d} className="chat-dot w-2 h-2 rounded-full"
                    style={{ background:"linear-gradient(135deg,#db2777,#ec4899)", animationDelay:`${d * 0.18}s` }} />
                ))}
              </div>
            </div>
          )}

          {/* Suggestion chips */}
          {showSuggestions && !sending && (
            <div className="anim-fade-in-up delay-300 pt-2">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center mb-3">Try asking</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {SUGGESTIONS.map((s) => (
                  <button key={s.text} onClick={() => send(s.text)}
                    className="flex items-center gap-2.5 text-left text-xs font-medium text-gray-600 bg-white border rounded-xl px-4 py-3 hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700 transition shadow-sm group"
                    style={{ borderColor:"rgba(139,92,246,0.12)" }}>
                    <span className="text-base">{s.icon}</span>
                    <span className="leading-snug">{s.text}</span>
                    <svg className="w-3 h-3 text-gray-300 group-hover:text-violet-400 ml-auto flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input bar */}
        <div className="px-4 py-4 bg-white/90 backdrop-blur-sm border-t" style={{ borderColor:"rgba(139,92,246,0.08)" }}>
          <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex items-center gap-3">
            <input ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)}
              className="input-field flex-1" placeholder="Ask about nutrition, meals, macros…" />
            <button type="submit" disabled={!input.trim() || sending}
              className="w-11 h-11 flex items-center justify-center rounded-xl text-white btn-gradient disabled:opacity-50 flex-shrink-0 hover:scale-105 active:scale-95 transition"
              style={{ boxShadow:"0 4px 14px rgba(124,58,237,0.35)" }}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
            </button>
          </form>
          <p className="text-[10px] text-gray-300 text-center mt-2">AI responses are for informational purposes only</p>
        </div>
      </div>
    </div>
  );
}
