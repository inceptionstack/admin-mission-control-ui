import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { RefreshCw, Plus, Rocket, AlertTriangle, Search, Eye, EyeOff, ClipboardList, DollarSign, GitBranch, UserPlus, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { api, request } from "../api/client";
import { EnvironmentCard } from "../components/EnvironmentCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Environment } from "../types";

const SUSPENDED_STATUSES = ["SUSPENDED", "PENDING_CLOSURE", "DELETED"];

function isSuspended(env: Environment): boolean {
  return SUSPENDED_STATUSES.includes(env.status);
}

function getDateGroup(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());

  if (date >= today) return "Today";
  if (date >= weekAgo) return "This Week";
  if (date >= monthAgo) return "This Month";
  return "Older";
}

const GROUP_ORDER = ["Today", "This Week", "This Month", "Older"];

function matchesSearch(env: Environment, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  return (
    env.accountName.toLowerCase().includes(q) ||
    env.accountId.includes(q) ||
    (env.ownerEmail || "").toLowerCase().includes(q) ||
    (env.accountEmail || "").toLowerCase().includes(q) ||
    (env.instanceId || "").toLowerCase().includes(q) ||
    (env.status || "").toLowerCase().includes(q)
  );
}

function DashboardStats() {
  const { data: stats } = useQuery<any>({
    queryKey: ["dashboard-stats"],
    queryFn: () => request("/dashboard/stats"),
    refetchInterval: 30000,
  });

  if (!stats) return null;

  const pipelinesOk = stats.pipelinesSummary?.succeeded === stats.pipelinesSummary?.total;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
      <div className="glass rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <ClipboardList className="w-4 h-4 text-blue-400" />
          <span className="text-xs text-zinc-500 uppercase tracking-wide">Tasks</span>
        </div>
        <div className="flex items-baseline gap-2">
          {stats.tasks.inProgress > 0 && (
            <span className="text-lg font-bold text-blue-400">{stats.tasks.inProgress} <span className="text-xs font-normal">active</span></span>
          )}
          <span className="text-sm text-zinc-400">{stats.tasks.backlog} backlog</span>
        </div>
        <p className="text-[10px] text-zinc-600 mt-1">{stats.tasks.done} done · {stats.tasks.tested} tested</p>
      </div>

      <div className={`glass rounded-xl p-4 ${!pipelinesOk ? "ring-1 ring-amber-500/30" : ""}`}>
        <div className="flex items-center gap-2 mb-2">
          <GitBranch className="w-4 h-4 text-emerald-400" />
          <span className="text-xs text-zinc-500 uppercase tracking-wide">Pipelines</span>
        </div>
        <p className={`text-lg font-bold ${pipelinesOk ? "text-emerald-400" : "text-amber-400"}`}>
          {pipelinesOk ? "All Green" : `${stats.pipelinesSummary.failed} failed`}
        </p>
        <p className="text-[10px] text-zinc-600 mt-1">{stats.pipelinesSummary.total} pipelines · {stats.pipelinesSummary.inProgress} running</p>
      </div>

      <div className="glass rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <DollarSign className="w-4 h-4 text-amber-400" />
          <span className="text-xs text-zinc-500 uppercase tracking-wide">Spend</span>
        </div>
        <p className="text-lg font-bold text-zinc-100">${stats.spend.total.toFixed(2)}</p>
        <p className="text-[10px] text-zinc-600 mt-1">{stats.spend.keys} keys · all-time</p>
      </div>

      <div className="glass rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <UserPlus className="w-4 h-4 text-violet-400" />
          <span className="text-xs text-zinc-500 uppercase tracking-wide">Signups</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-bold text-zinc-100">{stats.signups.last7d}</span>
          <span className="text-xs text-zinc-500">this week</span>
        </div>
        <p className="text-[10px] text-zinc-600 mt-1">{stats.signups.last24h} today · {stats.signups.total} total</p>
      </div>

      <div className={`glass rounded-xl p-4 ${stats.signups.pendingApprovals > 0 ? "ring-1 ring-violet-500/30" : ""}`}>
        <div className="flex items-center gap-2 mb-2">
          <Zap className="w-4 h-4 text-orange-400" />
          <span className="text-xs text-zinc-500 uppercase tracking-wide">Pending</span>
        </div>
        <p className={`text-lg font-bold ${stats.signups.pendingApprovals > 0 ? "text-orange-400" : "text-zinc-400"}`}>
          {stats.signups.pendingApprovals}
        </p>
        <p className="text-[10px] text-zinc-600 mt-1">awaiting approval</p>
      </div>
    </div>
  );
}

