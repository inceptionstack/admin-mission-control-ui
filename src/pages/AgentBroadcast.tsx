import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Send,
  CheckCircle,
  Loader2,
  AlertTriangle,
  Clock,
  Radio,
  Terminal,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { api, agentApi, type AgentTarget, type AgentResult } from "../api/client";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Environment } from "../types";

interface BroadcastResult {
  accountId: string;
  accountName: string;
  commandId: string;
  instanceId: string;
  sendStatus: string;
  sendError?: string;
  result?: AgentResult;
  polling: boolean;
}

const QUICK_PROMPTS = [
  { label: "Check Status", prompt: "Run 'openclaw status' and report the output concisely." },
  { label: "Gateway Restart", prompt: "Run 'openclaw gateway restart' and confirm it restarted successfully." },
  { label: "Disk Usage", prompt: "Run 'df -h /' and report disk usage." },
  { label: "Uptime", prompt: "Run 'uptime' and report the result." },
  { label: "Update OpenClaw", prompt: "Run 'npm update -g openclaw' and report the new version." },
];

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "Success": return <CheckCircle className="w-4 h-4 text-emerald-400" />;
    case "Failed": case "TimedOut": case "Cancelled": return <AlertTriangle className="w-4 h-4 text-red-400" />;
    case "InProgress": return <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />;
    case "Pending": return <Clock className="w-4 h-4 text-amber-400 animate-pulse" />;
    default: return <Clock className="w-4 h-4 text-muted-foreground" />;
  }
}

