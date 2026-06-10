const TEN_MINUTES = 10 * 60 * 1000;
const DEFAULT_FRONTEND_URL = "https://nutro-assist-fe.onrender.com";

declare global {
  // eslint-disable-next-line no-var
  var nutroAssistKeepAliveInterval: NodeJS.Timeout | undefined;
}

function getFrontendUrl() {
  return (
    process.env.FRONTEND_URL ||
    process.env.NEXT_PUBLIC_FRONTEND_URL ||
    process.env.RENDER_EXTERNAL_URL ||
    DEFAULT_FRONTEND_URL
  ).replace(/\/$/, "");
}

async function pingFrontend() {
  try {
    const url = `${getFrontendUrl()}/api/ping`;
    await fetch(url, { cache: "no-store" });
    console.log("[keep-alive] FE ping success");
  } catch (error) {
    console.error("[keep-alive] FE ping failed", error);
  }
}

export function startServerKeepAlive() {
  if (globalThis.nutroAssistKeepAliveInterval) return;

  pingFrontend();
  globalThis.nutroAssistKeepAliveInterval = setInterval(
    pingFrontend,
    TEN_MINUTES
  );
}
