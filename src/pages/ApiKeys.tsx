import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Key, Plus, Copy, CheckCircle, AlertTriangle, Trash2, Pause, Play, Clock, ChevronDown, ChevronRight, DollarSign, Activity } from "lucide-react";
import { keysApi } from "../api/client";
import type { BedrockApiKey, CreateKeyResponse, KeyUsage } from "../types";
import { toast } from "sonner";

const statusStyles: Record<string, { color: string; bg: string; border: string }> = {
  Active: { color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
  Inactive: { color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
  Revoked: { color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20" },
};

function StatusBadge({ status }: { status: string }) {
  const s = statusStyles[status] || statusStyles.Revoked;
  return (
    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${s.bg} ${s.color} ${s.border}`}>
      {status}
    </span>
  );
}

function SecretModal({ data, onClose }: { data: CreateKeyResponse; onClose: () => void }) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-zinc-900 border border-border rounded-xl shadow-2xl w-full max-w-lg mx-4 p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
            <Key className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Bedrock API Key Created</h3>
            <p className="text-xs text-muted-foreground">{data.email}</p>
          </div>
        </div>

        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-4 py-3 mb-4">
          <div className="flex items-center gap-2 text-amber-400 text-sm font-medium">
            <AlertTriangle className="w-4 h-4" />
            Copy this API key now — it won't be shown again
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Bedrock API Key</label>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-sm font-mono text-foreground bg-muted/30 px-3 py-1.5 rounded-md border border-border break-all">{data.apiKey}</code>
              <button onClick={() => copyToClipboard(data.apiKey, "apiKey")} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shrink-0">
                {copiedField === "apiKey" ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Service Username</label>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-sm font-mono text-foreground bg-muted/30 px-3 py-1.5 rounded-md border border-border">{data.serviceUserName}</code>
              <button onClick={() => copyToClipboard(data.serviceUserName, "svcUser")} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shrink-0">
                {copiedField === "svcUser" ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">IAM User</label>
            <code className="text-sm font-mono text-muted-foreground">{data.iamUsername}</code>
          </div>
          {data.expiresAt && (
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Expires</label>
              <code className="text-sm font-mono text-muted-foreground">{new Date(data.expiresAt).toLocaleDateString()}</code>
            </div>
          )}

          <div className="pt-2 border-t border-border/50">
            <label className="text-xs text-muted-foreground mb-1 block">Quick Setup</label>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs font-mono text-foreground bg-muted/30 px-3 py-2 rounded-md border border-border break-all select-all">
                {`export AWS_BEARER_TOKEN_BEDROCK=${data.apiKey}`}
              </code>
              <button onClick={() => copyToClipboard(`export AWS_BEARER_TOKEN_BEDROCK=${data.apiKey}`, "export")} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shrink-0">
                {copiedField === "export" ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        <button onClick={onClose} className="mt-6 w-full py-2.5 rounded-lg bg-primary hover:bg-primary/90 font-medium text-sm transition-colors">
          Done \u2014 I've saved the key
        </button>
      </div>
    </div>
  );
}


function UsagePanel({ keyId }: { keyId: string }) {
  const [days, setDays] = useState(30);
  const { data: usage, isLoading } = useQuery<KeyUsage>({
    queryKey: ["key-usage", keyId, days],
    queryFn: () => keysApi.usage(keyId, days),
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        Loading usage data...
      </div>
    );
  }

  if (!usage) return null;

  const models = Object.entries(usage.byModel);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Activity className="w-4 h-4 text-primary" />
          Usage &amp; Cost
        </div>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          onClick={(e) => e.stopPropagation()}
          className="text-xs px-2 py-1 rounded bg-muted/50 border border-border text-foreground"
        >
          <option value={7}>7 days</option>
          <option value={30}>30 days</option>
          <option value={90}>90 days</option>
        </select>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card border border-border rounded-lg px-3 py-2">
          <div className="text-xs text-muted-foreground">Invocations</div>
          <div className="text-lg font-semibold text-foreground">{usage.totalInvocations.toLocaleString()}</div>
        </div>
        <div className="bg-card border border-border rounded-lg px-3 py-2">
          <div className="text-xs text-muted-foreground">Tokens (in / out)</div>
          <div className="text-lg font-semibold text-foreground">
            {(usage.totalInputTokens / 1000).toFixed(1)}k / {(usage.totalOutputTokens / 1000).toFixed(1)}k
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg px-3 py-2">
          <div className="text-xs text-muted-foreground flex items-center gap-1"><DollarSign className="w-3 h-3" /> Est. Cost</div>
          <div className="text-lg font-semibold text-emerald-400">${usage.estimatedCost.toFixed(4)}</div>
        </div>
      </div>

      {models.length > 0 && (
        <div className="text-xs">
          <div className="text-muted-foreground font-medium mb-1">By Model</div>
          {models.map(([model, data]) => (
            <div key={model} className="flex items-center justify-between py-1 border-b border-border/30 last:border-0">
              <span className="font-mono text-muted-foreground">{model}</span>
              <span className="text-foreground">
                {data.invocations} calls · {(data.inputTokens/1000).toFixed(1)}k in · {(data.outputTokens/1000).toFixed(1)}k out · <span className="text-emerald-400">${data.estimatedCost.toFixed(4)}</span>
              </span>
            </div>
          ))}
        </div>
      )}

      {models.length === 0 && usage.totalInvocations === 0 && (
        <div className="text-xs text-muted-foreground/50 text-center py-2">
          No usage recorded yet. Data appears after the first API call.
        </div>
      )}
    </div>
  );
}

export function ApiKeys() {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [description, setDescription] = useState("");
  const [expirationDays, setExpirationDays] = useState(0);
  const [createdKey, setCreatedKey] = useState<CreateKeyResponse | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  const { data: keysData, isLoading } = useQuery({
    queryKey: ["bedrock-keys"],
    queryFn: () => keysApi.list(),
    staleTime: 30_000,
  });
  const keys = keysData?.keys || [];

  const createMutation = useMutation({
    mutationFn: () => keysApi.create(email, description || undefined, expirationDays),
    onSuccess: (data) => {
      setCreatedKey(data);
      setEmail("");
      setDescription("");
      queryClient.invalidateQueries({ queryKey: ["bedrock-keys"] });
      toast.success("Bedrock API key created");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to create key"),
  });

  const deactivateMutation = useMutation({
    mutationFn: (keyId: string) => keysApi.deactivate(keyId),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["bedrock-keys"] }); toast.success("Key deactivated"); },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed"),
  });

  const activateMutation = useMutation({
    mutationFn: (keyId: string) => keysApi.activate(keyId),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["bedrock-keys"] }); toast.success("Key activated"); },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed"),
  });

  const deleteMutation = useMutation({
    mutationFn: (keyId: string) => keysApi.revoke(keyId),
    onSuccess: () => { setConfirmDelete(null); queryClient.invalidateQueries({ queryKey: ["bedrock-keys"] }); toast.success("Key deleted"); },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed"),
  });

  const activeCount = keys.filter((k) => k.status === "Active").length;
  const inactiveCount = keys.filter((k) => k.status === "Inactive").length;

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
          <Key className="w-6 h-6 text-primary" />
          Bedrock API Keys
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Long-term API keys for Amazon Bedrock. Uses IAM service-specific credentials scoped to Bedrock only.
        </p>
      </div>

      {/* Stats */}
      <div className="flex gap-4">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card border border-border">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="text-sm text-muted-foreground">Active</span>
          <span className="text-sm text-foreground font-semibold">{activeCount}</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card border border-border">
          <span className="w-2 h-2 rounded-full bg-amber-400" />
          <span className="text-sm text-muted-foreground">Inactive</span>
          <span className="text-sm text-foreground font-semibold">{inactiveCount}</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card border border-border">
          <span className="w-2 h-2 rounded-full bg-zinc-400" />
          <span className="text-sm text-muted-foreground">Total</span>
          <span className="text-sm text-foreground font-semibold">{keys.length}</span>
        </div>
      </div>

      {/* Create form */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Plus className="w-4 h-4" /> Generate New Key
        </h2>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs text-muted-foreground mb-1 block">Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div className="w-48">
            <label className="text-xs text-muted-foreground mb-1 block">Description (optional)</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. demo, testing"
              className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div className="w-36">
            <label className="text-xs text-muted-foreground mb-1 block">Expires in (days)</label>
            <select
              value={expirationDays}
              onChange={(e) => setExpirationDays(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value={0}>Never expires</option>
              <option value={30}>30 days</option>
              <option value={90}>90 days</option>
              <option value={365}>365 days</option>
            </select>
          </div>
          <button
            onClick={() => createMutation.mutate()}
            disabled={!isValidEmail || createMutation.isPending}
            className="px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {createMutation.isPending ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Key className="w-4 h-4" />
            )}
            Generate
          </button>
        </div>
      </div>

      {/* Keys table */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : keys.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Key className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="text-sm">No API keys yet. Generate one above.</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Service Username</th>
                <th className="px-4 py-3 font-medium">Description</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Expires</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {keys.map((key) => (
                <React.Fragment key={key.keyId}>
                <tr className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => setExpandedKey(expandedKey === key.keyId ? null : key.keyId)}>
                  <td className="px-4 py-3 text-foreground">
                    <div className="flex items-center gap-1.5">
                      {expandedKey === key.keyId ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
                      {key.email}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <code className="text-xs font-mono text-muted-foreground bg-muted/30 px-1.5 py-0.5 rounded">{key.serviceUserName || key.iamUsername}</code>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{key.description || "—"}</td>
                  <td className="px-4 py-3"><StatusBadge status={key.status} /></td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {key.expiresAt ? (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(key.expiresAt).toLocaleDateString()}
                      </span>
                    ) : <span className="text-muted-foreground/50">Never</span>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(key.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {key.status === "Active" && (
                        <button
                          onClick={() => deactivateMutation.mutate(key.keyId)}
                          disabled={deactivateMutation.isPending}
                          className="p-1.5 rounded-md text-muted-foreground hover:text-amber-400 hover:bg-amber-400/10 transition-colors"
                          title="Deactivate"
                        >
                          <Pause className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {key.status === "Inactive" && (
                        <button
                          onClick={() => activateMutation.mutate(key.keyId)}
                          disabled={activateMutation.isPending}
                          className="p-1.5 rounded-md text-muted-foreground hover:text-emerald-400 hover:bg-emerald-400/10 transition-colors"
                          title="Activate"
                        >
                          <Play className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {key.status !== "Revoked" && (
                        <button
                          onClick={() => setConfirmDelete(key.keyId)}
                          className="p-1.5 rounded-md text-muted-foreground hover:text-red-400 hover:bg-red-400/10 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
                {expandedKey === key.keyId && key.status !== "Revoked" && (
                  <tr>
                    <td colSpan={7} className="px-4 py-3 bg-muted/20">
                      <UsagePanel keyId={key.keyId} />
                    </td>
                  </tr>
                )}
              </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Secret key modal */}
      {createdKey && <SecretModal data={createdKey} onClose={() => setCreatedKey(null)} />}

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setConfirmDelete(null)}>
          <div className="bg-zinc-900 border border-border rounded-xl shadow-2xl w-full max-w-sm mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-foreground mb-2">Delete API Key?</h3>
            <p className="text-sm text-muted-foreground mb-4">This will permanently delete the key, IAM user, and Bedrock access. This cannot be undone.</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 rounded-lg border border-border text-sm hover:bg-accent transition-colors">Cancel</button>
              <button onClick={() => deleteMutation.mutate(confirmDelete)} disabled={deleteMutation.isPending} className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-sm font-medium transition-colors disabled:opacity-50">
                {deleteMutation.isPending ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
