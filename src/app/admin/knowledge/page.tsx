"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api, clearAdminAuth, isAdminAuthenticated, getAdminToken } from "@/lib/api";
import { AdminSidebar } from "@/components/AdminSidebar";

interface KnowledgeSource {
  id: number;
  fileName: string;
  fileType: string;
  totalChunks: number;
  uploadedAt: string;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

const ACCEPTED = ".pdf,.xlsx,.xls,.csv,.docx,.txt,.md";

export default function KnowledgeBasePage() {
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [sources, setSources] = useState<KnowledgeSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [dragging, setDragging] = useState(false);
  // Track by fileName (string) — immune to server-assigned ID instability and
  // avoids the useEffect re-run loop caused by unstable router reference.
  const [recentlyUploadedNames, setRecentlyUploadedNames] = useState<Set<string>>(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: number; fileName: string; chunks: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const routerRef = useRef(router);
  routerRef.current = router;

  // Run only once on mount — avoids the re-fetch loop that useCallback([router]) causes
  // when Next.js App Router returns a new router reference on every state change.
  useEffect(() => {
    if (!isAdminAuthenticated()) {
      routerRef.current.replace("/admin/login");
      return;
    }
    // Restore badge names persisted across page reloads
    try {
      const stored = localStorage.getItem("knowledgeUploadedNames");
      if (stored) setRecentlyUploadedNames(new Set(JSON.parse(stored) as string[]));
    } catch { /* ignore */ }
    api.adminGet<KnowledgeSource[]>("/api/admin/knowledge/sources")
      .then(setSources)
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : "";
        if (msg.toLowerCase().includes("401") || msg.toLowerCase().includes("unauthori")) {
          routerRef.current.replace("/admin/login");
        }
      })
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist badge names to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem("knowledgeUploadedNames", JSON.stringify([...recentlyUploadedNames]));
    } catch { /* ignore */ }
  }, [recentlyUploadedNames]);

  function handleSignOut() {
    clearAdminAuth();
    router.push("/login");
  }

  async function uploadFile(file: File) {
    const fileName = file.name;
    setUploading(true);
    setUploadError("");
    try {
      const token = getAdminToken();
      const formData = new FormData();
      formData.append("file", file);
      // fetch() yields control here — React flushes the uploading=true render and the
      // browser paints the loading bar before the network response arrives.
      const res = await fetch("/backend/api/admin/knowledge/upload", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (!res.ok) {
        const text = await res.text();
        setUploadError(text || `Upload failed (${res.status})`);
        return;
      }
      const uploaded: KnowledgeSource = await res.json();
      setSources((prev) =>
        prev.some((s) => s.fileName === uploaded.fileName) ? prev : [...prev, uploaded]
      );
      // Permanent badge — stays until the file is deleted or the page reloads.
      setRecentlyUploadedNames((prev) => new Set([...prev, fileName]));
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : "Upload failed. Please try again.");
    } finally {
      setUploading(false);
      // Reset so selecting the same file again fires onChange (enables duplicate error to show).
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function confirmDelete() {
    if (!deleteConfirm) return;
    const { id } = deleteConfirm;
    setDeleteConfirm(null);
    setDeleteError("");
    try {
      await api.adminDelete<void>(`/api/admin/knowledge/sources/${id}`);
      const deleted = sources.find((s) => s.id === id);
      setSources((prev) => prev.filter((s) => s.id !== id));
      if (deleted) {
        setRecentlyUploadedNames((prev) => {
          const next = new Set(prev);
          next.delete(deleted.fileName);
          return next;
        });
      }
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : "Delete failed.");
    }
  }

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    uploadFile(files[0]);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <AdminSidebar collapsed={sidebarCollapsed} onCollapse={() => setSidebarCollapsed((v) => !v)} />

      <div className={`flex min-h-screen flex-col transition-all duration-300 ${sidebarCollapsed ? "lg:pl-20" : "lg:pl-72"}`}>
        {/* Topbar — matches admin dashboard header */}
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Knowledge Base</h2>
            </div>
            <div className="ml-auto flex items-center gap-4">
              <button type="button" className="relative h-10 w-10 rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50" aria-label="Notifications">
                🔔
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
              </button>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setProfileOpen((v) => !v)}
                  className="flex items-center gap-3 rounded-xl px-2 py-1.5 transition hover:bg-slate-50">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-500 text-sm font-bold text-white">A</span>
                  <span className="hidden text-left sm:block">
                    <span className="block text-sm font-bold text-slate-800">Administrator</span>
                    <span className="block text-xs text-slate-500">Super Admin</span>
                  </span>
                  <span className="text-slate-400">⌄</span>
                </button>
                {profileOpen && (
                  <div className="absolute right-0 top-full z-50 mt-1 w-44 rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                    <button
                      type="button"
                      onClick={() => { setProfileOpen(false); handleSignOut(); }}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-6">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-950">Knowledge Base</h1>
            <p className="mt-0.5 text-sm text-slate-500">Upload files to train the AI nutrition coach</p>
          </div>

          {/* Upload zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => !uploading && fileInputRef.current?.click()}
            className={`mb-6 flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-10 transition select-none
              ${dragging ? "border-violet-400 bg-violet-50" : "border-slate-200 bg-white hover:border-violet-300 hover:bg-violet-50/40"}
              ${uploading ? "pointer-events-none opacity-70" : ""}`}>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED}
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
            {uploading ? (
              <div className="flex w-full max-w-xs flex-col items-center gap-3">
                <p className="text-sm font-semibold text-violet-700">Uploading &amp; processing…</p>
                {/* Sliding indeterminate bar — works without XHR progress events */}
                <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-violet-100">
                  <div className="absolute inset-y-0 w-1/2 rounded-full bg-violet-500"
                    style={{ animation: "slide 1.4s ease-in-out infinite" }} />
                </div>
                <p className="text-xs text-slate-400">AI validation &amp; chunking in progress</p>
                <style>{`
                  @keyframes slide {
                    0%   { left: -50%; }
                    100% { left: 100%; }
                  }
                `}</style>
              </div>
            ) : (
              <>
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-100 text-2xl">🧠</div>
                <div className="text-center">
                  <p className="text-sm font-bold text-slate-800">Drop a file here, or click to browse</p>
                  <p className="mt-1 text-xs text-slate-400">PDF, DOCX, XLSX, XLS, CSV, TXT, MD — max 50 MB</p>
                </div>
              </>
            )}
          </div>

          {uploadError && (
            <div className="mb-4 flex items-start gap-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
              <span className="font-bold shrink-0">Upload failed:</span>
              <span className="flex-1">{uploadError}</span>
              <button type="button" onClick={() => setUploadError("")} className="ml-auto shrink-0 text-red-500 hover:text-red-700">✕</button>
            </div>
          )}

          {/* Sources table */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-base font-bold text-slate-950">Uploaded Sources</h2>
              <p className="mt-0.5 text-xs text-slate-500">The AI uses all uploaded files to answer nutrition questions.</p>
            </div>

            {deleteError && (
              <div className="mx-5 mt-3 rounded-xl border border-red-100 bg-red-50 px-4 py-2 text-sm text-red-700">
                {deleteError}
              </div>
            )}

            {loading ? (
              <div className="p-6 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 rounded-xl bg-slate-100 animate-pulse" />
                ))}
              </div>
            ) : sources.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-sm font-semibold text-slate-400">No files uploaded yet.</p>
                <p className="mt-1 text-xs text-slate-400">Upload your first nutrition document above.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-slate-400">File Name</th>
                      <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-slate-400">Type</th>
                      <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-slate-400">Chunks</th>
                      <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-slate-400">Uploaded</th>
                      <th className="px-5 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {sources.map((source) => {
                      const isNew = recentlyUploadedNames.has(source.fileName);
                      return (
                        <tr key={source.id} className={`transition-colors ${isNew ? "bg-emerald-50/60" : "hover:bg-slate-50/60"}`}>
                          <td className="px-5 py-3 font-medium text-slate-800">{source.fileName}</td>
                          <td className="px-5 py-3">
                            <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-bold uppercase text-violet-700">
                              {source.fileType}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-slate-600">{source.totalChunks}</td>
                          <td className="px-5 py-3 text-slate-500">{formatDate(source.uploadedAt)}</td>
                          <td className="px-5 py-3">
                            <div className="flex items-center justify-end gap-2">
                              {isNew && (
                                <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">
                                  <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                                  </svg>
                                  Uploaded successfully
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => setDeleteConfirm({ id: source.id, fileName: source.fileName, chunks: source.totalChunks })}
                                className="rounded-lg px-3 py-1.5 text-xs font-bold text-red-600 transition hover:bg-red-50">
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* How it works */}
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-bold text-slate-950">How it works</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {[
                { step: "1", title: "Upload any file", desc: "PDF, DOCX, XLSX, CSV, or plain text — the system parses all formats automatically." },
                { step: "2", title: "AI indexes content", desc: "The file is split into chunks and stored in the database. No re-upload needed on restart." },
                { step: "3", title: "Smart answers", desc: "When a user asks a question, the AI searches your knowledge base and uses relevant chunks to answer accurately." },
              ].map(({ step, title, desc }) => (
                <div key={step} className="flex gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-600 text-xs font-bold text-white">{step}</div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">{title}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
            onClick={() => setDeleteConfirm(null)}
          />
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-red-100">
              <svg className="h-5 w-5 text-red-600" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-slate-950">Delete knowledge source?</h3>
            <p className="mt-2 text-sm text-slate-600">
              You are about to permanently delete{" "}
              <span className="font-semibold text-slate-800">{deleteConfirm.fileName}</span>.
            </p>
            <p className="mt-1 text-sm text-slate-600">
              This will also delete all{" "}
              <span className="font-semibold text-slate-800">{deleteConfirm.chunks} knowledge chunks</span> associated
              with it. The AI will immediately stop using this data to answer questions.
            </p>
            <p className="mt-3 text-xs font-semibold text-red-600">This action cannot be undone.</p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50">
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700">
                Yes, delete permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
