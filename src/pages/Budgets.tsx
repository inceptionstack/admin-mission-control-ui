import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { budgetsApi } from "../api/client";
import { Link } from "react-router-dom";
import {
  DollarSign,
  Infinity as InfinityIcon,
  Shield,
  Edit3,
  Check,
  X,
  Loader2,
  AlertTriangle,
  ExternalLink,
  Search,
} from "lucide-react";

interface LiteLLMKey {
  token: string;
  keyAlias: string;
  keyName: string;
  spend: number;
  maxBudget: number | null;
  models: string[];
  metadata: {
    email?: string;
    account_id?: string;
    account_name?: string;
    role?: string;
  };
  lastActive: string | null;
  createdAt: string;
}

function BudgetBadge({ budget, spend }: { budget: number | null; spend: number }) {
  const pct = budget ? (spend / budget) * 100 : null;
  if (pct !== null && pct > 90) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
        <AlertTriangle className="w-3 h-3" />
        ${budget!.toLocaleString()}
      </span>
    );
  }
  if (budget === null || budget === undefined) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
        <InfinityIcon className="w-3 h-3" />
        Unlimited
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
      <DollarSign className="w-3 h-3" />
      ${budget.toLocaleString()}
    </span>
  );
}

function SpendBar({ spend, budget }: { spend: number; budget: number | null }) {
  if (budget === null || budget === undefined || budget === 0) {
    return (
      <div className="w-full bg-zinc-800 rounded-full h-1.5">
        <div className="bg-blue-500/50 h-1.5 rounded-full" style={{ width: `${Math.min((spend / 10) * 100, 100)}%` }} />
      </div>
    );
  }
  const pct = Math.min((spend / budget) * 100, 100);
  const color = pct > 90 ? "bg-red-500" : pct > 70 ? "bg-amber-500" : "bg-blue-500";
  return (
    <div className="w-full bg-zinc-800 rounded-full h-1.5">
      <div className={`${color} h-1.5 rounded-full transition-all`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function KeyRow({ k, onUpdateBudget, isUpdating }: {
  k: LiteLLMKey;
  onUpdateBudget: (token: string, budget: number | null) => void;
  isUpdating: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [budgetInput, setBudgetInput] = useState("");

  const handleSave = () => {
    const val = budgetInput.trim();
    if (val === "" || val.toLowerCase() === "unlimited") {
      onUpdateBudget(k.token, null);
    } else {
      const num = parseFloat(val);
      if (!isNaN(num) && num > 0) onUpdateBudget(k.token, num);
    }
    setEditing(false);
  };

  const email = k.metadata?.email || "";
  const accountId = k.metadata?.account_id || "";
  const role = k.metadata?.role || "";
  const isManagement = role === "management-plane";
  const pct = k.maxBudget ? (k.spend / k.maxBudget) * 100 : null;
  const isWarning = pct !== null && pct > 90;
  const isIdle = k.spend === 0;

  return (
    <div className={`glass rounded-xl p-5 space-y-3 ${isWarning ? "ring-1 ring-red-500/30" : ""} ${isIdle ? "opacity-60" : ""}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="text-sm font-semibold text-zinc-100 truncate">{k.keyAlias || k.keyName || "Unnamed Key"}</h3>
            {isManagement && (
              <span className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-violet-500/10 text-violet-400 border border-violet-500/20">
                <Shield className="w-2.5 h-2.5" /> Master
              </span>
            )}
            {isWarning && (
              <span className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                <AlertTriangle className="w-2.5 h-2.5" /> Near limit
              </span>
            )}
            {isIdle && (
              <span className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-zinc-500/10 text-zinc-500 border border-zinc-700">
                Idle
              </span>
            )}
          </div>
          {email && <p className="text-xs text-zinc-500 truncate">{email}</p>}
          <div className="flex items-center gap-2 mt-0.5">
            {accountId && (
              <p className="text-xs text-zinc-600 font-mono">{accountId}</p>
            )}
            {accountId && !isManagement && (
              <Link
                to={`/env/${accountId}`}
                className="inline-flex items-center gap-0.5 text-[10px] text-blue-500 hover:text-blue-400 transition-colors"
              >
                <ExternalLink className="w-2.5 h-2.5" /> View Env
              </Link>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {editing ? (
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={budgetInput}
                onChange={(e) => setBudgetInput(e.target.value)}
                placeholder="$ or unlimited"
                className="w-28 px-2 py-1 text-xs rounded bg-zinc-800 border border-zinc-700 text-zinc-200 focus:border-blue-500 focus:outline-none"
                autoFocus
                onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") setEditing(false); }}
              />
              <button onClick={handleSave} className="p-1 rounded hover:bg-emerald-500/20 text-emerald-400"><Check className="w-3.5 h-3.5" /></button>
              <button onClick={() => setEditing(false)} className="p-1 rounded hover:bg-red-500/20 text-red-400"><X className="w-3.5 h-3.5" /></button>
            </div>
          ) : (
            <>
              <BudgetBadge budget={k.maxBudget} spend={k.spend} />
              <button
                onClick={() => { setBudgetInput(k.maxBudget !== null && k.maxBudget !== undefined ? String(k.maxBudget) : ""); setEditing(true); }}
                disabled={isUpdating}
                className="p-1 rounded hover:bg-zinc-700 text-zinc-500 hover:text-zinc-300 transition-colors disabled:opacity-50"
                title="Edit budget"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-zinc-400">
          <span className={isWarning ? "text-red-400 font-medium" : ""}>${k.spend.toFixed(2)} spent {k.createdAt && <span className="text-zinc-600 font-normal">since {new Date(k.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>}</span>
          <span>{k.maxBudget !== null && k.maxBudget !== undefined ? `$${k.maxBudget.toLocaleString()} limit` : "No limit"}</span>
        </div>
        <SpendBar spend={k.spend} budget={k.maxBudget} />
      </div>
      <div className="flex items-center gap-3 text-[11px] text-zinc-600">
        <span>{k.models?.length || 0} models</span>
        {k.lastActive && (
          <span>Last active: {new Date(k.lastActive).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
        )}
        {!k.lastActive && <span className="text-zinc-700">Never used</span>}
      </div>
    </div>
  );
}

export default function Budgets() {
  const queryClient = useQueryClient();
  const [updatingToken, setUpdatingToken] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "warning" | "idle">("all");

  const { data: keys, isLoading, error } = useQuery<LiteLLMKey[]>({
    queryKey: ["budget-keys"],
    queryFn: budgetsApi.listKeys,
    refetchInterval: 30000,
  });

  const mutation = useMutation({
    mutationFn: async ({ token, maxBudget }: { token: string; maxBudget: number | null }) => {
      setUpdatingToken(token);
      return budgetsApi.updateBudget(token, maxBudget);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["budget-keys"] }); setUpdatingToken(null); },
    onError: () => { setUpdatingToken(null); },
  });

  const totalSpend = keys?.reduce((sum, k) => sum + (k.spend || 0), 0) || 0;
  const activeKeys = keys?.filter((k) => k.spend > 0).length || 0;
  const warningKeys = keys?.filter((k) => k.maxBudget && (k.spend / k.maxBudget) > 0.9).length || 0;

  const filtered = keys
    ?.filter((k) => {
      const q = search.toLowerCase();
      const matchSearch = !q || (k.keyAlias || k.keyName || "").toLowerCase().includes(q)
        || (k.metadata?.email || "").toLowerCase().includes(q)
        || (k.metadata?.account_id || "").includes(q);
      const pct = k.maxBudget ? (k.spend / k.maxBudget) * 100 : null;
      const matchFilter = filter === "all" ? true
        : filter === "active" ? k.spend > 0
        : filter === "warning" ? (pct !== null && pct > 90)
        : filter === "idle" ? k.spend === 0
        : true;
      return matchSearch && matchFilter;
    })
    .sort((a, b) => (b.spend || 0) - (a.spend || 0));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Budgets</h1>
        <p className="text-sm text-zinc-500 mt-1">Manage LiteLLM virtual key budgets per environment</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="glass rounded-xl p-4">
          <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">Total Spend</p>
          <p className="text-2xl font-bold text-zinc-100">${totalSpend.toFixed(2)}</p>
          <p className="text-[10px] text-zinc-600 mt-1">All-time (since key creation)</p>
        </div>
        <div className="glass rounded-xl p-4">
          <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">Virtual Keys</p>
          <p className="text-2xl font-bold text-zinc-100">{keys?.length || 0}</p>
        </div>
        <div className="glass rounded-xl p-4">
          <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">Active</p>
          <p className="text-2xl font-bold text-zinc-100">{activeKeys}</p>
        </div>
        <div className={`glass rounded-xl p-4 ${warningKeys > 0 ? "ring-1 ring-red-500/30" : ""}`}>
          <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">Near Limit</p>
          <p className={`text-2xl font-bold ${warningKeys > 0 ? "text-red-400" : "text-zinc-100"}`}>{warningKeys}</p>
        </div>
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search by name, email, account ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-600"
          />
        </div>
        <div className="flex gap-1">
          {(["all", "active", "warning", "idle"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-2 text-xs rounded-lg capitalize transition-colors ${filter === f ? "bg-zinc-700 text-zinc-100" : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"}`}
            >
              {f === "warning" ? "⚠️ Near limit" : f}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-zinc-500">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading keys...
        </div>
      ) : error ? (
        <div className="glass rounded-xl p-6 text-center text-red-400">Failed to load keys</div>
      ) : filtered?.length === 0 ? (
        <div className="glass rounded-xl p-6 text-center text-zinc-500">No keys match your search</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered?.map((k) => (
            <KeyRow
              key={k.token}
              k={k}
              onUpdateBudget={(token, budget) => mutation.mutate({ token, maxBudget: budget })}
              isUpdating={updatingToken === k.token}
            />
          ))}
        </div>
      )}
    </div>
  );
}
