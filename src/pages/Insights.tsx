import { useState, useCallback, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { insightsApi, agentApi, api } from "../api/client";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Shield, DollarSign, Cpu, Gauge, Loader2, AlertTriangle, ChevronDown, ChevronRight, Wrench, Send, X, Zap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, Legend, PieChart, Pie, Cell,
} from "recharts";

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: "#ef4444", HIGH: "#f97316", MEDIUM: "#eab308", LOW: "#3b82f6", INFORMATIONAL: "#6b7280", INFO: "#6b7280",
};

const CHART_COLORS = ["#a78bfa", "#3b82f6", "#22c55e", "#eab308", "#f97316", "#ef4444", "#06b6d4", "#ec4899"];

function SeverityBadge({ severity }: { severity: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full" style={{
      backgroundColor: `${SEVERITY_COLORS[severity] || "#6b7280"}20`,
      color: SEVERITY_COLORS[severity] || "#6b7280",
      border: `1px solid ${SEVERITY_COLORS[severity] || "#6b7280"}30`,
    }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: SEVERITY_COLORS[severity] || "#6b7280" }} />
      {severity}
    </span>
  );
}


interface ChatMessage {
  role: "user" | "assistant";
  text: string;
  model?: string;
  durationMs?: number;
}

function FixPromptDialog({ finding, findings, onClose }: { finding?: any; findings?: any[]; onClose: () => void }) {
  const isBulk = !finding && findings && findings.length > 0;
  const targetFinding = finding || (findings && findings[0]);
  const accountId = targetFinding?.accountId;
  const accountName = targetFinding?.accountName || accountId;

  if (!targetFinding) return null;

  const issueText = isBulk
    ? findings!.map((f: any, i: number) => [
        `${i + 1}. [${f.severity}] ${f.title}`,
        f.resource && `   Resource: ${f.resource}`,
        f.remediation && `   Remediation: ${f.remediation}`,
      ].filter(Boolean).join("\n")).join("\n\n")
    : [
        targetFinding.title,
        targetFinding.description && `Description: ${targetFinding.description}`,
        targetFinding.resource && `Resource: ${targetFinding.resource}`,
        targetFinding.remediation && `Suggested remediation: ${targetFinding.remediation}`,
      ].filter(Boolean).join("\n");

  const initialPrompt = isBulk
    ? `Can you please fix all of these security issues?\n\n${issueText}`
    : `Can you please fix this issue?\n\n${issueText}`;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [prompt, setPrompt] = useState(initialPrompt);
  const [sending, setSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { textareaRef.current?.focus(); }, []);
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [messages, sending]);

  const handleSend = useCallback(async () => {
    if (!prompt.trim() || sending) return;
    const sentPrompt = prompt.trim();
    setMessages(prev => [...prev, { role: "user", text: sentPrompt }]);
    setPrompt("");
    setSending(true);
    try {
      const { results } = await agentApi.send(sentPrompt, [accountId]);
      const r = results[0];
      if (!r || r.status === "Failed") {
        setMessages(prev => [...prev, { role: "assistant", text: `❌ ${r?.error || "Failed to send"}` }]);
        return;
      }
      const poll = async (attempts: number): Promise<void> => {
        if (attempts <= 0) { setMessages(prev => [...prev, { role: "assistant", text: "⏱ Timed out waiting" }]); return; }
        await new Promise(res => setTimeout(res, 3000));
        const result = await agentApi.getResult(r.accountId, r.commandId, r.instanceId);
        if (result.status === "Success" || result.status === "Failed") {
          setMessages(prev => [...prev, { role: "assistant", text: result.output || result.error || "No output", model: result.model, durationMs: result.durationMs }]);
        } else {
          return poll(attempts - 1);
        }
      };
      await poll(60);
    } catch (err) {
      setMessages(prev => [...prev, { role: "assistant", text: `❌ ${err instanceof Error ? err.message : "Error"}` }]);
    } finally {
      setSending(false);
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [prompt, accountId, sending]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-zinc-900 border border-border rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Wrench className="w-4 h-4 text-primary" /> {isBulk ? `Fix All (${findings!.length} issues)` : "Ask Agent to Fix"}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">{accountName} ({accountId})</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted transition-colors"><X className="w-4 h-4 text-muted-foreground" /></button>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-3">
          {/* Chat history */}
          {messages.map((msg, i) => (
            <div key={i} className={msg.role === "user" ? "flex justify-end" : ""}>
              {msg.role === "user" ? (
                <div className="bg-primary/10 border border-primary/20 rounded-lg px-4 py-2.5 max-w-[85%]">
                  <pre className="text-sm text-muted-foreground whitespace-pre-wrap font-sans">{msg.text}</pre>
                </div>
              ) : (
                <div className="bg-zinc-800/50 rounded-lg border border-border p-4">
                  <div className="text-sm text-foreground prose prose-invert prose-sm max-w-none prose-pre:bg-zinc-800 prose-code:text-emerald-400 prose-code:before:content-none prose-code:after:content-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>
                  </div>
                  {(msg.model || msg.durationMs) && (
                    <div className="flex gap-4 mt-3 pt-2 border-t border-border/50 text-xs text-muted-foreground">
                      {msg.model && <span>{msg.model.replace("us.anthropic.", "")}</span>}
                      {msg.durationMs ? <span>{(msg.durationMs / 1000).toFixed(1)}s</span> : null}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {/* Sending indicator */}
          {sending && (
            <div className="bg-zinc-800/50 rounded-lg border border-border p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Waiting for agent...</div>
            </div>
          )}

          {/* Prompt input (shown when not sending, or when messages is empty) */}
          {!sending && (
            <textarea ref={textareaRef} value={prompt} onChange={e => setPrompt(e.target.value)}
              placeholder={messages.length > 0 ? "Follow up..." : "Edit prompt before sending..."}
              className="w-full bg-muted/50 border border-border rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
              rows={messages.length > 0 ? 2 : 6}
              onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSend(); }} />
          )}
        </div>

        <div className="flex justify-between items-center px-5 py-4 border-t border-border">
          <span className="text-xs text-muted-foreground">Ctrl+Enter to send</span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} size="sm">Close</Button>
            <Button onClick={handleSend} disabled={sending || !prompt.trim()} size="sm">
              {sending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
              {sending ? "Sending..." : "Send"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}


function SecurityTab() {
  const { data, isLoading } = useQuery({ queryKey: ["security"], queryFn: insightsApi.getSecurityFindings, staleTime: 60000 });
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const [fixFinding, setFixFinding] = useState<any>(null);
  const [groupBy, setGroupBy] = useState<"severity" | "environment" | "resource" | "service">("severity");

  if (isLoading) return <div className="flex items-center gap-2 py-12 justify-center text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin" />Loading security findings...</div>;

  const { summary, findings } = data || { summary: {}, findings: [] };
  const toggle = (id: string) => setCollapsedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  // Group findings
  const grouped = new Map<string, any[]>();
  for (const f of findings) {
    let key: string;
    switch (groupBy) {
      case "environment": key = f.accountName || f.accountId; break;
      case "resource": key = f.resourceType || "Unknown"; break;
      case "service": key = (f.type?.split("/")[0] || "Unknown").replace("Software and Configuration Checks", "Config Checks"); break;
      default: key = f.severity || "UNKNOWN";
    }
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(f);
  }

  // Sort groups
  const severityOrder = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFORMATIONAL", "INFO", "UNKNOWN"];
  const sortedGroups = Array.from(grouped.entries()).sort((a, b) => {
    if (groupBy === "severity") return severityOrder.indexOf(a[0]) - severityOrder.indexOf(b[0]);
    return b[1].length - a[1].length; // by count for other groups
  });

  const GROUP_BUTTONS = [
    { id: "severity", label: "Severity" },
    { id: "environment", label: "Environment" },
    { id: "resource", label: "Resource Type" },
    { id: "service", label: "Service" },
  ] as const;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: "Critical", count: summary.critical, color: "#ef4444" },
          { label: "High", count: summary.high, color: "#f97316" },
          { label: "Medium", count: summary.medium, color: "#eab308" },
          { label: "Low", count: summary.low, color: "#3b82f6" },
          { label: "Info", count: summary.informational, color: "#6b7280" },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold" style={{ color: s.color }}>{s.count || 0}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Group by selector */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Group by:</span>
        <div className="flex gap-1 bg-muted/30 rounded-lg p-0.5">
          {GROUP_BUTTONS.map(btn => (
            <button key={btn.id} onClick={() => setGroupBy(btn.id)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${groupBy === btn.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
              {btn.label}
            </button>
          ))}
        </div>
        <span className="text-xs text-muted-foreground ml-auto">{findings.length} findings</span>
      </div>

      {/* Grouped findings */}
      <div className="space-y-4">
        {sortedGroups.map(([groupName, items]) => {
          const groupKey = `group-${groupName}`;
          const groupExpanded = !collapsedIds.has(groupKey);
          return (
            <div key={groupName}>
              <div className="flex items-center gap-2 mb-1">
                <button onClick={() => toggle(groupKey)}
                  className="flex items-center gap-2 text-left hover:opacity-80 transition-opacity flex-1">
                  {groupExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                  {groupBy === "severity" && <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: SEVERITY_COLORS[groupName] || "#6b7280" }} />}
                  <span className="text-sm font-semibold text-foreground">{groupName}</span>
                  <span className="text-xs text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded-full">{items.length}</span>
                </button>
                {groupBy === "environment" && (
                  <button onClick={(e) => { e.stopPropagation(); setFixFinding({ _bulk: true, findings: items.map((f: any) => ({ title: f.title, severity: f.severity, description: f.description, resource: f.resource, remediation: f.remediation, accountId: f.accountId, accountName: f.accountName })) }); }}
                    className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 transition-colors shrink-0">
                    <Wrench className="w-3 h-3" /> Fix All
                  </button>
                )}
              </div>

              {groupExpanded && (
                <div className="space-y-1 ml-4">
                  {items.map((f: any, i: number) => {
                    const fKey = f.id || `${groupName}-${i}`;
                    const fExpanded = !collapsedIds.has(fKey);
                    return (
                      <Card key={fKey} className="overflow-hidden">
                        <button onClick={() => toggle(fKey)} className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-muted/30 transition-colors">
                          {fExpanded ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
                          {groupBy !== "severity" && <SeverityBadge severity={f.severity} />}
                          <span className="text-sm text-foreground truncate flex-1">{f.title}</span>
                          {groupBy !== "environment" && <span className="text-xs text-muted-foreground shrink-0">{f.accountName}</span>}
                        </button>
                        {fExpanded && (
                          <div className="border-t border-border px-4 py-3 bg-zinc-900/50 space-y-2">
                            <div className="grid grid-cols-2 gap-4 text-xs">
                              <div><span className="text-muted-foreground">Account:</span> <span className="text-foreground">{f.accountName} ({f.accountId})</span></div>
                              <div><span className="text-muted-foreground">Resource:</span> <span className="text-foreground font-mono text-[11px]">{f.resource}</span></div>
                              <div><span className="text-muted-foreground">Type:</span> <span className="text-foreground">{f.type}</span></div>
                              <div><span className="text-muted-foreground">Updated:</span> <span className="text-foreground">{f.updatedAt ? new Date(f.updatedAt).toLocaleString() : "N/A"}</span></div>
                            </div>
                            {f.description && <p className="text-xs text-muted-foreground">{f.description}</p>}
                            {f.remediation && <p className="text-xs text-emerald-400">💡 {f.remediation}</p>}
                            <div className="pt-1">
                              <button onClick={(e) => { e.stopPropagation(); setFixFinding(f); }}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 transition-colors">
                                <Wrench className="w-3 h-3" /> Ask to Fix
                              </button>
                            </div>
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
        {findings.length === 0 && <p className="text-center text-muted-foreground py-8">No security findings 🎉</p>}
      </div>

      {fixFinding && (fixFinding._bulk ? <FixPromptDialog findings={fixFinding.findings} onClose={() => setFixFinding(null)} /> : <FixPromptDialog finding={fixFinding} onClose={() => setFixFinding(null)} />)}
    </div>
  );
}

function CostsTab() {
  const { data, isLoading } = useQuery({ queryKey: ["costs"], queryFn: insightsApi.getCosts, staleTime: 60000 });

  if (isLoading) return <div className="flex items-center gap-2 py-12 justify-center text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin" />Loading cost data...</div>;

  const { totalCost, accountCosts, dailyData, serviceCosts } = data || { totalCost: 0, accountCosts: [], dailyData: [], serviceCosts: [] };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground">Total (30 days)</p>
          <p className="text-4xl font-bold text-foreground">${totalCost.toFixed(2)}</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily chart */}
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold text-foreground mb-4">Daily Spend (7 days)</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#71717a" }} tickFormatter={(v) => v?.slice(5)} />
                <YAxis tick={{ fontSize: 11, fill: "#71717a" }} tickFormatter={(v) => `$${v}`} />
                <Tooltip contentStyle={{ backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: "8px", fontSize: "12px" }} />
                <Bar dataKey="total" fill="#a78bfa" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Service breakdown */}
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold text-foreground mb-4">By Service</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={serviceCosts.slice(0, 8)} dataKey="cost" nameKey="service" cx="50%" cy="50%" outerRadius={90} label={({ name, value }: any) => `${name?.split(" ").pop()} $${value}`} labelLine={false}>
                  {serviceCosts.slice(0, 8).map((_: any, i: number) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: "8px", fontSize: "12px" }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Per-account table */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">By Account</h3>
          <div className="space-y-1">
            {accountCosts.map((a: any) => (
              <div key={a.accountId} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-muted/30">
                <div>
                  <span className="text-sm font-medium text-foreground">{a.accountName}</span>
                  <span className="text-xs text-muted-foreground ml-2 font-mono">{a.accountId}</span>
                </div>
                <span className="text-sm font-bold text-foreground">${a.cost.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function TokensTab() {
  const { data, isLoading } = useQuery({ queryKey: ["tokens"], queryFn: insightsApi.getTokenUsage, staleTime: 60000 });

  if (isLoading) return <div className="flex items-center gap-2 py-12 justify-center text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin" />Loading token usage...</div>;

  const accounts = data?.accounts || [];
  const totalTokens = accounts.reduce((s: number, a: any) => s + a.totalTokens, 0);
  const totalInvocations = accounts.reduce((s: number, a: any) => s + a.totalInvocations, 0);

  // Aggregate daily data across all accounts
  const dailyMap = new Map<string, any>();
  for (const acct of accounts) {
    for (const d of acct.daily || []) {
      if (!dailyMap.has(d.date)) dailyMap.set(d.date, { date: d.date, input: 0, output: 0, invocations: 0 });
      const entry = dailyMap.get(d.date)!;
      entry.input += d.input; entry.output += d.output; entry.invocations += d.invocations;
    }
  }
  const dailyData = Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{(totalTokens / 1000000).toFixed(1)}M</p>
          <p className="text-xs text-muted-foreground">Total Tokens (7d)</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{totalInvocations.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Invocations (7d)</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{accounts.length}</p>
          <p className="text-xs text-muted-foreground">Active Accounts</p>
        </CardContent></Card>
      </div>

      {/* Token usage chart */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold text-foreground mb-4">Daily Token Usage (All Accounts)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#71717a" }} tickFormatter={(v) => v?.slice(5)} />
              <YAxis tick={{ fontSize: 11, fill: "#71717a" }} tickFormatter={(v) => v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}K` : v} />
              <Tooltip contentStyle={{ backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: "8px", fontSize: "12px" }} formatter={(v: any) => Number(v).toLocaleString()} />
              <Legend />
              <Area type="monotone" dataKey="input" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} name="Input Tokens" />
              <Area type="monotone" dataKey="output" stackId="1" stroke="#a78bfa" fill="#a78bfa" fillOpacity={0.3} name="Output Tokens" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Per-account breakdown */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">By Account</h3>
          <div className="space-y-1">
            {accounts.map((a: any) => (
              <div key={a.accountId} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-muted/30">
                <div>
                  <span className="text-sm font-medium text-foreground">{a.accountName}</span>
                  <span className="text-xs text-muted-foreground ml-2 font-mono">{a.accountId}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-foreground">{(a.totalTokens / 1000).toFixed(0)}K tokens</span>
                  <span className="text-xs text-muted-foreground ml-2">{a.totalInvocations} calls</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function QuotasTab() {
  const { data, isLoading } = useQuery({ queryKey: ["quotas"], queryFn: insightsApi.getQuotaStatus, staleTime: 60000 });

  if (isLoading) return <div className="flex items-center gap-2 py-12 justify-center text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin" />Loading quota status...</div>;

  const accounts = data?.accounts || [];
  const statusColors: Record<string, string> = {
    PENDING: "text-amber-400", CASE_OPENED: "text-amber-400", APPROVED: "text-emerald-400",
    DENIED: "text-red-400", CASE_CLOSED: "text-zinc-400", NOT_APPROVED: "text-red-400",
  };

  return (
    <div className="space-y-4">
      {accounts.map((a: any) => (
        <Card key={a.accountId}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-sm font-semibold text-foreground">{a.accountName}</h3>
              <span className="text-xs text-muted-foreground font-mono">{a.accountId}</span>
              {a.error && <span className="text-xs text-red-400">⚠ {a.error}</span>}
            </div>

            {/* Current quotas */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              {a.quotas.map((q: any) => (
                <div key={q.code} className="bg-muted/30 rounded-lg px-3 py-2">
                  <p className="text-xs text-muted-foreground">{q.name}</p>
                  <p className="text-lg font-bold text-foreground">{typeof q.currentValue === "number" ? q.currentValue.toLocaleString() : q.currentValue}</p>
                </div>
              ))}
            </div>

            {/* Pending increases */}
            {a.pendingIncreases.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground">Quota Requests</p>
                {a.pendingIncreases.map((p: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-xs px-2 py-1.5 rounded bg-muted/20">
                    <span className="text-foreground truncate flex-1">{p.quotaName?.replace("Cross-region model inference ", "")}</span>
                    <span className="text-foreground font-mono mx-2">→ {p.desiredValue?.toLocaleString()}</span>
                    <span className={statusColors[p.status] || "text-zinc-400"}>{p.status}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
      {accounts.length === 0 && <p className="text-center text-muted-foreground py-8">No active accounts</p>}
    </div>
  );
}

const TIME_RANGES = [
  { id: 1, label: "Today" },
  { id: 7, label: "7 days" },
  { id: 30, label: "30 days" },
] as const;

function LitellmTab() {
  const [days, setDays] = useState(1);
  const { data: overview, isLoading: overviewLoading } = useQuery({ queryKey: ["litellm-overview"], queryFn: insightsApi.getLitellmOverview, staleTime: 60000 });
  const { data: keys, isLoading: keysLoading } = useQuery({ queryKey: ["litellm-keys", days], queryFn: () => insightsApi.getLitellmKeys(days), staleTime: 60000 });
  const { data: models, isLoading: modelsLoading } = useQuery({ queryKey: ["litellm-models", days], queryFn: () => insightsApi.getLitellmModels(days), staleTime: 60000 });
  const { data: timeline, isLoading: timelineLoading } = useQuery({ queryKey: ["litellm-timeline", days], queryFn: () => insightsApi.getLitellmTimeline(days), staleTime: 60000 });

  if (overviewLoading) return <div className="flex items-center gap-2 py-12 justify-center text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin" />Loading LiteLLM data...</div>;

  const spendValue = days === 1 ? overview?.spendToday : days === 7 ? overview?.spend7d : overview?.spend30d;
  const requestsValue = days === 1 ? overview?.requestsToday : days === 7 ? overview?.requests7d : overview?.requests30d;

  return (
    <div className="space-y-6">
      {/* Time range selector */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Time range:</span>
        <div className="flex gap-1 bg-muted/30 rounded-lg p-0.5">
          {TIME_RANGES.map(btn => (
            <button key={btn.id} onClick={() => setDays(btn.id)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${days === btn.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-foreground">${(spendValue || 0).toFixed(2)}</p>
          <p className="text-xs text-muted-foreground">Total Spend</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{(requestsValue || 0).toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Total Requests</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{((overview?.inputTokensToday || 0) / 1000000).toFixed(2)}M</p>
          <p className="text-xs text-muted-foreground">Input Tokens (today)</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{((overview?.outputTokensToday || 0) / 1000000).toFixed(2)}M</p>
          <p className="text-xs text-muted-foreground">Output Tokens (today)</p>
        </CardContent></Card>
      </div>

      {/* Spend Timeline */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold text-foreground mb-4">Spend Timeline</h3>
          {timelineLoading ? (
            <div className="flex items-center gap-2 py-8 justify-center text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" />Loading...</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={timeline || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="time" tick={{ fontSize: 11, fill: "#71717a" }} tickFormatter={(v) => {
                  if (!v) return "";
                  const d = new Date(v);
                  return days <= 1 ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : `${d.getMonth()+1}/${d.getDate()}`;
                }} />
                <YAxis yAxisId="spend" tick={{ fontSize: 11, fill: "#71717a" }} tickFormatter={(v) => `$${v}`} />
                <YAxis yAxisId="requests" orientation="right" tick={{ fontSize: 11, fill: "#71717a" }} />
                <Tooltip contentStyle={{ backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: "8px", fontSize: "12px" }}
                  labelFormatter={(v) => { if (!v) return ""; const d = new Date(v); return days <= 1 ? d.toLocaleTimeString() : d.toLocaleDateString(); }}
                  formatter={(v: any, name: any) => [name === "spend" ? `$${Number(v).toFixed(4)}` : Number(v).toLocaleString(), name === "spend" ? "Spend" : "Requests"]} />
                <Legend />
                <Area yAxisId="spend" type="monotone" dataKey="spend" stroke="#a78bfa" fill="#a78bfa" fillOpacity={0.3} name="Spend" />
                <Area yAxisId="requests" type="monotone" dataKey="requests" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.15} name="Requests" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* By Model */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold text-foreground mb-4">By Model</h3>
          {modelsLoading ? (
            <div className="flex items-center gap-2 py-8 justify-center text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" />Loading...</div>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(200, (models || []).length * 40)}>
              <BarChart data={models || []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#71717a" }} tickFormatter={(v) => `$${v}`} />
                <YAxis type="category" dataKey="modelName" tick={{ fontSize: 11, fill: "#71717a" }} width={200} />
                <Tooltip contentStyle={{ backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: "8px", fontSize: "12px" }}
                  formatter={(v: any) => [`$${Number(v).toFixed(4)}`, "Spend"]} />
                <Bar dataKey="totalSpend" fill="#a78bfa" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* By API Key / Instance */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">By API Key / Instance</h3>
          {keysLoading ? (
            <div className="flex items-center gap-2 py-8 justify-center text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" />Loading...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="pb-2 text-xs font-medium text-muted-foreground">Key Alias</th>
                    <th className="pb-2 text-xs font-medium text-muted-foreground">Account Name</th>
                    <th className="pb-2 text-xs font-medium text-muted-foreground">Account ID</th>
                    <th className="pb-2 text-xs font-medium text-muted-foreground text-right">Spend</th>
                    <th className="pb-2 text-xs font-medium text-muted-foreground text-right">Requests</th>
                    <th className="pb-2 text-xs font-medium text-muted-foreground text-right">Last Active</th>
                  </tr>
                </thead>
                <tbody>
                  {(keys || []).map((k: any, i: number) => (
                    <tr key={i} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="py-2 text-foreground font-medium">{k.keyAlias}</td>
                      <td className="py-2 text-foreground">{k.accountName || "—"}</td>
                      <td className="py-2 text-muted-foreground font-mono text-xs">{k.accountId || "—"}</td>
                      <td className="py-2 text-foreground font-bold text-right">${k.totalSpend.toFixed(4)}</td>
                      <td className="py-2 text-foreground text-right">{k.totalRequests.toLocaleString()}</td>
                      <td className="py-2 text-muted-foreground text-right text-xs">{k.lastActive ? new Date(k.lastActive).toLocaleString() : "—"}</td>
                    </tr>
                  ))}
                  {(!keys || keys.length === 0) && (
                    <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">No data for selected time range</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

const TABS = [
  { id: "security", label: "Security", icon: Shield },
  { id: "costs", label: "Costs", icon: DollarSign },
  { id: "tokens", label: "Tokens", icon: Cpu },
  { id: "quotas", label: "Quotas", icon: Gauge },
  { id: "litellm", label: "LiteLLM", icon: Zap },
];

export function Insights() {
  const [activeTab, setActiveTab] = useState("security");

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Shield className="w-6 h-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Insights</h1>
          <p className="text-sm text-muted-foreground">Security findings, costs, token usage & quotas across all environments</p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 mb-6 bg-muted/30 rounded-lg p-1 w-fit">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === "security" && <SecurityTab />}
      {activeTab === "costs" && <CostsTab />}
      {activeTab === "tokens" && <TokensTab />}
      {activeTab === "quotas" && <QuotasTab />}
      {activeTab === "litellm" && <LitellmTab />}
    </div>
  );
}
