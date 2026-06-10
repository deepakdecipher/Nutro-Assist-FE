"use client";

import { useEffect } from "react";

const TEN_MINUTES = 10 * 60 * 1000;

export default function KeepAliveScheduler() {
  useEffect(() => {
    const ping = () => {
      fetch("/api/ping", {
        cache: "no-store",
        keepalive: true,
      }).catch(() => {});
    };

    ping();
    const intervalId = window.setInterval(ping, TEN_MINUTES);

    return () => window.clearInterval(intervalId);
  }, []);

  return null;
}
