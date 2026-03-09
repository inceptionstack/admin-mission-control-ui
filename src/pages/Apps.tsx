import { useQuery } from "@tanstack/react-query";
import {
  Globe,
  GitBranch,
  Cloud,
  Server,
  Database,
  ExternalLink,
  Clock,
  Boxes,
} from "lucide-react";
import { appsApi } from "../api/client";
import type { RegistryApp } from "../types";

const statusColors: Record<string, string> = {
  active: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  maintenance: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  deprecated: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
};

const categoryIcons: Record<string, typeof Globe> = {
  dashboard: Globe,
  console: Server,
  registry: Database,
  infrastructure: Cloud,
  cicd: GitBranch,
  wiki: Boxes,
  chat: Server,
};

function AppCard({ app }: { app: RegistryApp }) {
  const Icon = categoryIcons[app.category] || Boxes;
  const resources = [
    app.cloudfront_domain && { label: "CloudFront", value: app.cloudfront_domain },
    app.s3_bucket && { label: "S3", value: app.s3_bucket },
    app.lambda_name && { label: "Lambda", value: app.lambda_name },
    app.api_gw_id && { label: "API GW", value: app.api_gw_id },
    app.pipeline_name && { label: "Pipeline", value: app.pipeline_name },
    app.cognito_client_id && { label: "Cognito", value: app.cognito_client_id },
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <div className="bg-card border border-border rounded-xl p-5 hover:border-muted-foreground/30 transition-colors">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Icon className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{app.name}</h3>
            <span className="text-xs text-muted-foreground capitalize">{app.category}</span>
          </div>
        </div>
        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${statusColors[app.status] || statusColors.active}`}>
          {app.status}
        </span>
      </div>

      <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{app.description}</p>

      {app.repo && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
          <GitBranch className="w-3.5 h-3.5 shrink-0" />
          <span className="font-mono">{app.repo}</span>
        </div>
      )}

      {resources.length > 0 && (
        <div className="space-y-1.5 pt-3 border-t border-border">
          {resources.map((r) => (
            <div key={r.label} className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground/70 w-16 shrink-0">{r.label}</span>
              <span className="font-mono text-muted-foreground truncate">{r.value}</span>
            </div>
          ))}
        </div>
      )}

      {app.cloudfront_domain && (
        <a
          href={`https://${app.cloudfront_domain}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 mt-3 text-xs text-primary hover:text-primary/80 transition-colors"
        >
          <ExternalLink className="w-3 h-3" />
          Open App
        </a>
      )}

      <div className="flex items-center gap-1.5 mt-3 text-[10px] text-muted-foreground/50">
        <Clock className="w-3 h-3" />
        Updated {new Date(app.updated_at).toLocaleDateString()}
      </div>
    </div>
  );
}

export function Apps() {
  const { data: apps, isLoading, error } = useQuery<RegistryApp[]>({
    queryKey: ["apps"],
    queryFn: () => appsApi.list(),
    staleTime: 60_000,
  });

  const activeApps = apps?.filter((a) => a.status === "active") || [];
  const otherApps = apps?.filter((a) => a.status !== "active") || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Apps Registry</h1>
        <p className="text-sm text-muted-foreground mt-1">
          All FastStart platform applications and their AWS resources.
        </p>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {error && (
        <div className="bg-destructive/10 text-destructive border border-destructive/20 rounded-lg px-4 py-3 text-sm">
          Failed to load apps: {error instanceof Error ? error.message : "Unknown error"}
        </div>
      )}

      {!isLoading && activeApps.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-muted-foreground mb-3">Active ({activeApps.length})</h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {activeApps.map((app) => (
              <AppCard key={app.id} app={app} />
            ))}
          </div>
        </div>
      )}

      {!isLoading && otherApps.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-muted-foreground mb-3">Other ({otherApps.length})</h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {otherApps.map((app) => (
              <AppCard key={app.id} app={app} />
            ))}
          </div>
        </div>
      )}

      {!isLoading && apps?.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <Boxes className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No apps registered yet.</p>
        </div>
      )}
    </div>
  );
}
