import { useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ArrowLeft, CheckCircle, Clock, AlertTriangle, Server, Activity, Globe, Ban, Info,
  Terminal, Loader, Star, Send, Loader2,
  RefreshCw, Cpu, Shield, DollarSign, Wifi, WifiOff,
  ChevronDown, ChevronRight, Zap, MessageSquare, BarChart3, HardDrive, Clock4,
  Circle, XCircle, Monitor, ExternalLink, Eye, EyeOff, Copy, Check,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar,
} from "recharts";
import { api, agentApi, insightsApi, prompts as promptsApi, type AgentHistoryEntry, type ChatMessage, type Prompt } from "../api/client";
import { StatusBadge } from "../components/StatusBadge";
import { useFavorites } from "../context/FavoritesContext";
import { useSsmSessions } from "../context/SsmSessionContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import type { SetupLogEntry, PipelineStep, EnvironmentDetails as EnvironmentDetailsType } from "../types";
import { VendingStatus } from "../components/VendingStatus";

const QUICK_PROMPTS = [
  { label: "Status", prompt: "Run 'openclaw status' and report concisely." },
  { label: "Restart", prompt: "Run 'openclaw gateway restart' and confirm." },
  { label: "Disk", prompt: "Run 'df -h /' and report disk usage." },
  { label: "Uptime", prompt: "Run 'uptime' and report." },
  { label: "Logs", prompt: "Show the last 20 lines of the OpenClaw gateway log." },
  { label: "Memory", prompt: "Run 'free -h' and report memory usage." },
];

function LogIcon({ status }: { status: SetupLogEntry["status"] }) {
  switch (status) {
    case "complete": return <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />;
    case "pending": return <Clock className="w-4 h-4 text-amber-400 shrink-0" />;
    case "error": return <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />;
  }
}

