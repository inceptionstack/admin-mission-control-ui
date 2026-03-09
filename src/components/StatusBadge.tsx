import { CheckCircle, Loader, AlertTriangle, Trash2, Ban, Clock, HelpCircle, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface StatusConfig {
  icon: typeof CheckCircle;
  label: string;
  className: string;
  spin?: boolean;
}

function getStatusConfig(status: string): StatusConfig {
  switch (status) {
    case "READY":
      return {
        icon: CheckCircle,
        label: "Ready",
        className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/10",
      };
    case "DEPLOYING":
      return {
        icon: Loader,
        label: "Deploying",
        className: "border-blue-500/30 bg-blue-500/10 text-blue-400 hover:bg-blue-500/10",
        spin: true,
      };
    case "SUSPENDED":
      return {
        icon: Ban,
        label: "Suspended",
        className: "border-orange-500/30 bg-orange-500/10 text-orange-400 hover:bg-orange-500/10",
      };
    case "PENDING_CLOSURE":
      return {
        icon: Clock,
        label: "Pending Closure",
        className: "border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/10",
      };
    case "DELETING":
      return {
        icon: Trash2,
        label: "Deleting",
        className: "border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/10",
        spin: true,
      };
    case "CLOSING":
      return {
        icon: Trash2,
        label: "Closing",
        className: "border-orange-500/30 bg-orange-500/10 text-orange-400 hover:bg-orange-500/10",
        spin: true,
      };
    case "DELETED":
      return {
        icon: XCircle,
        label: "Deleted",
        className: "border-zinc-500/30 bg-zinc-500/10 text-zinc-400 hover:bg-zinc-500/10",
      };
    case "ERROR":
      return {
        icon: AlertTriangle,
        label: "Error",
        className: "border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/10",
      };
    default:
      return {
        icon: HelpCircle,
        label: status,
        className: "border-zinc-500/30 bg-zinc-500/10 text-zinc-400 hover:bg-zinc-500/10",
      };
  }
}

export function StatusBadge({ status }: { status: string }) {
  const config = getStatusConfig(status);
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={config.className}>
      <Icon
        className={`w-3.5 h-3.5 mr-1.5 ${config.spin ? "animate-spin" : ""}`}
      />
      {config.label}
    </Badge>
  );
}
