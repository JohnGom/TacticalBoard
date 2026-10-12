import { useEffect, useState } from "react";
import type { HealthResponse } from "@tactical-board/contracts";
import { TacticalEditor } from "../editor/TacticalEditor";

type ApiStatus = "checking" | "online" | "offline";

function isHealthResponse(value: unknown): value is HealthResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    "status" in value &&
    value.status === "ok" &&
    "service" in value &&
    value.service === "api"
  );
}

export function App() {
  const [apiStatus, setApiStatus] = useState<ApiStatus>("checking");

  useEffect(() => {
    let active = true;

    fetch("/api/health")
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("API health check failed");
        }

        const payload: unknown = await response.json();
        if (!isHealthResponse(payload)) {
          throw new Error("Unexpected API health response");
        }

        return payload;
      })
      .then((health) => {
        if (active) {
          setApiStatus(health.status === "ok" ? "online" : "offline");
        }
      })
      .catch(() => {
        if (active) {
          setApiStatus("offline");
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const statusLabel = {
    checking: "Checking local API",
    online: "Local API connected",
    offline: "Local API unavailable",
  }[apiStatus];

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="TacticalBoard home">
          <span className="brand-mark" aria-hidden="true"><span /><span /><span /><span /></span>
          <span>TacticalBoard</span>
        </a>
        <span className={`status status--${apiStatus}`} role="status">
          <span className="status-dot" aria-hidden="true" />
          {statusLabel}
        </span>
      </header>

      <TacticalEditor />

      <footer className="page-footer">
        <span>Made for the game between the lines.</span>
        <span>Web-first · Provider independent</span>
      </footer>
    </div>
  );
}
