import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  // Also wake the BE so one external ping keeps both services alive
  const backendUrl = (process.env.BACKEND_URL || "https://nutro-assist.vercel.app").replace(/\/$/, "");
  fetch(`${backendUrl}/ping`, { cache: "no-store" }).catch(() => {});

  return NextResponse.json({ status: "ok", timestamp: new Date().toISOString() });
}
