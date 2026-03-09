import { useLocation } from "react-router-dom";
import { useSsmSessions } from "../context/SsmSessionContext";
import { SsmTerminalPane } from "./SsmTerminal";

/**
 * Rendered at the Layout level so terminals survive page navigation.
 * Uses flex layout (not absolute) — sits below the Sessions tab bar.
 */
export function SsmTerminalLayer() {
  const location = useLocation();
  const { sessions, activeSessionId } = useSsmSessions();
  const onSessionsPage = location.pathname === "/sessions";

  // Always render (to keep terminals alive), but hide when not on sessions page
  if (sessions.length === 0) return null;

  return (
    <div
      className="relative"
      style={{
        flex: onSessionsPage ? 1 : 0,
        minHeight: 0,
        visibility: onSessionsPage ? "visible" : "hidden",
        overflow: "hidden",
        // When not on sessions page, collapse to 0 height
        height: onSessionsPage ? undefined : 0,
      }}
    >
      {sessions.map((s) => {
        const isActive = s.accountId === activeSessionId && onSessionsPage;
        return (
          <div
            key={s.accountId}
            style={{
              position: "absolute",
              inset: 0,
              padding: "4px",
              zIndex: isActive ? 10 : 0,
              visibility: isActive ? "visible" : "hidden",
            }}
          >
            <SsmTerminalPane
              accountId={s.accountId}
              accountName={s.accountName}
              instanceId={s.instanceId}
              streamUrl={s.streamUrl}
              tokenValue={s.tokenValue}
              visible={isActive}
            />
          </div>
        );
      })}
    </div>
  );
}
