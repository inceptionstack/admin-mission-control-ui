import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { TerminalSquare, X, ArrowLeft, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSsmSessions, TAB_COLORS, type TabColor, type SsmSessionInfo } from "../context/SsmSessionContext";
import { api } from "../api/client";
import { toast } from "sonner";

const COLOR_MAP: Record<TabColor, { dot: string; active: string; bg: string }> = {
  default: { dot: "", active: "bg-[#0a0a0f] text-foreground", bg: "" },
  red: { dot: "bg-red-400", active: "bg-red-950 text-red-300 border-b-2 border-b-red-400", bg: "bg-red-500/5" },
  orange: { dot: "bg-orange-400", active: "bg-orange-950 text-orange-300 border-b-2 border-b-orange-400", bg: "bg-orange-500/5" },
  yellow: { dot: "bg-yellow-400", active: "bg-yellow-950 text-yellow-300 border-b-2 border-b-yellow-400", bg: "bg-yellow-500/5" },
  green: { dot: "bg-emerald-400", active: "bg-emerald-950 text-emerald-300 border-b-2 border-b-emerald-400", bg: "bg-emerald-500/5" },
  blue: { dot: "bg-blue-400", active: "bg-blue-950 text-blue-300 border-b-2 border-b-blue-400", bg: "bg-blue-500/5" },
  purple: { dot: "bg-purple-400", active: "bg-purple-950 text-purple-300 border-b-2 border-b-purple-400", bg: "bg-purple-500/5" },
  pink: { dot: "bg-pink-400", active: "bg-pink-950 text-pink-300 border-b-2 border-b-pink-400", bg: "bg-pink-500/5" },
};

const statusDot = (status: string) =>
  status === "connected" ? "bg-emerald-400" :
  status === "connecting" ? "bg-amber-400 animate-pulse" :
  "bg-red-400";

export function Sessions() {
  const navigate = useNavigate();
  const { sessions, activeSessionId, setActiveSession, removeSession, setTabColor, reorderSession } = useSsmSessions();
  const [colorPickerFor, setColorPickerFor] = useState<string | null>(null);
  const [confirmClose, setConfirmClose] = useState<string | null>(null);
  const dragRef = useRef<{ index: number } | null>(null);

  // Auto-redirect to dashboard when last session is closed
  const wasPopulated = useRef(false);
  if (sessions.length > 0) wasPopulated.current = true;
  if (sessions.length === 0 && wasPopulated.current) {
    wasPopulated.current = false;
    // Use setTimeout to avoid state update during render
    setTimeout(() => navigate("/"), 0);
  }

  if (sessions.length === 0) {
    return (
      <div className="text-center py-20 px-8">
        <TerminalSquare className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-foreground mb-2">No active sessions</h2>
        <p className="text-muted-foreground mb-6">Click SSM on an environment card to start a terminal session.</p>
        <Button variant="outline" onClick={() => navigate("/")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Environments
        </Button>
      </div>
    );
  }

  function handleClose(accountId: string, status: string) {
    if (status !== "disconnected") {
      setConfirmClose(accountId);
    } else {
      removeSession(accountId);
    }
  }

  async function popOutSession(s: SsmSessionInfo) {
    // Get a fresh SSM session for the pop-out window
    try {
      const session = await api.getSsmSession(s.accountId);
      const params = new URLSearchParams({
        streamUrl: session.streamUrl,
        tokenValue: session.tokenValue,
        sessionId: session.sessionId,
        instanceId: session.instanceId,
        accountName: s.accountName,
        accountId: s.accountId,
      });
      const popUrl = `/terminal-popup?${params.toString()}`;
      window.open(popUrl, `ssm-${s.accountId}`, "width=900,height=600,menubar=no,toolbar=no,location=no,status=no");
      // Remove from tabs since it's now in its own window
      removeSession(s.accountId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to pop out session");
    }
  }

  return (
    <>
      <div className="flex items-center border-b border-border bg-zinc-900 shrink-0">
        <Button
          variant="ghost"
          size="sm"
          className="h-10 px-3 text-muted-foreground hover:text-foreground rounded-none border-r border-border"
          onClick={() => navigate("/")}
        >
          <ArrowLeft className="w-3.5 h-3.5" />
        </Button>

        <div className="flex-1 flex items-center overflow-x-auto">
          {sessions.map((s, index) => {
            const isActive = s.accountId === activeSessionId;
            const colors = COLOR_MAP[s.tabColor];

            return (
              <button
                key={s.accountId}
                draggable
                onDragStart={() => { dragRef.current = { index }; }}
                onDragOver={(e) => { e.preventDefault(); }}
                onDrop={() => {
                  if (dragRef.current && dragRef.current.index !== index) {
                    reorderSession(dragRef.current.index, index);
                  }
                  dragRef.current = null;
                }}
                onClick={(e) => { setActiveSession(s.accountId); (e.target as HTMLElement).blur(); setColorPickerFor(null); }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setColorPickerFor(colorPickerFor === s.accountId ? null : s.accountId);
                }}
                className={`group flex items-center gap-2 px-4 h-10 text-sm border-r border-border shrink-0 transition-colors relative select-none ${
                  isActive
                    ? (s.tabColor !== "default" ? colors.active : "bg-[#0a0a0f] text-foreground")
                    : s.hasActivity
                    ? "text-amber-300 bg-amber-500/5 hover:bg-amber-500/10"
                    : `text-muted-foreground hover:text-foreground hover:bg-muted/30 ${s.tabColor !== "default" ? colors.bg : ""}`
                }`}
              >
                {s.tabColor !== "default" ? (
                  <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${colors.dot}`} />
                ) : (
                  <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusDot(s.status)}`} />
                )}
                <span className={`font-medium truncate max-w-[150px] ${s.hasActivity && !isActive ? "font-semibold" : ""}`}>
                  {s.accountName}
                </span>
                {s.hasActivity && !isActive && (
                  <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
                )}
                {/* Pop out */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    popOutSession(s);
                  }}
                  className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Pop out to new window"
                >
                  <ExternalLink className="w-3 h-3" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClose(s.accountId, s.status);
                  }}
                  className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>

                {/* Color picker dropdown */}
                {colorPickerFor === s.accountId && (
                  <div
                    className="absolute top-full left-0 mt-1 z-50 bg-zinc-800 border border-zinc-700 rounded-lg p-2 shadow-xl flex gap-1.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {TAB_COLORS.map((color) => {
                      const isDefault = color === "default";
                      const dotClass = isDefault ? "bg-zinc-500" : COLOR_MAP[color].dot;
                      return (
                        <button
                          key={color}
                          onClick={(e) => {
                            e.stopPropagation();
                            setTabColor(s.accountId, color);
                            setColorPickerFor(null);
                          }}
                          className={`w-5 h-5 rounded-full border-2 transition-transform hover:scale-125 ${dotClass} ${
                            s.tabColor === color ? "border-white" : "border-transparent"
                          }`}
                          title={color}
                        />
                      );
                    })}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Close confirmation dialog */}
      {confirmClose && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center" onClick={() => setConfirmClose(null)}>
          <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 max-w-sm mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-foreground font-semibold mb-2">Close session?</h3>
            <p className="text-muted-foreground text-sm mb-4">
              This session is still active. Closing will disconnect from the instance.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setConfirmClose(null)}>Cancel</Button>
              <Button variant="destructive" size="sm" onClick={() => {
                removeSession(confirmClose);
                setConfirmClose(null);
              }}>
                Close Session
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