function StatCard({ icon: Icon, label, value, subtext, color = "text-foreground" }: {
  icon: any; label: string; value: string | number; subtext?: string; color?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-muted/50"><Icon className="w-4 h-4 text-muted-foreground" /></div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className={`text-lg font-bold ${color}`}>{value}</p>
            {subtext && <p className="text-[11px] text-muted-foreground">{subtext}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


function StackProgressPanel({ accountId }: { accountId: string }) {
  const [expanded, setExpanded] = useState(false);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchProgress = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/environments/${accountId}/stack-progress`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("id_token") || ""}` },
      });
      if (res.ok) setData(await res.json());
    } catch {}
    setLoading(false);
  };

  const toggle = () => {
    if (!expanded && !data) fetchProgress();
    setExpanded(!expanded);
  };

  const statusColor = (s: string) => {
    if (s?.includes("COMPLETE") && !s?.includes("ROLLBACK") && !s?.includes("DELETE")) return "text-emerald-400";
    if (s?.includes("IN_PROGRESS")) return "text-blue-400";
    if (s?.includes("FAILED") || s?.includes("ROLLBACK")) return "text-red-400";
    if (s?.includes("DELETE")) return "text-zinc-500";
    return "text-zinc-400";
  };

  return (
    <div className="mt-2 border-t border-border pt-2">
      <button onClick={toggle} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors w-full">
        {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        Stack Resources
        {loading && <span className="ml-1 w-3 h-3 border border-zinc-500 border-t-transparent rounded-full animate-spin inline-block" />}
      </button>
      {expanded && data && (
        <div className="mt-2 space-y-1 max-h-60 overflow-y-auto">
          <div className="text-[10px] text-zinc-600 mb-1">{data.stackName} — {data.status}</div>
          {data.resources?.map((r: any, i: number) => (
            <div key={i} className="flex items-center justify-between text-[11px] py-0.5 px-1 rounded hover:bg-zinc-800/50">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${r.status?.includes("COMPLETE") && !r.status?.includes("ROLLBACK") && !r.status?.includes("DELETE") ? "bg-emerald-400" : r.status?.includes("IN_PROGRESS") ? "bg-blue-400 animate-pulse" : r.status?.includes("FAILED") ? "bg-red-400" : "bg-zinc-500"}`} />
                <span className="text-zinc-300 truncate">{r.logicalId}</span>
              </div>
              <span className={`shrink-0 ml-2 ${statusColor(r.status)}`}>{r.status?.replace("_", " ")}</span>
            </div>
          ))}
          {data.resources?.length === 0 && <p className="text-[10px] text-zinc-600">No resources found</p>}
        </div>
      )}
    </div>
  );
}

export function EnvironmentDetails() {
  const { accountId } = useParams();
  const navigate = useNavigate();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { addSession } = useSsmSessions();

  const [prompt, setPrompt] = useState("");
  const [showSsmPromptPicker, setShowSsmPromptPicker] = useState(false);
  const [ssmPrompts, setSsmPrompts] = useState<Prompt[]>([]);
  const [selectedSsmPrompt, setSelectedSsmPrompt] = useState<string>("");
  const [sending, setSending] = useState(false);
  const [cmdType, setCmdType] = useState<"agent" | "shell">("agent");
  const [runAs, setRunAs] = useState<string>("ec2-user");
  const [agentResponse, setAgentResponse] = useState<{ text: string; model?: string; durationMs?: number; tokens?: number } | null>(null);
  // showLog state removed — replaced by pipeline stepper

  // Console credentials (lazy-loaded on reveal)
  const [consolePassword, setConsolePassword] = useState<string | null>(null);
  const [consolePasswordVisible, setConsolePasswordVisible] = useState(false);
  const [consolePasswordLoading, setConsolePasswordLoading] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [consoleCopied, setConsoleCopied] = useState<Record<string, boolean>>({});

  const { data: env, isLoading } = useQuery({
    queryKey: ["environment", accountId],
    queryFn: () => api.getEnvironment(accountId!),
    enabled: !!accountId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "DEPLOYING" ? 5000 : 15000;
    },
  });

  // Token usage for this account
  const { data: tokenData } = useQuery({
    queryKey: ["tokens", accountId],
    queryFn: async () => {
      const all = await insightsApi.getTokenUsage();
      return all.accounts?.find((a: any) => a.accountId === accountId);
    },
    staleTime: 60000,
  });

  // Security findings for this account
  const { data: secData } = useQuery({
    queryKey: ["security", accountId],
    queryFn: async () => {
      const all = await insightsApi.getSecurityFindings();
      const myFindings = all.findings?.filter((f: any) => f.accountId === accountId) || [];
      return {
        critical: myFindings.filter((f: any) => f.severity === "CRITICAL").length,
        high: myFindings.filter((f: any) => f.severity === "HIGH").length,
        medium: myFindings.filter((f: any) => f.severity === "MEDIUM").length,
        total: myFindings.length,
        findings: myFindings.slice(0, 5),
      };
    },
    staleTime: 60000,
  });

  // Message history (OpenClaw session logs, cached 5min)
  const queryClient = useQueryClient();
  const [messagesRefreshing, setMessagesRefreshing] = useState(false);
  const { data: messagesData, refetch: refetchMessages } = useQuery({
    queryKey: ["messages", accountId],
    queryFn: () => api.getMessages(accountId!),
    staleTime: 60_000,
    enabled: !!accountId && env?.status === "READY",
  });

  const forceRefreshMessages = async () => {
    setMessagesRefreshing(true);
    try {
      const fresh = await api.getMessages(accountId!, true);
      queryClient.setQueryData(["messages", accountId], fresh);
    } catch { /* ignore */ }
    setMessagesRefreshing(false);
  };

  // Legacy SSM-based history (kept for broadcast commands)
  const { data: historyData, refetch: refetchHistory } = useQuery({
    queryKey: ["agent-history", accountId],
    queryFn: () => agentApi.getHistory(accountId!),
    staleTime: 30000,
    enabled: !!accountId && env?.status === "READY",
  });

  const [historyExpanded, setHistoryExpanded] = useState<Set<string>>(new Set());
  const toggleHistory = (id: string) => setHistoryExpanded(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const handleSendPrompt = useCallback(async (text: string) => {
    if (!text.trim() || !accountId || sending) return;
    setSending(true);
    setAgentResponse(null);
    try {
      const { results } = await agentApi.send(text.trim(), [accountId], cmdType, cmdType === "shell" ? runAs : undefined);
      const r = results[0];
      if (!r || r.status === "Failed") {
        setAgentResponse({ text: `❌ ${r?.error || "Failed to send"}` });
        return;
      }
      // Poll for result
      const poll = async (attempts: number): Promise<void> => {
        if (attempts <= 0) { setAgentResponse({ text: "⏱ Timed out waiting for response" }); return; }
        await new Promise(res => setTimeout(res, 3000));
        const result = await agentApi.getResult(r.accountId, r.commandId, r.instanceId);
        if (result.status === "Success" || result.status === "Failed") {
          setAgentResponse({
            text: result.output || result.error || "No output",
            model: (result as any).model,
            durationMs: (result as any).durationMs,
            tokens: (result as any).tokens,
          });
        } else {
          return poll(attempts - 1);
        }
      };
      await poll(60);
    } catch (err) {
      setAgentResponse({ text: `❌ ${err instanceof Error ? err.message : "Error"}` });
    } finally {
      setSending(false);
      refetchHistory();
    }
  }, [accountId, sending, cmdType, runAs, refetchHistory]);

  const handleSsmConnect = useCallback(async () => {
    if (!env?.accountId || !env?.instanceId) return;
    // Load prompts for the picker
    try {
      const data = await promptsApi.list("base");
      setSsmPrompts(data || []);
    } catch { setSsmPrompts([]); }
    setSelectedSsmPrompt("");
    setShowSsmPromptPicker(true);
  }, [env]);

  const handleSsmConnectConfirm = useCallback(async () => {
    if (!env?.accountId || !env?.instanceId) return;
    setShowSsmPromptPicker(false);
    try {
      const session = await api.getSsmSession(env.accountId);
      addSession({
        accountId: env.accountId, accountName: env.accountName, instanceId: env.instanceId,
        streamUrl: session.streamUrl, tokenValue: session.tokenValue, sessionId: session.sessionId || "", status: "connecting",
      });
      navigate("/sessions");
    } catch (err) {
      console.error("SSM connect failed:", err);
    }
  }, [env, addSession, navigate]);

  const handleRevealConsolePassword = useCallback(async () => {
    if (consolePassword) {
      setConsolePasswordVisible(!consolePasswordVisible);
      return;
    }
    if (!accountId) return;
    setConsolePasswordLoading(true);
    try {
      const creds = await api.getConsoleCredentials(accountId);
      setConsolePassword(creds.password);
      setConsolePasswordVisible(true);
    } catch {
      // No credentials available
    } finally {
      setConsolePasswordLoading(false);
    }
  }, [accountId, consolePassword, consolePasswordVisible]);

  const copyConsoleField = useCallback(async (field: string, value: string) => {
    await navigator.clipboard.writeText(value);
    setConsoleCopied(prev => ({ ...prev, [field]: true }));
    setTimeout(() => setConsoleCopied(prev => ({ ...prev, [field]: false })), 2000);
  }, []);

  const copyAllConsoleCredentials = useCallback(async () => {
    if (!env?.consoleUrl || !env?.consoleEmail || !accountId) return;
    let password = consolePassword;
    if (!password) {
      try {
        setConsolePasswordLoading(true);
        const creds = await api.getConsoleCredentials(accountId);
        password = creds.password;
        setConsolePassword(password);
        setConsolePasswordVisible(true);
      } catch {
        return;
      } finally {
        setConsolePasswordLoading(false);
      }
    }
    const soloMcUrl = `https://d2bb25pqbi7pou.cloudfront.net/connect?account=${accountId}`;
    const ssmUrl = `https://d2p31kzs1nmxew.cloudfront.net/env/${accountId}`;
    const text = [
      `FastStart Credentials for ${env.accountName || accountId}`,
      `${"─".repeat(40)}`,
      ``,
      `🚀 Your Loki FastStart Personal Mission Control:`,
      `${soloMcUrl}`,
      ``,
      `💻 Web Terminal (SSM):`,
      `${ssmUrl}`,
      ``,
      `🔑 Console Credentials:`,
      `URL:      ${env.consoleUrl}`,
      `Email:    ${env.consoleEmail}`,
      `Password: ${password}`,
    ].join("\n");
    await navigator.clipboard.writeText(text);
    setConsoleCopied(prev => ({ ...prev, all: true }));
    setTimeout(() => setConsoleCopied(prev => ({ ...prev, all: false })), 2000);
  }, [env, accountId, consolePassword]);

  if (isLoading) return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-64" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-24" />)}</div>
    </div>
  );
  if (!env) return (
    <div className="text-center py-12">
      <p className="text-muted-foreground">Environment not found</p>
      <Button variant="link" onClick={() => navigate("/")}>Back to dashboard</Button>
    </div>
  );

  const isReady = env.status === "READY";
  const isDeploying = env.status === "DEPLOYING";
  const isOnline = env.ssmStatus === "Online";
  const dailyTokens = tokenData?.daily || [];
  const totalTokens = tokenData?.totalTokens || 0;
  const totalInvocations = tokenData?.totalInvocations || 0;
  const secTotal = secData?.total || 0;
  const secCritHigh = (secData?.critical || 0) + (secData?.high || 0);

  return (
    <>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="p-1">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-foreground">{env.displayName || env.accountName}</h1>
              <button onClick={() => toggleFavorite(env.accountId)} className="p-1 rounded hover:bg-muted">
                <Star className={`w-5 h-5 ${isFavorite(env.accountId) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"}`} />
              </button>
              <StatusBadge status={env.status} />
            </div>
            <p className="text-sm text-muted-foreground font-mono">{env.accountId}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {isReady && isOnline && (
            <Button onClick={handleSsmConnect} variant="outline" size="sm">
              <Terminal className="w-4 h-4 mr-2" />
              Terminal
            </Button>
          )}
        </div>
      </div>

      {/* Deploying Progress — centered overlay when provisioning */}
      {isDeploying && env.pipelineSteps && env.pipelineSteps.length > 0 && (
        <div className="flex justify-center">
          <div className="w-full max-w-lg">
            <VendingStatus variant="full" pipelineSteps={env.pipelineSteps} />
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={isOnline ? Wifi : WifiOff} label="SSM Status"
          value={isOnline ? "Online" : env.ssmStatus || "Offline"}
          color={isOnline ? "text-emerald-400" : "text-red-400"} />
        <StatCard icon={Cpu} label="Tokens (7d)"
          value={totalTokens >= 1000000 ? `${(totalTokens/1000000).toFixed(1)}M` : totalTokens >= 1000 ? `${(totalTokens/1000).toFixed(0)}K` : `${totalTokens}`}
          subtext={`${totalInvocations} invocations`} />
        <StatCard icon={Shield} label="Security Findings"
          value={secTotal}
          subtext={secCritHigh > 0 ? `${secCritHigh} critical/high` : "All clear"}
          color={secCritHigh > 0 ? "text-red-400" : "text-emerald-400"} />
        <StatCard icon={Server} label="Instance"
          value={env.instanceId || "None"}
          subtext={env.publicIp || ""} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Agent Chat + Details */}
        <div className="lg:col-span-2 space-y-6">

          {/* Command Input */}
          {isReady && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <MessageSquare className="w-5 h-5 text-primary" />
                    {cmdType === "agent" ? "Agent Prompt" : "Shell Command"}
                  </CardTitle>
                  <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
                    <button
                      onClick={() => setCmdType("agent")}
                      className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${cmdType === "agent" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      Agent
                    </button>
                    <button
                      onClick={() => setCmdType("shell")}
                      className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${cmdType === "shell" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      Shell
                    </button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {cmdType === "agent" && (
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_PROMPTS.map(qp => (
                      <button key={qp.label} onClick={() => { setPrompt(qp.prompt); handleSendPrompt(qp.prompt); }}
                        disabled={sending}
                        className="px-2.5 py-1 text-xs rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors disabled:opacity-50">
                        {qp.label}
                      </button>
                    ))}
                  </div>
                )}
                {cmdType === "shell" && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Run as:</span>
                    <select
                      value={runAs}
                      onChange={e => setRunAs(e.target.value)}
                      className="bg-muted border border-border rounded-md px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                      <option value="ec2-user">ec2-user (agent context)</option>
                      <option value="ssm-user">ssm-user (default SSM)</option>
                      <option value="root">root</option>
                    </select>
                  </div>
                )}
                <div className="flex gap-2">
                  <textarea value={prompt} onChange={e => setPrompt(e.target.value)}
                    placeholder={cmdType === "agent" ? "Send a prompt to this agent..." : "Enter shell command (e.g. ls -la, systemctl status openclaw-gateway)"}
                    className={`flex-1 bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm placeholder:text-muted-foreground/50 resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 ${cmdType === "shell" ? "font-mono text-foreground" : "text-foreground"}`}
                    rows={cmdType === "shell" ? 1 : 2}
                    onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSendPrompt(prompt); }} />
                  <Button onClick={() => handleSendPrompt(prompt)} disabled={sending || !prompt.trim()} className="self-end h-9 px-4">
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </div>

                {/* Response */}
                {(sending || agentResponse) && (
                  <div className="bg-zinc-900/50 rounded-lg border border-border p-4">
                    {sending && !agentResponse ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin" /> Waiting for agent...
                      </div>
                    ) : agentResponse ? (
                      <div>
                        <div className="text-sm text-foreground prose prose-invert prose-sm max-w-none prose-p:my-1.5 prose-pre:bg-zinc-800 prose-code:text-emerald-400 prose-code:before:content-none prose-code:after:content-none">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{agentResponse.text}</ReactMarkdown>
                        </div>
                        {(agentResponse.model || agentResponse.durationMs) && (
                          <div className="flex gap-4 mt-3 pt-2 border-t border-border/50 text-xs text-muted-foreground">
                            {agentResponse.model && <span>{agentResponse.model.replace('us.anthropic.', '')}</span>}
                            {agentResponse.durationMs ? <span>{(agentResponse.durationMs / 1000).toFixed(1)}s</span> : null}
                            {agentResponse.tokens ? <span>{agentResponse.tokens.toLocaleString()} tokens</span> : null}
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Token Usage Chart */}
          {dailyTokens.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  Token Usage (7 days)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={dailyTokens}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#71717a" }} tickFormatter={v => v?.slice(5)} />
                    <YAxis tick={{ fontSize: 11, fill: "#71717a" }} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}K` : v} />
                    <Tooltip contentStyle={{ backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: "8px", fontSize: "12px" }} />
                    <Area type="monotone" dataKey="input" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} name="Input" />
                    <Area type="monotone" dataKey="output" stackId="1" stroke="#a78bfa" fill="#a78bfa" fillOpacity={0.3} name="Output" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Invocations Chart */}
          {dailyTokens.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Zap className="w-5 h-5 text-primary" />
                  Daily Invocations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={150}>
                  <BarChart data={dailyTokens}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#71717a" }} tickFormatter={v => v?.slice(5)} />
                    <YAxis tick={{ fontSize: 11, fill: "#71717a" }} />
                    <Tooltip contentStyle={{ backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: "8px", fontSize: "12px" }} />
                    <Bar dataKey="invocations" fill="#22c55e" radius={[4, 4, 0, 0]} name="Invocations" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Conversation History */}
          {messagesData && messagesData.messages.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <CardTitle className="flex items-center gap-2 text-base flex-1">
                    <Clock4 className="w-5 h-5 text-primary" />
                    Conversations
                    <span className="text-xs text-muted-foreground font-normal">{messagesData.messages.length} messages</span>
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {messagesData.fromCache && messagesData.cachedAt && (
                      <span className="text-[10px] text-muted-foreground">
                        cached {new Date(messagesData.cachedAt).toLocaleTimeString()}
                      </span>
                    )}
                    <button
                      onClick={forceRefreshMessages}
                      disabled={messagesRefreshing}
                      className="flex items-center gap-1 px-2 py-1 rounded text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
                      title="Force refresh (bypasses cache)"
                    >
                      <RefreshCw className={`w-3 h-3 ${messagesRefreshing ? "animate-spin" : ""}`} />
                      {messagesRefreshing ? "Fetching..." : "Refresh"}
                    </button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-1">
                {messagesData.messages.map((msg: ChatMessage, i: number) => {
                  const isUser = msg.role === "user";
                  const expanded = historyExpanded.has(`msg-${i}`);
                  const firstLine = msg.text.split("\n")[0].slice(0, 120);
                  const isLong = msg.text.length > 120 || msg.text.includes("\n");
                  const time = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
                  const date = msg.timestamp ? new Date(msg.timestamp).toLocaleDateString([], { month: "short", day: "numeric" }) : "";

                  return (
                    <div key={`msg-${i}`} className={`rounded-lg overflow-hidden ${isUser ? "border border-primary/20" : "border border-border"}`}>
                      <button
                        onClick={() => isLong && toggleHistory(`msg-${i}`)}
                        className={`w-full flex items-start gap-2.5 px-3 py-2 text-left transition-colors ${isLong ? "hover:bg-muted/30 cursor-pointer" : "cursor-default"}`}
                      >
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold ${isUser ? "bg-primary/10 text-primary" : "bg-emerald-500/10 text-emerald-400"}`}>
                          {isUser ? "U" : "A"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs leading-relaxed ${expanded ? "whitespace-pre-wrap" : "truncate"} ${isUser ? "text-foreground" : "text-foreground/90"}`}>
                            {expanded ? msg.text : firstLine}
                          </p>
                          {expanded && msg.model && (
                            <div className="flex gap-3 mt-1.5 pt-1.5 border-t border-border/50 text-[10px] text-muted-foreground">
                              {msg.model && <span>{msg.model.replace("us.anthropic.", "")}</span>}
                              {msg.tokens ? <span>{msg.tokens.toLocaleString()} tokens</span> : null}
                              {msg.cost ? <span>${msg.cost.toFixed(4)}</span> : null}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap">{date} {time}</span>
                          {isLong && (
                            expanded
                              ? <ChevronDown className="w-3 h-3 text-muted-foreground" />
                              : <ChevronRight className="w-3 h-3 text-muted-foreground" />
                          )}
                        </div>
                      </button>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right column: Info panels */}
        <div className="space-y-4">
          {/* Instance Info */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2"><Server className="w-4 h-4" /> Instance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Instance ID</span><span className="font-mono text-xs">{env.instanceId || "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Public IP</span><span className="font-mono text-xs">{env.publicIp || "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Stack Status</span><span className="text-xs">{env.stackStatus || "—"}</span></div>
              <StackProgressPanel accountId={accountId!} />
              <div className="flex justify-between"><span className="text-muted-foreground">SSM</span>
                <span className={`text-xs font-medium ${isOnline ? "text-emerald-400" : "text-red-400"}`}>{env.ssmStatus || "—"}</span>
              </div>
              <div className="flex justify-between"><span className="text-muted-foreground">Created</span><span className="text-xs">{env.createdDate ? new Date(env.createdDate).toLocaleDateString() : "—"}</span></div>
            </CardContent>
          </Card>

          {/* Security Summary */}
          {secData && secData.total > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><Shield className="w-4 h-4" /> Security</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex gap-2">
                  {secData.critical > 0 && <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">{secData.critical} Critical</span>}
                  {secData.high > 0 && <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20">{secData.high} High</span>}
                  {secData.medium > 0 && <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">{secData.medium} Medium</span>}
                </div>
                <div className="space-y-1">
                  {secData.findings?.slice(0, 3).map((f: any, i: number) => (
                    <div key={i} className="text-xs text-muted-foreground truncate">{f.title}</div>
                  ))}
                </div>
                <Button variant="link" size="sm" className="p-0 h-auto text-xs" onClick={() => navigate("/insights")}>
                  View all findings →
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Account Info */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2"><Globe className="w-4 h-4" /> Account</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Account ID</span><span className="font-mono text-xs">{env.accountId}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span className="text-xs truncate ml-2">{env.accountEmail || env.ownerEmail || "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Region</span><span className="text-xs">us-east-1</span></div>
            </CardContent>
          </Card>

          {/* Quick Links */}
          {isReady && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><Zap className="w-4 h-4" /> Quick Links</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5">
                <a href={`https://${env.accountId}.signin.aws.amazon.com/console`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-xs text-primary hover:underline">
                  <Globe className="w-3 h-3" /> AWS Console
                </a>
                <button onClick={() => navigate(`/connect/${env.accountId}`)}
                  className="flex items-center gap-2 text-xs text-primary hover:underline">
                  <Terminal className="w-3 h-3" /> Connection Guide
                </button>
              </CardContent>
            </Card>
          )}

          {/* Error Details */}
          {env.errorMessage && (
            <Card className="border-red-500/30 bg-red-500/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-red-400 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> Error Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-red-300/80 break-words">{env.errorMessage}</p>
              </CardContent>
            </Card>
          )}

          {/* Solo Console Access */}
          {env.consoleUrl && (
            <Card className="border-violet-500/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-violet-400">
                  <Monitor className="w-4 h-4" /> Solo Console Access
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <span className="text-xs text-muted-foreground block mb-1">Console URL</span>
                  <div className="flex items-center gap-2">
                    <a href={env.consoleUrl} target="_blank" rel="noopener noreferrer"
                      className="text-sm text-violet-400 hover:text-violet-300 font-mono truncate flex-1">
                      {env.consoleUrl}
                    </a>
                    <button onClick={() => copyConsoleField("url", env.consoleUrl!)}
                      className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground shrink-0">
                      {consoleCopied.url ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
                {env.consoleEmail && (
                  <div>
                    <span className="text-xs text-muted-foreground block mb-1">Login Email</span>
                    <div className="flex items-center gap-2">
                      <code className="text-sm text-foreground font-mono truncate flex-1">{env.consoleEmail}</code>
                      <button onClick={() => copyConsoleField("email", env.consoleEmail!)}
                        className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground shrink-0">
                        {consoleCopied.email ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                )}
                <div>
                  <span className="text-xs text-muted-foreground block mb-1">Password</span>
                  <div className="flex items-center gap-2">
                    <code className="text-sm text-foreground font-mono flex-1 truncate">
                      {consolePasswordVisible && consolePassword ? consolePassword : "••••••••••••••••"}
                    </code>
                    <button onClick={handleRevealConsolePassword}
                      disabled={consolePasswordLoading}
                      className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground shrink-0">
                      {consolePasswordLoading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : consolePasswordVisible ? (
                        <EyeOff className="w-3.5 h-3.5" />
                      ) : (
                        <Eye className="w-3.5 h-3.5" />
                      )}
                    </button>
                    {consolePassword && (
                      <button onClick={() => copyConsoleField("password", consolePassword)}
                        className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground shrink-0">
                        {consoleCopied.password ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>
                </div>
                <div className="pt-3 border-t border-violet-500/20">
                  <button
                    onClick={copyAllConsoleCredentials}
                    disabled={consolePasswordLoading}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium bg-violet-500/20 hover:bg-violet-500/30 text-violet-300 transition-colors"
                  >
                    {consolePasswordLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : consoleCopied.all ? (
                      <><Check className="w-3.5 h-3.5 text-emerald-400" /><span className="text-emerald-400">Copied!</span></>
                    ) : (
                      <><Copy className="w-3.5 h-3.5" />Copy Console Link with Credentials</>
                    )}
                  </button>
                </div>
              </CardContent>
            </Card>
          )}


          {/* Solo Mission Control */}
          <Card className="border-blue-500/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 text-blue-400">
                <Zap className="w-4 h-4" /> Solo Mission Control
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-3">
                Dashboard for this environment — instance status, pipelines, costs, and credentials.
              </p>
              <a
                href={`https://d2bb25pqbi7pou.cloudfront.net/connect?account=${accountId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full px-3 py-2 rounded-md text-sm font-medium bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Open Solo Mission Control
              </a>
            </CardContent>
          </Card>
          {/* Pipeline Progress — shown as overlay when deploying */}
        </div>
      </div>
    </div>

      {/* SSM Prompt Picker Modal */}
      {showSsmPromptPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowSsmPromptPicker(false)}>
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl w-[min(480px,90vw)] p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-base font-semibold mb-1">Connect via SSM</h2>
            <p className="text-xs text-zinc-500 mb-5">Optionally pick a system prompt to inject after connecting.</p>
            <div className="space-y-2 max-h-60 overflow-y-auto mb-5">
              <button onClick={() => setSelectedSsmPrompt("")} className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors border ${selectedSsmPrompt === "" ? "border-blue-500/40 bg-blue-500/10 text-blue-300" : "border-transparent hover:bg-zinc-800 text-zinc-300"}`}>
                <span className="font-medium">No prompt</span>
                <span className="block text-xs text-zinc-500 mt-0.5">Just open the terminal</span>
              </button>
              {ssmPrompts.map(p => (
                <button key={p.promptId} onClick={() => setSelectedSsmPrompt(p.promptId)} className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors border ${selectedSsmPrompt === p.promptId ? "border-blue-500/40 bg-blue-500/10 text-blue-300" : "border-transparent hover:bg-zinc-800 text-zinc-300"}`}>
                  <span className="font-medium">{p.icon} {p.title}</span>
                  {p.description && <span className="block text-xs text-zinc-500 mt-0.5 truncate">{p.description}</span>}
                </button>
              ))}
              {ssmPrompts.length === 0 && <p className="text-xs text-zinc-600 text-center py-4">No prompts found. Add some in the Prompts page.</p>}
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowSsmPromptPicker(false)} className="px-4 py-2 text-sm rounded-lg hover:bg-zinc-800 text-zinc-400 transition-colors">Cancel</button>
              <button onClick={handleSsmConnectConfirm} className="px-4 py-2 text-sm rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors">Connect</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
