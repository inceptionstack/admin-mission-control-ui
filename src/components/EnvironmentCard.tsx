import { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Trash2,
  Info,
  Terminal,
  Server,
  User,
  Calendar,
  Cpu,
  Loader2,
  TerminalSquare,
  Star,
  MessageSquare,
  Send,
  X,
  ExternalLink,
  Pencil,
  Check,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "./StatusBadge";
import { useSsmSessions } from "../context/SsmSessionContext";
import { useFavorites } from "../context/FavoritesContext";
import { api, agentApi } from "../api/client";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import type { Environment } from "../types";
import { VendingStatus } from "./VendingStatus";

interface EnvironmentCardProps {
  env: Environment;
  onDelete: (accountId: string, accountName: string) => void;
}

interface ChatMsg { role: "user" | "assistant"; text: string; model?: string; durationMs?: number; }

function QuickMessageDialog({ accountId, accountName, onClose }: { accountId: string; accountName: string; onClose: () => void }) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [prompt, setPrompt] = useState("");
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
        } else { return poll(attempts - 1); }
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
              <MessageSquare className="w-4 h-4 text-primary" /> Quick Message
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">{accountName} ({accountId})</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted transition-colors"><X className="w-4 h-4 text-muted-foreground" /></button>
        </div>
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-3">
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
          {sending && (
            <div className="bg-zinc-800/50 rounded-lg border border-border p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Waiting for agent...</div>
            </div>
          )}
          {!sending && (
            <textarea ref={textareaRef} value={prompt} onChange={e => setPrompt(e.target.value)}
              placeholder={messages.length > 0 ? "Follow up..." : "Send a message to this agent..."}
              className="w-full bg-muted/50 border border-border rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
              rows={messages.length > 0 ? 2 : 3}
              onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSend(); }} />
          )}
        </div>
        <div className="flex justify-between items-center px-5 py-4 border-t border-border">
          <span className="text-xs text-muted-foreground">Ctrl+Enter to send</span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} size="sm">Close</Button>
            <Button onClick={handleSend} disabled={sending || !prompt.trim()} size="sm">
              {sending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
              Send
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function EnvironmentCard({ env, onDelete }: EnvironmentCardProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [ssmLoading, setSsmLoading] = useState(false);
  const { addSession, getSession, setActiveSession } = useSsmSessions();
  const { isFavorite, toggleFavorite } = useFavorites();

  const starred = isFavorite(env.accountId);
  const [showQuickMsg, setShowQuickMsg] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renamingValue, setRenamingValue] = useState(env.displayName || env.accountName);
  const renameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isRenaming) renameInputRef.current?.focus();
  }, [isRenaming]);

  async function handleRename() {
    const newName = renamingValue.trim();
    if (!newName || newName === (env.displayName || env.accountName)) {
      setIsRenaming(false);
      return;
    }
    try {
      await api.renameEnvironment(env.accountId, newName);
      queryClient.invalidateQueries({ queryKey: ["environments"] });
      toast.success(`Renamed to "${newName}"`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to rename");
    }
    setIsRenaming(false);
  }

  async function handleSsm() {
    const existing = getSession(env.accountId);
    if (existing && existing.status !== "disconnected") {
      setActiveSession(env.accountId);
      navigate("/sessions");
      return;
    }

    setSsmLoading(true);
    try {
      const session = await api.getSsmSession(env.accountId);
      addSession({
        accountId: env.accountId,
        accountName: env.accountName,
        instanceId: session.instanceId,
        streamUrl: session.streamUrl,
        tokenValue: session.tokenValue,
        sessionId: session.sessionId,
        status: "connecting",
      });
      navigate("/sessions");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to start SSM session");
    } finally {
      setSsmLoading(false);
    }
  }

  const isActive = env.status === "READY" || env.status === "DEPLOYING" || env.status === "ERROR";
  const canSsm = !!env.instanceId && env.ssmStatus === "Online";

  const existingSession = getSession(env.accountId);
  const hasLiveSession = existingSession && existingSession.status !== "disconnected";

  return (
    <Card className="hover:border-muted-foreground/30 transition-colors group flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              {isRenaming ? (
                <div className="flex items-center gap-1.5">
                  <input
                    ref={renameInputRef}
                    value={renamingValue}
                    onChange={e => setRenamingValue(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") handleRename(); if (e.key === "Escape") setIsRenaming(false); }}
                    onBlur={handleRename}
                    className="text-lg font-semibold bg-muted/50 border border-primary/30 rounded px-2 py-0.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 w-48"
                    maxLength={64}
                  />
                  <button onClick={handleRename} className="p-0.5 rounded hover:bg-muted transition-colors" title="Save">
                    <Check className="w-4 h-4 text-emerald-400" />
                  </button>
                </div>
              ) : (
                <>
                  <CardTitle className="text-lg truncate">{env.displayName || env.accountName}</CardTitle>
                  <button
                    onClick={() => { setRenamingValue(env.displayName || env.accountName); setIsRenaming(true); }}
                    className="shrink-0 p-0.5 rounded hover:bg-muted transition-colors opacity-0 group-hover:opacity-100"
                    title="Rename"
                  >
                    <Pencil className="w-3.5 h-3.5 text-muted-foreground/50 hover:text-primary" />
                  </button>
                </>
              )}
              <button
                onClick={() => toggleFavorite(env.accountId)}
                className="shrink-0 p-0.5 rounded hover:bg-muted transition-colors"
                title={starred ? "Remove from starred" : "Add to starred"}
              >
                <Star
                  className={`w-4 h-4 transition-colors ${
                    starred
                      ? "fill-amber-400 text-amber-400"
                      : "text-muted-foreground/40 hover:text-amber-400/60"
                  }`}
                />
              </button>
            </div>
            <p className="text-xs font-mono text-muted-foreground mt-1">{env.accountId}</p>
          </div>
          <StatusBadge status={env.status} />
        </div>
      </CardHeader>

      <CardContent className="space-y-1.5 text-sm pb-4 flex-1">
        <button
          onClick={() => navigate(`/env/${env.accountId}`)}
          className="flex items-center gap-2 text-violet-400 hover:text-violet-300 transition-colors text-left"
        >
          <ExternalLink className="w-3.5 h-3.5 shrink-0" />
          <span className="text-xs font-medium">Mission Control</span>
        </button>
        {env.status === "DEPLOYING" && env.pipelineSummary && (
          <VendingStatus variant="compact" pipelineSummary={env.pipelineSummary} />
        )}
        {env.errorMessage && (
          <div className="flex items-start gap-2 text-xs text-red-400/90 bg-red-400/10 rounded px-2 py-1.5">
            <span className="shrink-0 mt-0.5">⚠️</span>
            <span className="break-words">{env.errorMessage}</span>
          </div>
        )}
        {env.instanceId && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Server className="w-3.5 h-3.5 shrink-0 text-muted-foreground/70" />
            <span className="truncate font-mono text-xs">{env.instanceId}</span>
          </div>
        )}
        {env.ssmStatus && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Terminal className="w-3.5 h-3.5 shrink-0 text-muted-foreground/70" />
            <span className="text-xs">
              SSM:{" "}
              <span className={env.ssmStatus === "Online" ? "text-emerald-400" : "text-amber-400"}>
                {env.ssmStatus}
              </span>
            </span>
          </div>
        )}
        <div className="flex items-center gap-2 text-muted-foreground">
          <User className="w-3.5 h-3.5 shrink-0 text-muted-foreground/70" />
          <span className="truncate text-xs">{env.ownerEmail}</span>
        </div>
        {env.openclawVersion && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Cpu className="w-3.5 h-3.5 shrink-0 text-muted-foreground/70" />
            <span className="text-xs">
              v{env.openclawVersion}
              {env.model && <span className="text-muted-foreground/70"> / {env.model}</span>}
            </span>
          </div>
        )}
        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar className="w-3.5 h-3.5 shrink-0 text-muted-foreground/70" />
          <span className="text-xs">{new Date(env.createdDate).toLocaleDateString()}</span>
        </div>
      </CardContent>

      {isActive && (
        <div className="border-t border-border px-3 py-2">
          <div className="flex flex-wrap gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/env/${env.accountId}`)}
              className="h-8 px-2.5 text-xs text-muted-foreground hover:text-primary"
            >
              <Info className="w-3.5 h-3.5 mr-1" />
              Details
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/connect/${env.accountId}`)}
              className="h-8 px-2.5 text-xs text-muted-foreground hover:text-primary"
            >
              <Terminal className="w-3.5 h-3.5 mr-1" />
              Connect
            </Button>
            {canSsm && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowQuickMsg(true)}
                className="h-8 px-2.5 text-xs text-muted-foreground hover:text-primary"
              >
                <MessageSquare className="w-3.5 h-3.5 mr-1" />
                Message
              </Button>
            )}
            {canSsm && (
              <Button
                variant={hasLiveSession ? "secondary" : "ghost"}
                size="sm"
                onClick={handleSsm}
                disabled={ssmLoading}
                className={`h-8 px-2.5 text-xs ${hasLiveSession ? "text-emerald-400" : "text-muted-foreground hover:text-emerald-400"}`}
              >
                {ssmLoading ? (
                  <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                ) : (
                  <TerminalSquare className="w-3.5 h-3.5 mr-1" />
                )}
                {hasLiveSession ? "Resume" : "SSM"}
              </Button>
            )}
            <div className="flex-1" />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(env.accountId, env.accountName)}
              className="h-8 px-2.5 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              Remove
            </Button>
          </div>
        </div>
      )}
      {showQuickMsg && (
        <QuickMessageDialog
          accountId={env.accountId}
          accountName={env.accountName}
          onClose={() => setShowQuickMsg(false)}
        />
      )}
    </Card>
  );
}
