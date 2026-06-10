export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startServerKeepAlive } = await import("./lib/serverKeepAlive");
    startServerKeepAlive();
  }
}
