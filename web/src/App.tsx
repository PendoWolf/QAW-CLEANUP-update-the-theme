import { useEffect, useState } from "react";
import { api, ApiError, type AppState } from "./api";

// Counter actions dispatched through `run`. Each success fires the Pendo Track
// Event "demo-<action>"; any failure fires "demo-action-failed".
type CounterAction = "load" | "increment" | "decrement" | "reset" | "refresh";
type TrackProperties = Record<string, string | number | boolean>;

// Seam for Pendo. Novus installs the Pendo agent, which provides window.pendo
// at runtime; this fires a Track Event for each action. No-op when the agent
// isn't present (local dev), so the app and Playwright mocks both stay simple.
function trackEvent(name: CounterAction | "action-failed", properties?: TrackProperties) {
  if (typeof window !== "undefined") {
    try {
      window.pendo?.track?.(`demo-${name}`, properties);
    } catch (err) {
      // Analytics must never break the app or show up as a failed action.
      console.warn(`Pendo track failed: demo-${name}`, err);
    }
  }
}

// Properties for each action's success event, from the state on screen before
// the action (`previous`) and the state the API returned (`next`).
function successProperties(
  action: CounterAction,
  previous: AppState,
  next: AppState,
): TrackProperties {
  switch (action) {
    case "load":
      return { counter: next.counter, lastAction: next.lastAction };
    case "increment":
    case "decrement":
      return {
        counter: next.counter,
        previousCounter: previous.counter,
        previousLastAction: previous.lastAction,
      };
    case "reset":
      return { previousCounter: previous.counter, previousLastAction: previous.lastAction };
    case "refresh":
      // The server counter is shared by all clients, so a refresh can pull in
      // changes made elsewhere; stateChanged means the user was seeing stale data.
      return {
        counter: next.counter,
        lastAction: next.lastAction,
        previousCounter: previous.counter,
        stateChanged: next.counter !== previous.counter || next.lastAction !== previous.lastAction,
      };
  }
}

// React StrictMode runs the mount effect, and so the initial load, twice in
// development. Track the initial load's outcome once per page load, as in
// production; the flag is module-level so it survives StrictMode's remount.
let initialLoadTracked = false;

function shouldTrack(action: CounterAction): boolean {
  if (action !== "load") return true;
  if (initialLoadTracked) return false;
  initialLoadTracked = true;
  return true;
}

export default function App() {
  const [state, setState] = useState<AppState>({ counter: 0, lastAction: "none" });
  const [error, setError] = useState<string | null>(null);

  const run = async (action: CounterAction, fn: () => Promise<AppState>) => {
    const previous = state; // what's on screen as the action starts
    try {
      setError(null);
      const next = await fn();
      setState(next);
      if (shouldTrack(action)) trackEvent(action, successProperties(action, previous, next));
    } catch (e) {
      setError((e as Error).message);
      if (shouldTrack(action)) {
        trackEvent("action-failed", {
          action,
          // Capped to stay well under Pendo's 512-byte limit for properties.
          errorMessage: (e instanceof Error ? e.message : String(e)).slice(0, 200),
          counter: previous.counter, // a failed call leaves the screen unchanged
          // Only non-2xx responses carry a status; network/CORS failures don't.
          ...(e instanceof ApiError ? { httpStatus: e.status } : {}),
        });
      }
    }
  };

  useEffect(() => {
    run("load", api.getState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", maxWidth: 480, margin: "4rem auto", textAlign: "center" }}>
      <h1>QAWolf Demo</h1>

      <p data-testid="counter-value" style={{ fontSize: "3rem", margin: "1rem 0" }}>
        {state.counter}
      </p>
      <p data-testid="last-action" style={{ color: "#666" }}>
        Last action: {state.lastAction}
      </p>

      <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
        <button data-testid="btn-increment" onClick={() => run("increment", api.increment)}>
          Increment
        </button>
        <button data-testid="btn-decrement" onClick={() => run("decrement", api.decrement)}>
          Decrement
        </button>
        <button data-testid="btn-reset" onClick={() => run("reset", api.reset)}>
          Reset
        </button>
        <button data-testid="btn-refresh" onClick={() => run("refresh", api.getState)}>
          Refresh
        </button>
      </div>

      {error && (
        <p data-testid="error" style={{ color: "crimson", marginTop: 16 }}>
          {error}
        </p>
      )}
    </main>
  );
}
