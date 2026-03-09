import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

const TAB_COLORS = ["default", "red", "orange", "yellow", "green", "blue", "purple", "pink"] as const;
export type TabColor = typeof TAB_COLORS[number];
export { TAB_COLORS };

export interface SsmSessionInfo {
  accountId: string;
  accountName: string;
  instanceId: string;
  streamUrl: string;
  tokenValue: string;
  sessionId: string;
  status: "connecting" | "connected" | "disconnected";
  hasActivity: boolean;
  tabColor: TabColor;
}

interface SsmSessionContextType {
  sessions: SsmSessionInfo[];
  activeSessionId: string | null;
  addSession: (session: Omit<SsmSessionInfo, "hasActivity" | "tabColor">) => void;
  removeSession: (accountId: string) => void;
  setActiveSession: (accountId: string) => void;
  updateSessionStatus: (accountId: string, status: SsmSessionInfo["status"]) => void;
  markActivity: (accountId: string) => void;
  clearActivity: (accountId: string) => void;
  getSession: (accountId: string) => SsmSessionInfo | undefined;
  setTabColor: (accountId: string, color: TabColor) => void;
  reorderSession: (fromIndex: number, toIndex: number) => void;
}

const SsmSessionContext = createContext<SsmSessionContextType | null>(null);

export function SsmSessionProvider({ children }: { children: ReactNode }) {
  const [sessions, setSessions] = useState<SsmSessionInfo[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  const addSession = useCallback((session: Omit<SsmSessionInfo, "hasActivity" | "tabColor">) => {
    setSessions((prev) => {
      const existing = prev.find((s) => s.accountId === session.accountId);
      if (existing && existing.status !== "disconnected") return prev;
      return [...prev.filter((s) => s.accountId !== session.accountId), { ...session, hasActivity: false, tabColor: "default" as TabColor }];
    });
    setActiveSessionId(session.accountId);
  }, []);

  const removeSession = useCallback((accountId: string) => {
    setSessions((prev) => {
      const remaining = prev.filter((s) => s.accountId !== accountId);
      setActiveSessionId((cur) => {
        if (cur === accountId) {
          return remaining.length > 0 ? remaining[remaining.length - 1].accountId : null;
        }
        return cur;
      });
      return remaining;
    });
  }, []);

  const setActiveSession = useCallback((accountId: string) => {
    setActiveSessionId(accountId);
    setSessions((prev) =>
      prev.map((s) => (s.accountId === accountId ? { ...s, hasActivity: false } : s))
    );
  }, []);

  const updateSessionStatus = useCallback((accountId: string, status: SsmSessionInfo["status"]) => {
    setSessions((prev) =>
      prev.map((s) => (s.accountId === accountId ? { ...s, status } : s))
    );
  }, []);

  const markActivity = useCallback((accountId: string) => {
    setSessions((prev) =>
      prev.map((s) => (s.accountId === accountId && !s.hasActivity ? { ...s, hasActivity: true } : s))
    );
  }, []);

  const clearActivity = useCallback((accountId: string) => {
    setSessions((prev) =>
      prev.map((s) => (s.accountId === accountId && s.hasActivity ? { ...s, hasActivity: false } : s))
    );
  }, []);

  const getSession = useCallback(
    (accountId: string) => sessions.find((s) => s.accountId === accountId),
    [sessions]
  );

  const setTabColor = useCallback((accountId: string, color: TabColor) => {
    setSessions((prev) =>
      prev.map((s) => (s.accountId === accountId ? { ...s, tabColor: color } : s))
    );
  }, []);

  const reorderSession = useCallback((fromIndex: number, toIndex: number) => {
    setSessions((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  }, []);

  return (
    <SsmSessionContext.Provider
      value={{ sessions, activeSessionId, addSession, removeSession, setActiveSession, updateSessionStatus, markActivity, clearActivity, getSession, setTabColor, reorderSession }}
    >
      {children}
    </SsmSessionContext.Provider>
  );
}

export function useSsmSessions() {
  const ctx = useContext(SsmSessionContext);
  if (!ctx) throw new Error("useSsmSessions must be inside SsmSessionProvider");
  return ctx;
}
