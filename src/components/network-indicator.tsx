import { useEffect, useRef, useState } from "react";
import { useRouterState } from "@tanstack/react-router";

/**
 * Whether the app is waiting on the network, and whether it can reach it.
 *
 * Two things, shown differently on purpose. Work in flight is a thin bar at
 * the top of the window — ambient, ignorable, and it never moves layout.
 * Being offline is a worded pill, because it changes what the person should
 * do: nothing they submit now will land.
 *
 * Colours are literals rather than tokens so the component works above any
 * design system, and it must be mounted INSIDE the router (the root route's
 * component, not a sibling of RouterProvider) — `useRouterState` reads the
 * router out of React context, and outside it the hook returns null and
 * throws on `router.stores`.
 */
export function NetworkIndicator() {
  const navigating = useRouterState({ select: (s) => s.status === "pending" });
  // No react-query in this app, so router transitions are the only signal.
  const busy = navigating;

  const [online, setOnline] = useState(true);
  useEffect(() => {
    // Read in an effect, not during render: it does not exist while
    // server-rendering, and `true` is right for every connected visitor.
    const sync = () => setOnline(navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  return (
    <>
      <ProgressBar busy={busy} />
      {online ? null : <OfflinePill />}
    </>
  );
}

/**
 * Appears only once a request has been outstanding long enough to be worth
 * mentioning, then stays a moment so it reads as a state rather than a blink.
 * Without the delay every cached navigation strobes it; without the minimum a
 * 90ms request paints one frame of noise.
 */
function ProgressBar({ busy }: { busy: boolean }) {
  const [shown, setShown] = useState(false);
  const since = useRef(0);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (busy) {
      timer = setTimeout(() => {
        since.current = Date.now();
        setShown(true);
      }, 180);
    } else if (shown) {
      const held = Date.now() - since.current;
      timer = setTimeout(() => setShown(false), Math.max(0, 320 - held));
    }
    return () => clearTimeout(timer);
  }, [busy, shown]);

  return (
    <div
      aria-hidden
      data-ba-net
      style={{
        position: "fixed",
        insetInline: 0,
        top: 0,
        height: 2,
        zIndex: 90,
        overflow: "hidden",
        opacity: shown ? 1 : 0,
        transition: "opacity .2s ease",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          height: "100%",
          width: "40%",
          borderRadius: 999,
          background:
            "linear-gradient(90deg, transparent, #ea542d 22%, #f0693f 78%, transparent)",
          animation: shown ? "ba-net-sweep 1.05s linear infinite" : "none",
        }}
      />
      <style>{`
        @keyframes ba-net-sweep {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(350%); }
        }
        @media (prefers-reduced-motion: reduce) {
          [data-ba-net] > div { animation: none !important; width: 100% !important; opacity: .5; }
        }
      `}</style>
    </div>
  );
}

/** Announced, not just drawn: someone who cannot see it still needs to know. */
function OfflinePill() {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        left: "50%",
        transform: "translateX(-50%)",
        top: 12,
        zIndex: 91,
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 16px",
        borderRadius: 999,
        background: "#b3372f",
        color: "#fff",
        font: "500 0.85rem/1.2 system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
        boxShadow: "0 10px 30px -8px rgba(28,28,28,.35)",
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: 999,
          background: "currentColor",
          flex: "0 0 auto",
        }}
      />
      No connection — changes won't save until you're back online
    </div>
  );
}
