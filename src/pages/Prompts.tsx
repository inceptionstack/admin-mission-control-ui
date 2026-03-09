import { useState, useEffect, useCallback } from "react";
import { prompts as promptsApi, promptSettings, type Prompt } from "../api/client";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import {
  Plus, Pencil, Trash2, ChevronDown, ChevronUp, Save, X,
  BookOpen, Loader2, AlertTriangle, Copy, Check,
} from "lucide-react";

const SCOPE_COLORS: Record<string, string> = {
  base: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  account: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  shared: "bg-green-500/20 text-green-300 border-green-500/30",
};

const CATEGORY_OPTIONS = ["three-tier", "serverless", "containers", "kubernetes", "data", "ml", "devops", "security"];

export function Prompts() {
  const [items, setItems] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Partial<Prompt> | null>(null);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<"all" | "base" | "account" | "shared">("all");

  // Postfix settings
  const [postfixText, setPostfixText] = useState("");
  const [postfixEnabled, setPostfixEnabled] = useState(true);
  const [postfixLoading, setPostfixLoading] = useState(true);
  const [postfixSaving, setPostfixSaving] = useState(false);
  const [showPostfix, setShowPostfix] = useState(false);
  const [postfixDirty, setPostfixDirty] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await promptsApi.list(filter === "all" ? undefined : filter);
      setItems(data.filter((p: any) => p.category !== "__settings__").sort((a, b) => a.title.localeCompare(b.title)));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  // Load postfix settings
  useEffect(() => {
    promptSettings.getPostfix()
      .then((p) => {
        setPostfixText(p.template || "");
        setPostfixEnabled((p as any).enabled !== false);
      })
      .catch(() => {})
      .finally(() => setPostfixLoading(false));
  }, []);

  const handleSavePostfix = async () => {
    setPostfixSaving(true);
    try {
      await promptSettings.savePostfix(postfixText, postfixEnabled);
      setPostfixDirty(false);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setPostfixSaving(false);
    }
  };

  const handleSave = async () => {
    if (!editing?.title || !editing?.template) return;
    setSaving(true);
    try {
      await promptsApi.save(editing as Prompt);
      setEditing(null);
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this prompt?")) return;
    try {
      await promptsApi.delete(id);
      await load();
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BookOpen className="w-6 h-6" /> Starter Prompts
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage base prompts available to all sandbox environments
          </p>
        </div>
        <Button
          onClick={() => setEditing({ title: "", template: "", scope: "base", category: "three-tier", tags: [], icon: "📋" })}
          className="gap-2"
        >
          <Plus className="w-4 h-4" /> New Prompt
        </Button>
      </div>

      {/* Postfix Settings */}
      <Card className="border-amber-500/20 bg-amber-500/5">
        <div
          className="flex items-center justify-between px-4 py-3 cursor-pointer"
          onClick={() => setShowPostfix(!showPostfix)}
        >
          <div className="flex items-center gap-3">
            <span className="text-lg">⚙️</span>
            <div>
              <p className="text-sm font-semibold text-amber-300">Prompt Postfix (Auto-Appended Guidelines)</p>
              <p className="text-xs text-muted-foreground">
                Text appended to every prompt when users apply it from the SSM terminal
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className={postfixEnabled ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" : "bg-zinc-500/20 text-zinc-400"}>
              {postfixEnabled ? "Active" : "Disabled"}
            </Badge>
            {showPostfix ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>
        {showPostfix && (
          <CardContent className="pt-0 space-y-3">
            <div className="flex items-center gap-3 pb-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={postfixEnabled}
                  onChange={(e) => { setPostfixEnabled(e.target.checked); setPostfixDirty(true); }}
                  className="rounded"
                />
                <span className="text-zinc-300">Enable postfix for all users</span>
              </label>
            </div>
            <textarea
              className="w-full px-3 py-2 rounded-md bg-muted border border-border text-sm font-mono min-h-[200px]"
              value={postfixText}
              onChange={(e) => { setPostfixText(e.target.value); setPostfixDirty(true); }}
              placeholder="Guidelines text that will be appended to prompts..."
            />
            <div className="flex items-center gap-2">
              <Button
                onClick={handleSavePostfix}
                disabled={postfixSaving || !postfixDirty}
                size="sm"
                className="gap-1.5"
              >
                {postfixSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Save Postfix
              </Button>
              {postfixDirty && <span className="text-xs text-amber-400">Unsaved changes</span>}
              <span className="text-xs text-muted-foreground ml-auto">{postfixText.length} chars</span>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Scope filter */}
      <div className="flex gap-2">
        {(["all", "base", "account", "shared"] as const).map((s) => (
          <Button
            key={s}
            variant={filter === s ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(s)}
            className="capitalize"
          >
            {s} {s !== "all" && `(${items.filter((p) => p.scope === s).length})`}
          </Button>
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          <AlertTriangle className="w-4 h-4" /> {error}
          <Button variant="ghost" size="sm" onClick={() => setError(null)} className="ml-auto h-6 px-2">
            <X className="w-3 h-3" />
          </Button>
        </div>
      )}

      {/* Edit / Create form */}
      {editing && (
        <Card className="border-primary/50">
          <CardHeader>
            <CardTitle className="text-base">
              {editing.promptId ? "Edit Prompt" : "New Prompt"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Title</label>
                <input
                  className="w-full px-3 py-2 rounded-md bg-muted border border-border text-sm"
                  value={editing.title || ""}
                  onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                  placeholder="TaskFlow — Serverless Kanban Board"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Icon</label>
                <input
                  className="w-full px-3 py-2 rounded-md bg-muted border border-border text-sm"
                  value={editing.icon || ""}
                  onChange={(e) => setEditing({ ...editing, icon: e.target.value })}
                  placeholder="📋"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Description</label>
              <input
                className="w-full px-3 py-2 rounded-md bg-muted border border-border text-sm"
                value={editing.description || ""}
                onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                placeholder="Short description of what this prompt builds"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Category</label>
                <select
                  className="w-full px-3 py-2 rounded-md bg-muted border border-border text-sm"
                  value={editing.category || "three-tier"}
                  onChange={(e) => setEditing({ ...editing, category: e.target.value })}
                >
                  {CATEGORY_OPTIONS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Scope</label>
                <select
                  className="w-full px-3 py-2 rounded-md bg-muted border border-border text-sm"
                  value={editing.scope || "base"}
                  onChange={(e) => setEditing({ ...editing, scope: e.target.value as Prompt["scope"] })}
                >
                  <option value="base">Base (all accounts)</option>
                  <option value="shared">Shared</option>
                  <option value="account">Account-specific</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Tags (comma-separated)</label>
                <input
                  className="w-full px-3 py-2 rounded-md bg-muted border border-border text-sm"
                  value={(editing.tags || []).join(", ")}
                  onChange={(e) => setEditing({ ...editing, tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) })}
                  placeholder="typescript, nextjs, lambda"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">
                Prompt Template <span className="text-muted-foreground/60">({(editing.template || "").length} chars)</span>
              </label>
              <textarea
                className="w-full px-3 py-2 rounded-md bg-muted border border-border text-sm font-mono min-h-[300px]"
                value={editing.template || ""}
                onChange={(e) => setEditing({ ...editing, template: e.target.value })}
                placeholder="Build a production-ready..."
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saving || !editing.title || !editing.template} className="gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {editing.promptId ? "Update" : "Create"}
              </Button>
              <Button variant="outline" onClick={() => setEditing(null)} className="gap-2">
                <X className="w-4 h-4" /> Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Prompts list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((p) => (
            <Card key={p.promptId} className="overflow-hidden">
              <div
                className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => setExpandedId(expandedId === p.promptId ? null : p.promptId)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xl shrink-0">{p.icon || "📄"}</span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">{p.title}</span>
                      <Badge variant="outline" className={`text-[10px] px-1.5 ${SCOPE_COLORS[p.scope] || ""}`}>
                        {p.scope}
                      </Badge>
                      {p.accountId && (
                        <Badge variant="outline" className="text-[10px] px-1.5">{p.accountId}</Badge>
                      )}
                    </div>
                    {p.description && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{p.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-4">
                  <div className="flex gap-1 mr-2">
                    {p.tags.slice(0, 3).map((t) => (
                      <Badge key={t} variant="secondary" className="text-[10px] px-1.5">{t}</Badge>
                    ))}
                    {p.tags.length > 3 && (
                      <Badge variant="secondary" className="text-[10px] px-1.5">+{p.tags.length - 3}</Badge>
                    )}
                  </div>
                  {expandedId === p.promptId ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </div>

              {expandedId === p.promptId && (
                <div className="border-t border-border">
                  <div className="p-4 space-y-3">
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        onClick={(e) => { e.stopPropagation(); setEditing(p); }}
                      >
                        <Pencil className="w-3.5 h-3.5" /> Edit
                      </Button>
                      <CopyButton text={p.template} />
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 text-destructive hover:text-destructive"
                        onClick={(e) => { e.stopPropagation(); handleDelete(p.promptId); }}
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </Button>
                    </div>
                    <pre className="text-xs font-mono bg-zinc-900 rounded-lg p-4 overflow-x-auto whitespace-pre-wrap text-zinc-300 max-h-[400px] overflow-y-auto">
                      {p.template}
                    </pre>
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      <span>Category: {p.category}</span>
                      <span>Created: {new Date(p.createdAt).toLocaleDateString()}</span>
                      <span>Updated: {new Date(p.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          ))}

          {items.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              No prompts found. Create one to get started.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-1.5"
      onClick={async (e) => {
        e.stopPropagation();
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? "Copied" : "Copy Template"}
    </Button>
  );
}