export function AgentBroadcast() {
  const [prompt, setPrompt] = useState("");
  const [cmdType, setCmdType] = useState<"agent" | "shell">("agent");
  const [runAs, setRunAs] = useState<string>("ec2-user");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState<BroadcastResult[]>([]);
  const [expandedResults, setExpandedResults] = useState<Set<string>>(new Set());
  const pollTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const { data: environments } = useQuery<Environment[]>({
    queryKey: ["environments"],
    queryFn: () => api.listEnvironments(),
  });

  const readyEnvs = (environments || []).filter(
    (e) => e.status === "READY" && e.instanceId && e.ssmStatus === "Online"
  );

  const promptRef = useRef<HTMLTextAreaElement>(null);

  // Auto-select all ready envs on load
  useEffect(() => {
    if (readyEnvs.length > 0 && selectedIds.size === 0 && results.length === 0) {
      setSelectedIds(new Set(readyEnvs.map((e) => e.accountId)));
    }
  }, [readyEnvs.length]);

  // Auto-focus prompt
  useEffect(() => {
    promptRef.current?.focus();
  }, []);

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelectedIds(new Set(readyEnvs.map((e) => e.accountId)));
  }

  function selectNone() {
    setSelectedIds(new Set());
  }

  // Poll a single result
  const pollResult = useCallback(async (r: BroadcastResult) => {
    if (!r.commandId || r.sendStatus === "Failed") return;
    try {
      const result = await agentApi.getResult(r.accountId, r.commandId, r.instanceId);
      setResults((prev) =>
        prev.map((p) =>
          p.accountId === r.accountId
            ? { ...p, result, polling: result.status === "Pending" || result.status === "InProgress" }
            : p
        )
      );
      // Auto-expand when done
      if (result.status === "Success" || result.status === "Failed") {
        setExpandedResults((prev) => new Set([...prev, r.accountId]));
      }
      // Keep polling if still running
      if (result.status === "Pending" || result.status === "InProgress") {
        const timer = setTimeout(() => pollResult(r), 3000);
        pollTimers.current.set(r.accountId, timer);
      }
    } catch {
      setResults((prev) =>
        prev.map((p) =>
          p.accountId === r.accountId
            ? { ...p, polling: false, result: { status: "Failed", output: "", error: "Poll failed" } }
            : p
        )
      );
    }
  }, []);

  // Cleanup poll timers
  useEffect(() => {
    return () => {
      pollTimers.current.forEach((t) => clearTimeout(t));
    };
  }, []);

  async function handleSend() {
    if (!prompt.trim() || selectedIds.size === 0) return;
    setSending(true);
    setExpandedResults(new Set());

    const targets = Array.from(selectedIds);
    const nameMap = new Map(readyEnvs.map((e) => [e.accountId, e.accountName]));

    try {
      const { results: sendResults } = await agentApi.send(prompt.trim(), targets, cmdType, cmdType === 'shell' ? runAs : undefined);

      const broadcastResults: BroadcastResult[] = sendResults.map((r: AgentTarget) => ({
        accountId: r.accountId,
        accountName: nameMap.get(r.accountId) || r.accountId,
        commandId: r.commandId,
        instanceId: r.instanceId,
        sendStatus: r.status === "Failed" ? "Failed" : "Sent",
        sendError: r.error,
        polling: r.status !== "Failed",
      }));

      setResults(broadcastResults);

      // Start polling for each successful send
      broadcastResults
        .filter((r) => r.sendStatus !== "Failed")
        .forEach((r) => {
          const timer = setTimeout(() => pollResult(r), 2000);
          pollTimers.current.set(r.accountId, timer);
        });
    } catch (err) {
      setResults([{
        accountId: "error",
        accountName: "Error",
        commandId: "",
        instanceId: "",
        sendStatus: "Failed",
        sendError: err instanceof Error ? err.message : "Unknown error",
        polling: false,
      }]);
    } finally {
      setSending(false);
    }
  }

  function toggleExpand(accountId: string) {
    setExpandedResults((prev) => {
      const next = new Set(prev);
      if (next.has(accountId)) next.delete(accountId);
      else next.add(accountId);
      return next;
    });
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Radio className="w-6 h-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Agent Broadcast</h1>
          <p className="text-sm text-muted-foreground">Send prompts to OpenClaw agents across environments</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: target selection */}
        <div className="lg:col-span-1">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-foreground">Targets</h3>
                <div className="flex gap-1">
                  <button onClick={selectAll} className="px-2.5 py-1 text-xs font-medium rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors">Select All</button>
                  <button onClick={selectNone} className="px-2.5 py-1 text-xs font-medium rounded-md bg-muted text-muted-foreground hover:bg-muted/80 transition-colors">Clear</button>
                </div>
              </div>
              {readyEnvs.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No ready environments with SSM online</p>
              ) : (
                <div className="space-y-1">
                  {readyEnvs.map((env) => (
                    <label
                      key={env.accountId}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                        selectedIds.has(env.accountId)
                          ? "bg-primary/10 border border-primary/20"
                          : "hover:bg-accent"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.has(env.accountId)}
                        onChange={() => toggleSelect(env.accountId)}
                        className="rounded border-border"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">{env.accountName}</p>
                        <p className="text-xs text-muted-foreground font-mono">{env.accountId}</p>
                      </div>
                      <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                    </label>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: prompt + results */}
        <div className="lg:col-span-2 space-y-4">
          {/* Quick prompts */}
          <div className="flex flex-wrap gap-2">
            {QUICK_PROMPTS.map((qp) => (
              <button
                key={qp.label}
                onClick={() => setPrompt(qp.prompt)}
                className="px-3 py-1.5 text-xs rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
              >
                {qp.label}
              </button>
            ))}
          </div>

          {/* Prompt input */}
          <div className="flex gap-2">
            <textarea
              ref={promptRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Type a prompt to send to selected agents..."
              className="flex-1 bg-muted/50 border border-border rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
              rows={3}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSend();
              }}
            />
            <Button
              onClick={handleSend}
              disabled={sending || !prompt.trim() || selectedIds.size === 0}
              className="self-end h-10 px-6"
            >
              {sending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              <span className="ml-2">
                {sending ? "Sending..." : `Send (${selectedIds.size})`}
              </span>
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">Ctrl+Enter to send • Agents process prompts via SSM Run Command</p>

          {/* Results */}
          {results.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Terminal className="w-4 h-4" />
                Results
                {results.some((r) => r.polling) && (
                  <Loader2 className="w-3 h-3 animate-spin text-blue-400" />
                )}
              </h3>
              {results.map((r) => {
                const expanded = expandedResults.has(r.accountId);
                const currentStatus = r.result?.status || r.sendStatus;
                return (
                  <Card key={r.accountId} className="overflow-hidden">
                    <button
                      onClick={() => toggleExpand(r.accountId)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors"
                    >
                      {expanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                      <StatusIcon status={currentStatus} />
                      <span className="text-sm font-medium text-foreground">{r.accountName}</span>
                      <span className="text-xs text-muted-foreground font-mono">{r.accountId}</span>
                      <span className="ml-auto text-xs text-muted-foreground">{currentStatus}</span>
                    </button>
                    {expanded && (
                      <div className="border-t border-border px-4 py-3 bg-zinc-900/50">
                        {r.sendError && (
                          <p className="text-sm text-red-400 mb-2">{r.sendError}</p>
                        )}
                        {r.result?.output ? (
                          <div>
                            <div className="text-sm text-foreground max-h-80 overflow-y-auto leading-relaxed prose prose-invert prose-sm max-w-none prose-p:my-1.5 prose-headings:my-2 prose-ul:my-1.5 prose-ol:my-1.5 prose-pre:bg-zinc-800 prose-pre:text-zinc-200 prose-code:text-emerald-400 prose-code:before:content-none prose-code:after:content-none">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>{r.result.output}</ReactMarkdown>
                            </div>
                            {(r.result.model || r.result.durationMs || r.result.tokens) ? (
                              <div className="flex gap-4 mt-3 pt-2 border-t border-border/50 text-xs text-muted-foreground">
                                {r.result.model && <span>{r.result.model.replace('us.anthropic.', '')}</span>}
                                {r.result.durationMs ? <span>{(r.result.durationMs / 1000).toFixed(1)}s</span> : null}
                                {r.result.tokens ? <span>{r.result.tokens.toLocaleString()} tokens</span> : null}
                              </div>
                            ) : null}
                          </div>
                        ) : r.result?.error ? (
                          <pre className="text-xs text-red-400 font-mono whitespace-pre-wrap">{r.result.error}</pre>
                        ) : r.polling ? (
                          <p className="text-sm text-muted-foreground flex items-center gap-2">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Waiting for agent response...
                          </p>
                        ) : null}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
