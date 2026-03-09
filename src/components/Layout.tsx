import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Rocket,
  Home,
  PlusCircle,
  LogOut,
  TerminalSquare,
  Star,
  ChevronDown,
  ChevronRight,
  Radio,
  BarChart3,
  GitBranch,
  XCircle,
  BookOpen,
  UserPlus,
  Boxes,
  Key,
  Zap,
  Wallet,
  ExternalLink,
  ClipboardList,
  PanelLeftClose,
  PanelLeft,
  Plus,
  X,
  Wrench,
} from "lucide-react";
import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "../auth/useAuth";
import { useSsmSessions } from "../context/SsmSessionContext";
import { useFavorites } from "../context/FavoritesContext";
import { SsmTerminalLayer } from "./SsmTerminalLayer";
import { api, pipelinesApi, signupsApi } from "../api/client";
import type { Environment } from "../types";

export function Layout() {
  const { user, logout } = useAuth();
  const { sessions, activeSessionId, setActiveSession, addSession, removeSession } = useSsmSessions();
  const { favorites } = useFavorites();
  const location = useLocation();
  const navigate = useNavigate();
  const [sessionsExpanded, setSessionsExpanded] = useState(true);
  const [envsExpanded, setEnvsExpanded] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(() => localStorage.getItem("sidebar-open") !== "0");
  const [quickTaskOpen, setQuickTaskOpen] = useState(false);
  const [quickTaskText, setQuickTaskText] = useState("");
  const [quickTaskSaving, setQuickTaskSaving] = useState(false);
  const quickTaskRef = useRef<HTMLInputElement>(null);

  const openQuickTask = () => {
    setQuickTaskOpen(true);
    setTimeout(() => quickTaskRef.current?.focus(), 50);
  };

  const closeQuickTask = () => {
    setQuickTaskOpen(false);
    setQuickTaskText("");
  };

  const saveQuickTask = async () => {
    if (!quickTaskText.trim() || quickTaskSaving) return;
    setQuickTaskSaving(true);
    try {
      const token = localStorage.getItem("id_token") || "";
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ title: quickTaskText.trim(), status: "backlog" }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      closeQuickTask();
    } catch (e) {
      console.error("Quick task failed", e);
    } finally {
      setQuickTaskSaving(false);
    }
  };
  const toggleSidebar = () => { const next = !sidebarOpen; setSidebarOpen(next); localStorage.setItem("sidebar-open", next ? "1" : "0"); };

  const liveSessions = sessions.filter((s) => s.status !== "disconnected");
  const isSessionsPage = location.pathname === "/sessions";

  const { data: environments } = useQuery<Environment[]>({
    queryKey: ["environments"],
    queryFn: () => api.listEnvironments(),
    staleTime: 60_000,
  });

  const { data: pipelinesData } = useQuery({
    queryKey: ["pipelines"],
    queryFn: () => pipelinesApi.list(),
    staleTime: 30_000,
    refetchInterval: 30_000,
  });

  const activePipelineCount = (pipelinesData?.pipelines || []).filter(p => p.status === "InProgress").length;

  const { data: signupsData } = useQuery({
    queryKey: ["signups-nav"],
    queryFn: () => signupsApi.list("new"),
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
  const newSignupCount = signupsData?.total || 0;

  const { data: tasksData } = useQuery({
    queryKey: ["tasks-nav"],
    queryFn: async () => {
      const token = localStorage.getItem("id_token") || "";
      const res = await fetch("/api/tasks", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 30_000,
    refetchInterval: 30_000,
  });
  const inProgressCount = Array.isArray(tasksData) ? tasksData.filter((t: any) => t.status === "in-progress" && !t.archived).length : 0;

  const allEnvs = environments || [];
  const activeEnvs = allEnvs.filter((e) => e.status !== "SUSPENDED");
  const readyCount = activeEnvs.filter((e) => e.status === "READY").length;
  const starredEnvs = allEnvs.filter((e) => favorites.includes(e.accountId));

  const statusDot = (status: string) =>
    status === "connected" ? "bg-emerald-400" :
    status === "connecting" ? "bg-amber-400 animate-pulse" :
    "bg-red-400";

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className={`${sidebarOpen ? "w-64" : "w-0 overflow-hidden"} bg-card border-r border-border flex flex-col shrink-0 transition-all duration-200`}>
        <div className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center shrink-0">
              <Rocket className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <h1 className="text-foreground font-bold text-sm leading-tight">FastStart</h1>
              <p className="text-muted-foreground text-xs">Mission Control</p>
            </div>
          </div>
        </div>

        <Separator />

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          <div>
            <div className="flex items-center">
              <button
                onClick={() => {
                  if (location.pathname !== "/") navigate("/");
                  setEnvsExpanded((p) => !p);
                }}
                className={`flex-1 flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname === "/" ? "bg-primary/10 text-primary border border-primary/20" : "text-muted-foreground hover:text-foreground hover:bg-accent"
                }`}
              >
                {activeEnvs.length > 0 ? (
                  envsExpanded ? <ChevronDown className="w-4 h-4 shrink-0" /> : <ChevronRight className="w-4 h-4 shrink-0" />
                ) : null}
                <Home className="w-5 h-5 shrink-0" />
                <span className="flex-1 text-left">Home</span>
                {readyCount > 0 && (
                  <span className="bg-emerald-500/20 text-emerald-400 text-xs font-bold px-1.5 py-0.5 rounded-full">
                    {readyCount}
                  </span>
                )}
              </button>
              <button onClick={() => navigate("/create")} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors" title="Create new environment">
                <PlusCircle className="w-4 h-4" />
              </button>
            </div>

            {envsExpanded && activeEnvs.length > 0 && (
              <div className="ml-3 mt-0.5 space-y-0.5 border-l border-border/50 pl-2">
                {activeEnvs.map((env) => {
                  const isEnvActive = location.pathname === `/env/${env.accountId}` || location.pathname === `/connect/${env.accountId}`;
                  const hasSession = sessions.some((s) => s.accountId === env.accountId && s.status !== "disconnected");
                  const canConnect = env.status === "READY" && env.ssmStatus === "Online";
                  return (
                    <div key={env.accountId} className="group flex items-center">
                      <button
                        onClick={() => navigate(`/env/${env.accountId}`)}
                        className={`flex-1 flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-medium transition-colors text-left min-w-0 ${
                          isEnvActive
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:text-foreground hover:bg-accent"
                        }`}
                      >
                        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                          env.status === "READY" && env.ssmStatus === "Online" ? "bg-emerald-400"
                          : env.status === "DEPLOYING" ? "bg-amber-400 animate-pulse"
                          : env.status === "ERROR" ? "bg-red-400"
                          : env.status === "CLOSING" || env.status === "PENDING_CLOSURE" ? "bg-orange-400"
                          : "bg-zinc-500"
                        }`} />
                        <span className="truncate">{(env as any).displayName || env.accountName}</span>
                        {hasSession && (
                          <TerminalSquare className="w-3 h-3 text-emerald-400 shrink-0 ml-auto animate-pulse" />
                        )}
                      </button>
                      {canConnect && !hasSession && (
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              const session = await api.getSsmSession(env.accountId);
                              addSession({
                                accountId: env.accountId, accountName: env.accountName,
                                instanceId: env.instanceId || "", streamUrl: session.streamUrl,
                                tokenValue: session.tokenValue, sessionId: session.sessionId || "",
                                status: "connecting",
                              });
                              navigate("/sessions");
                            } catch (err) { console.error("SSM connect failed:", err); }
                          }}
                          className="p-1 rounded text-muted-foreground/50 hover:text-emerald-400 hover:bg-emerald-500/10 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                          title="Start terminal"
                        >
                          <TerminalSquare className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {hasSession && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const sess = sessions.find((s) => s.accountId === env.accountId && s.status !== "disconnected");
                            if (sess) removeSession(sess.accountId);
                          }}
                          className="p-1 rounded text-muted-foreground/50 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                          title="End terminal"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <NavLink to="/broadcast" className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive ? "bg-primary/10 text-primary border border-primary/20" : "text-muted-foreground hover:text-foreground hover:bg-accent"}`}>
            <Radio className="w-5 h-5 shrink-0" />
            Broadcast
          </NavLink>

          <NavLink to="/insights" className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive ? "bg-primary/10 text-primary border border-primary/20" : "text-muted-foreground hover:text-foreground hover:bg-accent"}`}>
            <BarChart3 className="w-5 h-5 shrink-0" />
            Insights
          </NavLink>

          <NavLink to="/signups" className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive ? "bg-primary/10 text-primary border border-primary/20" : "text-muted-foreground hover:text-foreground hover:bg-accent"}`}>
            <UserPlus className="w-5 h-5 shrink-0" />
            <span className="flex-1 text-left">Signups</span>
            {newSignupCount > 0 && (
              <span className="bg-blue-500/20 text-blue-400 text-xs font-bold px-1.5 py-0.5 rounded-full">
                {newSignupCount}
              </span>
            )}
          </NavLink>

          <NavLink to="/bootstrap" className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive ? "bg-primary/10 text-primary border border-primary/20" : "text-muted-foreground hover:text-foreground hover:bg-accent"}`}>
            <Wrench className="w-4 h-4" /> Bootstrap
          </NavLink>

          <NavLink to="/pipelines" className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive ? "bg-primary/10 text-primary border border-primary/20" : "text-muted-foreground hover:text-foreground hover:bg-accent"}`}>
            <GitBranch className="w-5 h-5 shrink-0" />
            <span className="flex-1 text-left">Pipelines</span>
            {activePipelineCount > 0 && (
              <span className="bg-amber-500/20 text-amber-400 text-xs font-bold px-1.5 py-0.5 rounded-full animate-pulse">
                {activePipelineCount}
              </span>
            )}
          </NavLink>

          <NavLink to="/prompts" className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive ? "bg-primary/10 text-primary border border-primary/20" : "text-muted-foreground hover:text-foreground hover:bg-accent"}`}>
            <BookOpen className="w-5 h-5 shrink-0" />
            Prompts
          </NavLink>

          <NavLink to="/apps" className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive ? "bg-primary/10 text-primary border border-primary/20" : "text-muted-foreground hover:text-foreground hover:bg-accent"}`}>
            <Boxes className="w-5 h-5 shrink-0" />
            Apps
          </NavLink>

          <NavLink to="/budgets" className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive ? "bg-primary/10 text-primary border border-primary/20" : "text-muted-foreground hover:text-foreground hover:bg-accent"}`}>
            <Wallet className="w-5 h-5 shrink-0" />
            Budgets
          </NavLink>

          <NavLink to="/tasks" className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive ? "bg-primary/10 text-primary border border-primary/20" : "text-muted-foreground hover:text-foreground hover:bg-accent"}`}>
            <ClipboardList className="w-5 h-5 shrink-0" />
            <span className="flex-1 text-left">Tasks</span>
            {inProgressCount > 0 && (
              <span className="bg-blue-500/20 text-blue-400 text-xs font-bold px-1.5 py-0.5 rounded-full">
                {inProgressCount}
              </span>
            )}
          </NavLink>

          <NavLink to="/keys" className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive ? "bg-primary/10 text-primary border border-primary/20" : "text-muted-foreground hover:text-foreground hover:bg-accent"}`}>
            <Key className="w-5 h-5 shrink-0" />
            API Keys
          </NavLink>

          <a href="https://d3ufcdjd9mmd5a.cloudfront.net/ui/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-muted-foreground hover:text-foreground hover:bg-accent">
            <Zap className="w-5 h-5 shrink-0" />
            <span className="flex-1 text-left">LLM Gateway</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-50" />
          </a>

          <a href="https://d34lbl9j92d3qw.cloudfront.net" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-muted-foreground hover:text-foreground hover:bg-accent">
            <BookOpen className="w-5 h-5 shrink-0" />
            <span className="flex-1 text-left">Outline Wiki</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-50" />
          </a>

          {/* Sessions link — shows active count */}
          <NavLink
            to="/sessions"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              }`
            }
          >
            <TerminalSquare className="w-5 h-5 shrink-0" />
            <span className="flex-1 text-left">Sessions</span>
            {liveSessions.length > 0 && (
              <span className="bg-emerald-500/20 text-emerald-400 text-xs font-bold px-1.5 py-0.5 rounded-full">
                {liveSessions.length}
              </span>
            )}
          </NavLink>

          {/* Starred environments */}
          {starredEnvs.length > 0 && (
            <>
              <div className="pt-3 pb-1 px-3">
                <p className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-wider flex items-center gap-1.5">
                  <Star className="w-3 h-3" />
                  Starred
                </p>
              </div>
              {starredEnvs.map((env) => {
                const isEnvActive = location.pathname === `/env/${env.accountId}` || location.pathname === `/connect/${env.accountId}`;
                return (
                  <button key={env.accountId} onClick={() => navigate(`/env/${env.accountId}`)} className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors w-full text-left ${isEnvActive ? "bg-primary/10 text-primary border border-primary/20" : "text-muted-foreground hover:text-foreground hover:bg-accent"}`}>
                    <div className={`w-2 h-2 rounded-full shrink-0 ${env.status === "READY" && env.ssmStatus === "Online" ? "bg-emerald-400" : env.status === "DEPLOYING" ? "bg-amber-400 animate-pulse" : "bg-zinc-500"}`} />
                    <span className="truncate">{env.accountName}</span>
                  </button>
                );
              })}
            </>
          )}
        </nav>

        <Separator />

        <div className="p-3">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center text-xs text-foreground font-medium shrink-0">
              {user?.email?.charAt(0).toUpperCase() || "?"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-foreground truncate">{user?.email || "Unknown"}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={logout} title="Sign out" className="text-muted-foreground hover:text-destructive shrink-0 h-8 w-8">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-hidden bg-background flex flex-col relative">
        <button onClick={toggleSidebar} title={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
          className="absolute top-3 left-3 z-10 p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors">
          {sidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
        </button>

        {/* Quick Task Button */}
        <div className="absolute top-3 right-4 z-10">
          {quickTaskOpen ? (
            <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-700 rounded-lg shadow-lg px-2 py-1">
              <Plus className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
              <input
                ref={quickTaskRef}
                value={quickTaskText}
                onChange={e => setQuickTaskText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter") saveQuickTask();
                  if (e.key === "Escape") closeQuickTask();
                }}
                placeholder="Quick task... (Enter to save)"
                className="w-64 bg-transparent text-sm text-zinc-200 outline-none placeholder:text-zinc-600"
              />
              {quickTaskSaving ? (
                <div className="w-3.5 h-3.5 border border-zinc-500 border-t-transparent rounded-full animate-spin shrink-0" />
              ) : (
                <button onClick={closeQuickTask} className="p-0.5 rounded hover:bg-zinc-700 text-zinc-500 hover:text-zinc-300 shrink-0">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={openQuickTask}
              title="Quick add task (⚡)"
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors text-xs font-medium"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Task</span>
            </button>
          )}
        </div>
        {isSessionsPage ? (
          <>
            <div className="shrink-0">
              <Outlet />
            </div>
            <SsmTerminalLayer />
          </>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto">
              <div className="p-8 max-w-7xl mx-auto">
                <Outlet />
              </div>
            </div>
            <SsmTerminalLayer />
          </>
        )}
      </main>
    </div>
  );
}
