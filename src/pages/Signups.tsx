import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { signupsApi, api } from "../api/client";
import type { Signup, SignupStatus, Environment } from "../types";
import {
  UserPlus,
  Search,
  Loader2,
  ChevronDown,
  ChevronRight,
  Mail,
  Building2,
  Users,
  Clock,
  CheckCircle,
  AlertTriangle,
  X,
  ExternalLink,
  Trash2,
  Copy,
  ClipboardCheck,
  Download,
} from "lucide-react";

const STATUS_CONFIG: Record<SignupStatus, { color: string; bg: string; border: string; dot: string }> = {
  new: { color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20", dot: "bg-blue-400" },
  contacted: { color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20", dot: "bg-amber-400" },
  approved: { color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", dot: "bg-emerald-400" },
  rejected: { color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20", dot: "bg-red-400" },
  ignored: { color: "text-zinc-400", bg: "bg-zinc-500/10", border: "border-zinc-500/20", dot: "bg-zinc-400" },
};

const ALL_STATUSES: SignupStatus[] = ["new", "contacted", "approved", "rejected", "ignored"];

function timeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(isoDate).toLocaleDateString();
}

const USE_CASE_COLORS = [
  "bg-violet-500/15 text-violet-300 border-violet-500/20",
  "bg-cyan-500/15 text-cyan-300 border-cyan-500/20",
  "bg-pink-500/15 text-pink-300 border-pink-500/20",
  "bg-lime-500/15 text-lime-300 border-lime-500/20",
  "bg-orange-500/15 text-orange-300 border-orange-500/20",
];

function StatusBadge({ status }: { status: SignupStatus }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.new;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color} border ${cfg.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {status}
    </span>
  );
}

function findEmailConflict(email: string, environments: Environment[] | undefined): Environment | undefined {
  if (!environments) return undefined;
  return environments.find((e) => e.ownerEmail?.toLowerCase() === email.toLowerCase());
}

function ApproveDialog({ signup, conflict, onConfirm, onCancel, isApproving }: {
  signup: Signup;
  conflict: Environment | undefined;
  onConfirm: () => void;
  onCancel: () => void;
  isApproving: boolean;
}) {
  const fullName = signup.fullName || [signup.firstName, signup.lastName].filter(Boolean).join(" ") || "—";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onCancel}>
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="text-base font-semibold text-foreground">Approve & Provision</h3>
          <button onClick={onCancel} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-5 py-4 space-y-3">
          {conflict && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
              <AlertTriangle className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-orange-400">Email already has an environment</p>
                <p className="text-orange-300/80 text-xs mt-0.5">{conflict.accountName} ({conflict.accountId})</p>
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Name</p>
              <p className="text-foreground font-medium">{fullName}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Email</p>
              <p className="text-foreground">{signup.email}</p>
            </div>
            {signup.role && (
              <div>
                <p className="text-xs text-muted-foreground">Role</p>
                <p className="text-foreground">{signup.role}</p>
              </div>
            )}
            {signup.team && (
              <div>
                <p className="text-xs text-muted-foreground">Team</p>
                <p className="text-foreground">{signup.team}</p>
              </div>
            )}
          </div>
          {signup.useCases && signup.useCases.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Use Cases</p>
              <div className="flex flex-wrap gap-1">
                {signup.useCases.map((uc, i) => (
                  <span key={uc} className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${USE_CASE_COLORS[i % USE_CASE_COLORS.length]}`}>
                    {uc}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-border">
          <button onClick={onCancel} disabled={isApproving} className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isApproving}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md bg-emerald-600 text-white hover:bg-emerald-500 transition-colors disabled:opacity-50"
          >
            {isApproving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
            {isApproving ? "Provisioning..." : "Approve & Provision"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SignupRow({ signup, isExpanded, onToggle, onStatusChange, isUpdating, onApprove, onDelete, onTemplateApprove, conflict }: {
  signup: Signup;
  isExpanded: boolean;
  onToggle: () => void;
  onStatusChange: (id: string, status: SignupStatus) => void;
  isUpdating: boolean;
  onApprove: (signup: Signup) => void;
  onDelete: (id: string) => void;
  onTemplateApprove: (id: string) => void;
  conflict: Environment | undefined;
}) {
  const fullName = signup.fullName || [signup.firstName, signup.lastName].filter(Boolean).join(" ") || "—";

  return (
    <>
      <tr
        onClick={onToggle}
        className="border-b border-border/50 hover:bg-accent/30 cursor-pointer transition-colors"
      >
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
            <span className="text-sm font-medium text-foreground">{fullName}</span>
          </div>
        </td>
        <td className="px-4 py-3">
          <span className="text-sm text-muted-foreground">{signup.email}</span>
        </td>
        <td className="px-4 py-3">
          <span className="text-sm text-muted-foreground">{signup.role || "—"}</span>
        </td>
        <td className="px-4 py-3">
          <span className="text-sm text-muted-foreground">{signup.team || "—"}</span>
        </td>
        <td className="px-4 py-3">
          {signup.accountAccess ? (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-zinc-500/15 text-zinc-300 border border-zinc-500/20">
              {signup.accountAccess || signup.accountAccessType}
            </span>
          ) : "—"}
        </td>
        <td className="px-4 py-3">
          <div className="flex flex-wrap gap-1">
            {(signup.useCases || []).map((uc, i) => (
              <span key={uc} className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${USE_CASE_COLORS[i % USE_CASE_COLORS.length]}`}>
                {uc}
              </span>
            ))}
            {(!signup.useCases || signup.useCases.length === 0) && <span className="text-xs text-muted-foreground">—</span>}
          </div>
        </td>
        <td className="px-4 py-3">
          <span className="text-sm text-muted-foreground">{signup.teamSize || "—"}</span>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-1.5">
            <StatusBadge status={signup.status} />
            {conflict && ["new", "contacted"].includes(signup.status) && (
              <span title={`Has environment: ${conflict.accountName}`} className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20">
                <AlertTriangle className="w-3 h-3" />
                Has environment
              </span>
            )}
            {signup.status === "approved" && signup.accountId && (
              <a href={`/env/${signup.accountId}`} className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors" onClick={(e) => e.stopPropagation()}>
                <ExternalLink className="w-3 h-3" />
                {signup.accountId}
              </a>
            )}
          </div>
        </td>
        <td className="px-4 py-3">
          <span className="text-xs text-muted-foreground whitespace-nowrap">{timeAgo(signup.createdAt)}</span>
        </td>
        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-1.5">
            <select
              value={signup.status}
              onChange={(e) => {
                const newStatus = e.target.value as SignupStatus;
                if (newStatus === "approved") {
                  onApprove(signup);
                  // Reset dropdown to current status since approve is handled by modal
                  e.target.value = signup.status;
                } else {
                  onStatusChange(signup.signupId, newStatus);
                }
              }}
              disabled={isUpdating}
              className="bg-zinc-800 border border-border text-xs text-foreground rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
            >
              {ALL_STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            {["new", "contacted"].includes(signup.status) && (
                <button
                  onClick={() => onApprove(signup)}
                  disabled={isUpdating}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-600/30 transition-colors disabled:opacity-50"
                  title="Approve & provision new environment"
                >
                  <CheckCircle className="w-3 h-3" />
                  Provision
                </button>
            )}
            <button
              onClick={() => onTemplateApprove(signup.signupId)}
              disabled={isUpdating}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md bg-blue-600/20 text-blue-400 border border-blue-500/20 hover:bg-blue-600/30 transition-colors disabled:opacity-50"
              title="Generate CloudFormation template link"
            >
              <Download className="w-3 h-3" />
              Template
            </button>
            <button
              onClick={() => { if (confirm(`Delete signup from ${signup.email}?`)) onDelete(signup.signupId); }}
              disabled={isUpdating}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md bg-red-600/20 text-red-400 border border-red-500/20 hover:bg-red-600/30 transition-colors disabled:opacity-50"
              title="Delete this signup"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </td>
      </tr>
      {isExpanded && (
        <tr className="border-b border-border/50 bg-accent/20">
          <td colSpan={10} className="px-4 py-4">
            <div className="ml-6 grid grid-cols-2 gap-4 text-sm">
              {signup.organization && (
                <div className="flex items-start gap-2">
                  <Building2 className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Organization</p>
                    <p className="text-foreground">{signup.organization}</p>
                  </div>
                </div>
              )}
              {signup.orgId && (
                <div className="flex items-start gap-2">
                  <Building2 className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Org ID</p>
                    <p className="text-foreground font-mono text-xs">{signup.orgId}</p>
                  </div>
                </div>
              )}
              {signup.useCaseOther && (
                <div className="flex items-start gap-2">
                  <Users className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Use Case (Other)</p>
                    <p className="text-foreground">{signup.useCaseOther}</p>
                  </div>
                </div>
              )}
              {signup.notes && (
                <div className="flex items-start gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Notes</p>
                    <p className="text-foreground">{signup.notes}</p>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-2">
                <Clock className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Submitted</p>
                  <p className="text-foreground">{new Date(signup.createdAt).toLocaleString()}</p>
                </div>
              </div>
              {signup.updatedAt && (
                <div className="flex items-start gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Last Updated</p>
                    <p className="text-foreground">{new Date(signup.updatedAt).toLocaleString()}</p>
                  </div>
                </div>
              )}
              {signup.status === "approved" && signup.accountId && (
                <div className="flex items-start gap-2">
                  <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Environment</p>
                    <a href={`/env/${signup.accountId}`} className="text-primary hover:underline font-mono text-xs">
                      {signup.accountId}
                    </a>
                  </div>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export function Signups() {
  const [filter, setFilter] = useState<string>("new");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [approveTarget, setApproveTarget] = useState<Signup | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const queryClient = useQueryClient();

  const { data: signupsData, isLoading } = useQuery({
    queryKey: ["signups"],
    queryFn: () => signupsApi.list(),
    refetchInterval: 30_000,
  });

  const { data: environments } = useQuery({
    queryKey: ["environments"],
    queryFn: () => api.listEnvironments(),
    staleTime: 60_000,
  });

  const mutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      signupsApi.updateStatus(id, status),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: ["signups"] });
      const previous = queryClient.getQueryData<{ signups: Signup[]; total: number }>(["signups"]);
      if (previous) {
        queryClient.setQueryData(["signups"], {
          ...previous,
          signups: previous.signups.map((s) =>
            s.signupId === id ? { ...s, status: status as SignupStatus } : s
          ),
        });
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["signups"], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["signups"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => signupsApi.delete(id),
    onSuccess: () => {
      setToast({ message: "Signup deleted", type: "success" });
      queryClient.invalidateQueries({ queryKey: ["signups"] });
      setTimeout(() => setToast(null), 5000);
    },
    onError: (err: any) => {
      setToast({ message: err?.message || "Delete failed", type: "error" });
      setTimeout(() => setToast(null), 5000);
    },
  });

  const [templateUrl, setTemplateUrl] = useState<{ url: string; consoleUrl: string; email: string } | null>(null);

  const templateMutation = useMutation({
    mutationFn: (id: string) => signupsApi.templateApprove(id),
    onSuccess: (data) => {
      const signup = (signupsData?.signups || []).find((s: any) => s.signupId === data.signupId);
      setTemplateUrl({ url: data.consoleUrl, consoleUrl: data.consoleUrl, email: signup?.email || "" });
      queryClient.invalidateQueries({ queryKey: ["signups"] });
    },
    onError: (err: any) => {
      setToast({ message: err?.message || "Template approve failed", type: "error" });
      setTimeout(() => setToast(null), 5000);
    },
  });
  const approveMutation = useMutation({
    mutationFn: (id: string) => signupsApi.approve(id),
    onSuccess: (_data, id) => {
      const signup = (signupsData?.signups || []).find((s) => s.signupId === id);
      setToast({ message: `Environment created for ${signup?.email || id}`, type: "success" });
      setApproveTarget(null);
      queryClient.invalidateQueries({ queryKey: ["signups"] });
      queryClient.invalidateQueries({ queryKey: ["environments"] });
      setTimeout(() => setToast(null), 5000);
    },
    onError: (err: any) => {
      const message = err?.message || "Approval failed";
      setToast({ message, type: "error" });
      setTimeout(() => setToast(null), 5000);
    },
  });

  const signups = signupsData?.signups || [];
  const searched = search.trim() ? signups.filter((s) => {
    const q = search.toLowerCase();
    const name = s.fullName || [s.firstName, s.lastName].filter(Boolean).join(" ") || "";
    return name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q) || (s.team || "").toLowerCase().includes(q);
  }) : signups;
  const filtered = filter === "all" ? searched : searched.filter((s) => s.status === filter);

  const counts = {
    all: signups.length,
    new: signups.filter((s) => s.status === "new").length,
    contacted: signups.filter((s) => s.status === "contacted").length,
    approved: signups.filter((s) => s.status === "approved").length,
    rejected: signups.filter((s) => s.status === "rejected").length,
    ignored: signups.filter((s) => s.status === "ignored").length,
  };

  const tabs: { key: string; label: string }[] = [
    { key: "all", label: "All" },
    { key: "new", label: "New" },
    { key: "contacted", label: "Contacted" },
    { key: "approved", label: "Approved" },
    { key: "rejected", label: "Rejected" },
    { key: "ignored", label: "Ignored" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 border border-primary/20 rounded-lg flex items-center justify-center">
            <UserPlus className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Signups</h1>
            <p className="text-sm text-muted-foreground">
              {signupsData?.total ?? 0} total signups
            </p>
          </div>
        </div>
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email, or team..."
          className="w-full pl-10 pr-4 py-2 bg-card border border-border rounded-lg text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
        />
      </div>
      {/* Stats bar */}
      <div className="flex items-center gap-4 text-sm">
        {ALL_STATUSES.map((s) => {
          const cfg = STATUS_CONFIG[s];
          return (
            <div key={s} className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
              <span className="text-muted-foreground capitalize">{s}</span>
              <span className="text-foreground font-semibold">{counts[s]}</span>
            </div>
          );
        })}
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              filter === tab.key
                ? "bg-primary/10 text-primary border border-primary/20"
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            }`}
          >
            {tab.label}
            <span className="ml-1.5 text-xs opacity-70">
              {counts[tab.key as keyof typeof counts]}
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <UserPlus className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No signups found</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Role</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Team</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Access</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Use Cases</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Team Size</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Submitted</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((signup) => (
                  <SignupRow
                    key={signup.signupId}
                    signup={signup}
                    isExpanded={expandedId === signup.signupId}
                    onToggle={() => setExpandedId(expandedId === signup.signupId ? null : signup.signupId)}
                    onStatusChange={(id, status) => mutation.mutate({ id, status })}
                    isUpdating={mutation.isPending && mutation.variables?.id === signup.signupId}
                    onApprove={(s) => setApproveTarget(s)}
                    onDelete={(id) => deleteMutation.mutate(id)}
                    onTemplateApprove={(id) => templateMutation.mutate(id)}
                    conflict={findEmailConflict(signup.email, environments)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Approve confirmation dialog */}
      {approveTarget && (
        <ApproveDialog
          signup={approveTarget}
          conflict={findEmailConflict(approveTarget.email, environments)}
          onConfirm={() => approveMutation.mutate(approveTarget.signupId)}
          onCancel={() => { setApproveTarget(null); approveMutation.reset(); }}
          isApproving={approveMutation.isPending}
        />
      )}

      {/* Template URL dialog */}
      {templateUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setTemplateUrl(null)}>
          <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="text-base font-semibold text-foreground">CloudFormation Template Link</h3>
              <button onClick={() => setTemplateUrl(null)} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-5 py-4 space-y-4">
              <p className="text-sm text-muted-foreground">
                Signup approved. Send this link to <span className="text-foreground font-medium">{templateUrl.email}</span> — it opens CloudFormation with the FastStart template pre-loaded. Valid for 1 week.
              </p>
              <div className="relative">
                <input
                  type="text"
                  readOnly
                  value={templateUrl.url}
                  className="w-full bg-zinc-900 border border-border text-xs text-foreground font-mono rounded-lg pl-3 pr-20 py-3 focus:outline-none"
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
                <button
                  onClick={() => { navigator.clipboard.writeText(templateUrl.url); setToast({ message: "Link copied!", type: "success" }); setTimeout(() => setToast(null), 3000); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md bg-blue-600 text-white hover:bg-blue-500 transition-colors"
                >
                  <Copy className="w-3 h-3" />
                  Copy
                </button>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-border">
              <button
                onClick={() => { window.open(templateUrl.consoleUrl, "_blank"); }}
                className="px-3 py-1.5 text-sm font-medium rounded-md bg-zinc-700 text-white hover:bg-zinc-600 transition-colors"
              >
                Open in Console
              </button>
              <button onClick={() => setTemplateUrl(null)} className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium border ${
          toast.type === "success"
            ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
            : "bg-red-500/15 text-red-300 border-red-500/30"
        }`}>
          {toast.type === "success" ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {toast.message}
          <button onClick={() => setToast(null)} className="ml-2 text-muted-foreground hover:text-foreground">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
