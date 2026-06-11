"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, isAdminAuthenticated, getAdminToken } from "@/lib/api";

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
  const [sources, setSources] = useState<KnowledgeSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchSources = useCallback(async () => {
    try {
      const data = await api.adminGet<KnowledgeSource[]>("/api/admin/knowledge/sources");
      setSources(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.toLowerCase().includes("401") || msg.toLowerCase().includes("unauthori")) {
        router.replace("/admin/login");
      }
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (!isAdminAuthenticated()) {
      router.replace("/admin/login");
      return;
    }
    fetchSources();
  }, [fetchSources, router]);

  async function uploadFile(file: File) {
    setUploading(true);
    setUploadError("");
    try {
      const token = getAdminToken();
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/backend/api/admin/knowledge/upload", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Upload failed (${res.status})`);
      }
      await fetchSources();
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  async function deleteSource(id: number) {
    setDeleteError("");
    try {
      await api.adminDelete<void>(`/api/admin/knowledge/sources/${id}`);
      setSources((prev) => prev.filter((s) => s.id !== id));
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
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center gap-4">
          <Link
            href="/admin/dashboard"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-100">
            ←
          </Link>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-950">Knowledge Base</h1>
            <p className="mt-0.5 text-sm text-slate-500">Upload files to train the AI nutrition coach</p>
          </div>
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
            <>
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-violet-200 border-t-violet-600" />
              <p className="text-sm font-semibold text-violet-700">Uploading and processing file…</p>
            </>
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
          <div className="mb-4 flex items-center gap-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            <span className="font-bold">Upload failed:</span> {uploadError}
            <button type="button" onClick={() => setUploadError("")} className="ml-auto text-red-500 hover:text-red-700">✕</button>
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
                  {sources.map((source) => (
                    <tr key={source.id} className="hover:bg-slate-50/60">
                      <td className="px-5 py-3 font-medium text-slate-800">{source.fileName}</td>
                      <td className="px-5 py-3">
                        <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-bold uppercase text-violet-700">
                          {source.fileType}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-slate-600">{source.totalChunks}</td>
                      <td className="px-5 py-3 text-slate-500">{formatDate(source.uploadedAt)}</td>
                      <td className="px-5 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => deleteSource(source.id)}
                          className="rounded-lg px-3 py-1.5 text-xs font-bold text-red-600 transition hover:bg-red-50">
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
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
  );
}
