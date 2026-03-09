import { CheckCircle, Circle, Loader2, XCircle, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PipelineStep, PipelineSummary } from "../types";

function PipelineStepIcon({ status }: { status: PipelineStep["status"] }) {
  switch (status) {
    case "complete": return <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />;
    case "in-progress": return <Loader2 className="w-5 h-5 text-amber-400 animate-spin shrink-0" />;
    case "error": return <XCircle className="w-5 h-5 text-red-400 shrink-0" />;
    case "pending": return <Circle className="w-5 h-5 text-zinc-600 shrink-0" />;
  }
}

interface VendingStatusProps {
  variant: "compact" | "full";
  pipelineSummary?: PipelineSummary;
  pipelineSteps?: PipelineStep[];
}

/** Compact: progress bar + current step (for EnvironmentCard) */
function CompactView({ pipelineSummary }: { pipelineSummary: PipelineSummary }) {
  return (
    <div className="mb-2">
      <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
        <span className="flex items-center gap-1.5">
          <Loader2 className="w-3 h-3 animate-spin text-amber-400" />
          Step {pipelineSummary.completedSteps}/{pipelineSummary.totalSteps}: {pipelineSummary.currentStep}
        </span>
      </div>
      <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-amber-400 rounded-full transition-all duration-500"
          style={{ width: `${(pipelineSummary.completedSteps / pipelineSummary.totalSteps) * 100}%` }}
        />
      </div>
    </div>
  );
}

/** Full: vertical stepper with all steps (for EnvironmentDetails) */
function FullView({ pipelineSteps }: { pipelineSteps: PipelineStep[] }) {
  const completed = pipelineSteps.filter((s) => s.status === "complete").length;
  const total = pipelineSteps.length;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Activity className="w-4 h-4" /> Pipeline Progress
          <span className="text-xs font-normal text-muted-foreground ml-auto">
            {completed}/{total}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {pipelineSteps.length > 0 ? (
          <div className="space-y-0">
            {pipelineSteps.map((step, i) => {
              const isLast = i === pipelineSteps.length - 1;
              return (
                <div key={step.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <PipelineStepIcon status={step.status} />
                    {!isLast && (
                      <div className={`w-px flex-1 min-h-[20px] ${
                        step.status === "complete" ? "bg-emerald-400/30" : "bg-zinc-700"
                      }`} />
                    )}
                  </div>
                  <div className={`pb-4 min-w-0 flex-1 ${isLast ? "pb-0" : ""}`}>
                    <p className={`text-xs font-medium ${
                      step.status === "complete" ? "text-foreground" :
                      step.status === "in-progress" ? "text-amber-400" :
                      step.status === "error" ? "text-red-400" :
                      "text-muted-foreground"
                    }`}>
                      {step.label}
                    </p>
                    {step.detail && (
                      <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{step.detail}</p>
                    )}
                    {step.timestamp && (
                      <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                        {new Date(step.timestamp).toLocaleTimeString()}
                        {step.durationMs ? ` (${(step.durationMs / 1000).toFixed(0)}s)` : ""}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
            {pipelineSteps.every((s) => s.status === "complete") && (
              <div className="mt-3 pt-3 border-t border-border/50 text-center">
                <p className="text-xs text-emerald-400 font-medium">All steps complete</p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No pipeline data available.</p>
        )}
      </CardContent>
    </Card>
  );
}

export function VendingStatus({ variant, pipelineSummary, pipelineSteps }: VendingStatusProps) {
  if (variant === "compact" && pipelineSummary) {
    return <CompactView pipelineSummary={pipelineSummary} />;
  }
  if (variant === "full" && pipelineSteps) {
    return <FullView pipelineSteps={pipelineSteps} />;
  }
  return null;
}
