"use client";

import dynamic from "next/dynamic";
import { useState, useSyncExternalStore } from "react";

const SkyScene = dynamic(() => import("./SkyScene"), { ssr: false });

const read = (key: string) => () => new URLSearchParams(window.location.search).get(key);
const noop = () => () => {};

/** Full-screen sky experiment. ?t=0..1 sets time of day, ?view=rear the camera, ?shot=1 hides the UI. */
export function SkyTest() {
  const tParam = useSyncExternalStore(noop, read("t"), () => null);
  const view = useSyncExternalStore(noop, read("view"), () => null) === "rear" ? "rear" : "front";
  const shot = useSyncExternalStore(noop, read("shot"), () => null) === "1";
  const [override, setOverride] = useState<number | null>(null);
  const t = override ?? (tParam !== null ? Number(tParam) : 1);

  return (
    <div className="fixed inset-0 bg-bg">
      <SkyScene t={t} view={view} />
      {!shot && (
        <label className="absolute bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-4 rounded-sm border border-border bg-panel/80 px-4 py-3 font-mono text-xs tracking-wider text-muted uppercase backdrop-blur-md">
          Time of day
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={t}
            onChange={(e) => setOverride(Number(e.target.value))}
            className="w-56 accent-[var(--color-accent)]"
          />
          <span className="w-10 text-text">{Math.round(t * 100)}%</span>
        </label>
      )}
    </div>
  );
}