export function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [search, setSearch] = useState("");
  const [showSuspended, setShowSuspended] = useState(false);

  const {
    data: environments,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["environments"],
    queryFn: api.listEnvironments,
    refetchInterval: 15000,
  });

  const deleteMutation = useMutation({
    mutationFn: api.deleteEnvironment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["environments"] });
      setDeleteTarget(null);
      toast.success("Environment removal initiated");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  // Filter, sort, group
  const { groups, suspendedCount } = useMemo(() => {
    if (!environments) return { groups: [], suspendedCount: 0 };

    const suspended = environments.filter(isSuspended);
    const active = environments.filter((e) => !isSuspended(e));
    const suspendedCount = suspended.length;

    const pool = showSuspended ? [...active, ...suspended] : active;
    const filtered = pool.filter((e) => matchesSearch(e, search));
    const sorted = [...filtered].sort(
      (a, b) => new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime()
    );

    const groupMap = new Map<string, Environment[]>();
    for (const env of sorted) {
      const group = getDateGroup(env.createdDate);
      if (!groupMap.has(group)) groupMap.set(group, []);
      groupMap.get(group)!.push(env);
    }

    const groups = GROUP_ORDER
      .filter((g) => groupMap.has(g))
      .map((g) => ({ label: g, envs: groupMap.get(g)! }));

    return { groups, suspendedCount };
  }, [environments, showSuspended, search]);

  function handleDelete(accountId: string, accountName: string) {
    setDeleteTarget({ id: accountId, name: accountName });
  }

  function confirmDelete() {
    if (deleteTarget) {
      deleteMutation.mutate(deleteTarget.id);
    }
  }

  const totalVisible = groups.reduce((n, g) => n + g.envs.length, 0);

  return (
    <div>
      <DashboardStats />
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <Rocket className="w-7 h-7 text-primary" />
            Home
          </h1>
          <p className="text-muted-foreground mt-1">
            Dashboard overview and environments
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <Button variant="outline" onClick={() => { queryClient.invalidateQueries({ queryKey: ["environments"] }); refetch(); }}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button onClick={() => navigate("/create")}>
            <Plus className="w-4 h-4 mr-2" />
            New Environment
          </Button>
        </div>
      </div>

      {/* Search + Filters */}
      {!isLoading && environments && environments.length > 0 && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, account ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          {suspendedCount > 0 && (
            <Button
              variant={showSuspended ? "secondary" : "outline"}
              size="sm"
              onClick={() => setShowSuspended(!showSuspended)}
              className="shrink-0"
            >
              {showSuspended ? (
                <EyeOff className="w-4 h-4 mr-2" />
              ) : (
                <Eye className="w-4 h-4 mr-2" />
              )}
              {showSuspended ? "Hide" : "Show"} Suspended ({suspendedCount})
            </Button>
          )}
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <div className="flex justify-between mb-4">
                  <div>
                    <Skeleton className="h-5 w-40 mb-2" />
                    <Skeleton className="h-4 w-28" />
                  </div>
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
                <div className="space-y-2 mb-5">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Error */}
      {isError && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="w-8 h-8 text-destructive mx-auto mb-3" />
            <p className="text-destructive font-medium">Failed to load environments</p>
            <p className="text-destructive/70 text-sm mt-1">
              {(error as Error)?.message || "Unknown error"}
            </p>
            <Button variant="link" className="mt-4 text-destructive" onClick={() => { queryClient.invalidateQueries({ queryKey: ["environments"] }); refetch(); }}>
              Try again
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Empty */}
      {!isLoading && !isError && environments?.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center">
            <Rocket className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">No environments yet</h2>
            <p className="text-muted-foreground mb-6">
              Create your first FastStart environment to get started.
            </p>
            <Button onClick={() => navigate("/create")}>
              <Plus className="w-4 h-4 mr-2" />
              Create Environment
            </Button>
          </CardContent>
        </Card>
      )}

      {/* No search results */}
      {!isLoading && environments && environments.length > 0 && totalVisible === 0 && (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <Search className="w-8 h-8 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-muted-foreground">
              No environments match "<span className="text-foreground font-medium">{search}</span>"
            </p>
          </CardContent>
        </Card>
      )}

      {/* Grouped Grid */}
      {!isLoading && groups.length > 0 && (
        <div className="space-y-8">
          {groups.map((group) => (
            <div key={group.label}>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                {group.label}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {group.envs.map((env) => (
                  <EnvironmentCard key={env.accountId} env={env} onDelete={handleDelete} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Environment</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove{" "}
              <span className="font-semibold text-foreground">{deleteTarget?.name}</span>?
              This will close the AWS account and remove all resources. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Removing..." : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
