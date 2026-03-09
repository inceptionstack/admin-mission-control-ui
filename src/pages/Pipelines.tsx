import { useQuery } from "@tanstack/react-query";
import { pipelinesApi, type PipelineInfo } from "../api/client";
import {
  GitBranch,
  GitCommit,
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  RefreshCw,
  User,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";

const STATUS_CONFIG: Record<string, { color: string; bg: string; border: string; icon: typeof CheckCircle2 }> = {
  Succeeded: { color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", icon: CheckCircle2 },
  Failed: { color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20", icon: XCircle },
  InProgress: { color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20", icon: Loader2 },
  Unknown: { color: "text-zinc-400", bg: "bg-zinc-500/10", border: "border-zinc-500/20", icon: Clock },
  Error: { color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20", icon: XCircle },
};

function getStatusConfig(status: string) {
  return STATUS_CONFIG[status] || STATUS_CONFIG.Unknown;
}

function formatPipelineName(name: string): string {
  return name
    .replace(/-pipeline$/, "")
    .replace(/^faststart-/, "")
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function timeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ${mins % 60}m ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function commitTimeAgo(epochStr: string): string {
  const epoch = parseInt(epochStr.split(" ")[0], 10);
  if (isNaN(epoch)) return "";
  return timeAgo(new Date(epoch * 1000).toISOString());
}

function getConsoleUrl(pipelineName: string): string {
  return `https://us-east-1.console.aws.amazon.com/codesuite/codepipeline/pipelines/${encodeURIComponent(pipelineName)}/view?region=us-east-1`;
}

function PipelineCard({ pipeline }: { pipeline: PipelineInfo }) {
  const cfg = getStatusConfig(pipeline.status);
  const StatusIcon = cfg.icon;
  const isRunning = pipeline.status === "InProgress";

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-10 h-10 rounded-lg ${cfg.bg} border ${cfg.border} flex items-center justify-center shrink-0`}>
              <StatusIcon className={`w-5 h-5 ${cfg.color} ${isRunning ? "animate-spin" : ""}`} />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-foreground">{formatPipelineName(pipeline.name)}</h3>
              <span className="text-xs text-muted-foreground font-mono">{pipeline.repo}</span>
            </div>
          </div>
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ${cfg.bg} ${cfg.color} border ${cfg.border}`}>
            {pipeline.status}
          </span>
        </div>

        {/* Stages row */}
        <div className="flex items-center gap-1.5 mt-3">
          {pipeline.stages.map((stage, i) => {
            const sCfg = getStatusConfig(stage.status);
            const SIcon = sCfg.icon;
            const running = stage.status === "InProgress";
            return (
              <div key={stage.name} className="flex items-center gap-1.5">
                {i > 0 && <div className={`w-5 h-px ${stage.status === "Succeeded" ? "bg-emerald-500/40" : "bg-border"}`} />}
                <div className="flex items-center gap-1" title={`${stage.name}: ${stage.status}`}>
                  <SIcon className={`w-3 h-3 ${sCfg.color} ${running ? "animate-spin" : ""}`} />
                  <span className="text-[11px] text-muted-foreground">{stage.name}</span>
                </div>
              </div>
            );
          })}
          {pipeline.lastExecutionTime && (
            <span className="ml-auto text-[10px] text-muted-foreground flex items-center gap-1 shrink-0">
              <Clock className="w-2.5 h-2.5" />
              {timeAgo(pipeline.lastExecutionTime)}
            </span>
          )}
        </div>
      </div>

      {/* Commits */}
      <div className="px-5 py-3 flex-1">
        <div className="flex items-center gap-1.5 mb-2">
          <GitBranch className="w-3 h-3 text-muted-foreground" />
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Recent Commits</span>
        </div>
        {pipeline.commits.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">No commits found</p>
        ) : (
          <div className="space-y-1.5">
            {pipeline.commits.map((commit, i) => (
              <div key={commit.id} className={`flex items-start gap-2 ${i > 0 ? "opacity-60" : ""}`}>
                <GitCommit className="w-3 h-3 text-muted-foreground mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-foreground leading-snug truncate">{commit.message}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[10px] text-muted-foreground font-mono">{commit.id.slice(0, 7)}</span>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                      <User className="w-2.5 h-2.5" />
                      {commit.author}
                    </span>
                    {commit.date && <span className="text-[10px] text-muted-foreground">{commitTimeAgo(commit.date)}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer — AWS Console link */}
      <div className="border-t border-border px-5 py-2.5">
        <a
          href={getConsoleUrl(pipeline.name)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          View in AWS Console
        </a>
      </div>
    </div>
  );
}

export function Pipelines() {
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["pipelines"],
    queryFn: () => pipelinesApi.list(),
    refetchInterval: 15_000,
  });

  const pipelines = data?.pipelines || [];
  const reposWithoutPipeline = data?.reposWithoutPipeline || [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">CI/CD Pipelines</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Deployment status and recent commits
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-card border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {reposWithoutPipeline.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-4 py-3 mb-5 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-300">Repositories without CI/CD pipeline</p>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {reposWithoutPipeline.map((r) => (
                <code key={r} className="text-xs bg-amber-500/10 text-amber-400/80 px-2 py-0.5 rounded font-mono">{r}</code>
              ))}
            </div>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
          <span className="ml-3 text-sm text-muted-foreground">Loading pipelines...</span>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-sm text-red-400">
          Failed to load pipelines: {error instanceof Error ? error.message : "Unknown error"}
        </div>
      )}

      {pipelines.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {pipelines.map((p) => (
            <PipelineCard key={p.name} pipeline={p} />
          ))}
        </div>
      )}

      {!isLoading && pipelines.length === 0 && !error && (
        <p className="text-sm text-muted-foreground text-center py-10">No pipelines found</p>
      )}
    </div>
  );
}
