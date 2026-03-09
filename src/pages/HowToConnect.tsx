import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  ArrowLeft,
  Copy,
  Check,
  Loader,
  Loader2,
  AlertTriangle,
  Terminal,
  Mail,
  Key,
  ShieldAlert,
  Globe,
  Server,
  Eye,
  EyeOff,
  ChevronDown,
  RefreshCw,
  Monitor,
  ExternalLink,
} from "lucide-react";
import { api } from "../api/client";
import { CopyBlock } from "../components/CopyBlock";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { AccessKeysResponse, Environment } from "../types";
import { StatusBadge } from "../components/StatusBadge";

function CopyInlineButton({ value, label = "Copy" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-7 px-2 text-muted-foreground hover:text-foreground shrink-0"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? (
        <>
          <Check className="w-3.5 h-3.5 mr-1 text-emerald-400" />
          <span className="text-xs text-emerald-400">Copied</span>
        </>
      ) : (
        <>
          <Copy className="w-3.5 h-3.5 mr-1" />
          <span className="text-xs">{label}</span>
        </>
      )}
    </Button>
  );
}

function SecretField({ value, label }: { value: string; label: string }) {
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  return (
    <div className="bg-muted/50 rounded-md px-3 py-2">
      <span className="text-xs text-muted-foreground block mb-1">{label}</span>
      <div className="flex items-center gap-2">
        <code className="text-sm text-foreground font-mono flex-1 truncate">
          {visible ? value : "•".repeat(40)}
        </code>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-muted-foreground hover:text-foreground shrink-0"
          onClick={() => setVisible(!visible)}
          title={visible ? "Hide" : "Reveal"}
        >
          {visible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-muted-foreground hover:text-foreground shrink-0"
          onClick={async () => {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
        </Button>
      </div>
    </div>
  );
}

function MaskedCopyBlock({ label, content, maskedContent, emailSubject }: {
  label: string;
  content: string;
  maskedContent: string;
  emailSubject?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [revealed, setRevealed] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleEmail() {
    const subject = encodeURIComponent(emailSubject || label);
    const body = encodeURIComponent(content);
    window.open(`mailto:?subject=${subject}&body=${body}`, "_blank");
  }

  return (
    <Card className="bg-card">
      <CardContent className="p-0">
        <div className="flex items-center justify-between px-4 py-2 border-b border-border">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {label}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-muted-foreground hover:text-foreground"
              onClick={() => setRevealed(!revealed)}
              title={revealed ? "Hide secret" : "Reveal secret"}
            >
              {revealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </Button>
            {emailSubject && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-muted-foreground hover:text-foreground"
                onClick={handleEmail}
                title="Email"
              >
                <Mail className="w-3.5 h-3.5 mr-1" />
                <span className="text-xs">Email</span>
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-muted-foreground hover:text-foreground"
              onClick={handleCopy}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                  <span className="text-xs text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 mr-1" />
                  <span className="text-xs">Copy</span>
                </>
              )}
            </Button>
          </div>
        </div>
        <pre className="p-4 text-sm text-foreground font-mono overflow-x-auto whitespace-pre-wrap break-all">
          {revealed ? content : maskedContent}
        </pre>
      </CardContent>
    </Card>
  );
}

function StepNumber({ n }: { n: number }) {
  return (
    <div className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center shrink-0">
      {n}
    </div>
  );
}

export function HowToConnect() {
  const { accountId } = useParams<{ accountId: string }>();
  const navigate = useNavigate();
  const [keys, setKeys] = useState<AccessKeysResponse | null>(null);
  
  const [allCopied, setAllCopied] = useState(false);

  // Poll environment status (fast when deploying)
  const envQuery = useQuery({
    queryKey: ["env-status", accountId],
    queryFn: () => api.listEnvironments().then(
      (envs) => envs.find((e) => e.accountId === accountId) || null
    ),
    refetchInterval: (query) => {
      const env = query.state.data;
      if (!env) return 5000;
      if (env.status === "READY") return false; // stop polling
      return 5000; // poll every 5s while deploying
    },
  });

  const envStatus = envQuery.data;
  const isReady = envStatus?.status === "READY";
  const isDeploying = envStatus && envStatus.status !== "READY" && envStatus.status !== "ERROR" && envStatus.status !== "SUSPENDED" && envStatus.status !== "PENDING_CLOSURE";

  const { data: instructions, isLoading: instructionsLoading, isError, error, refetch: refetchInstructions } = useQuery({
    queryKey: ["connect", accountId],
    queryFn: () => api.getConnectInstructions(accountId!),
    enabled: !!accountId && isReady,
  });

  // Auto-refresh instructions when status transitions to READY
  const [wasDeploying, setWasDeploying] = useState(false);
  useEffect(() => {
    if (isDeploying) setWasDeploying(true);
    if (wasDeploying && isReady) {
      refetchInstructions();
      setWasDeploying(false);
    }
  }, [isDeploying, isReady, wasDeploying, refetchInstructions]);

  const isLoading = instructionsLoading && isReady;

  const mutation = useMutation({
    mutationFn: () => api.generateAccessKeys(accountId!),
    onSuccess: (data) => setKeys(data),
  });

  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [emailAddress, setEmailAddress] = useState("");
  const [emailResult, setEmailResult] = useState<{ link: string; emailSent: boolean; emailError?: string; recipientEmail?: string } | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  // Console credentials state
  const [consolePassword, setConsolePassword] = useState<string | null>(null);
  const [consolePasswordVisible, setConsolePasswordVisible] = useState(false);
  const [consolePasswordLoading, setConsolePasswordLoading] = useState(false);
  const [consoleCopied, setConsoleCopied] = useState<Record<string, boolean>>({});

  async function handleRevealConsolePassword() {
    if (consolePassword) {
      setConsolePasswordVisible(!consolePasswordVisible);
      return;
    }
    if (!accountId) return;
    setConsolePasswordLoading(true);
    try {
      const creds = await api.getConsoleCredentials(accountId);
      setConsolePassword(creds.password);
      setConsolePasswordVisible(true);
    } catch {
      // No credentials available
    } finally {
      setConsolePasswordLoading(false);
    }
  }

  async function copyConsoleField(field: string, value: string) {
    await navigator.clipboard.writeText(value);
    setConsoleCopied(prev => ({ ...prev, [field]: true }));
    setTimeout(() => setConsoleCopied(prev => ({ ...prev, [field]: false })), 2000);
  }

  async function copyAllConsoleCredentials() {
    if (!instructions?.ownerEmail || !envStatus?.consoleUrl) return;
    let password = consolePassword;
    if (!password) {
      try {
        setConsolePasswordLoading(true);
        const creds = await api.getConsoleCredentials(accountId!);
        password = creds.password;
        setConsolePassword(password);
        setConsolePasswordVisible(true);
      } catch {
        return;
      } finally {
        setConsolePasswordLoading(false);
      }
    }
    const text = [
      `FastStart Solo Console`,
      `${"\u2500".repeat(30)}`,
      `URL:      ${envStatus.consoleUrl}`,
      `Email:    ${instructions.ownerEmail}`,
      `Password: ${password}`,
    ].join("\n");
    await navigator.clipboard.writeText(text);
    setConsoleCopied(prev => ({ ...prev, all: true }));
    setTimeout(() => setConsoleCopied(prev => ({ ...prev, all: false })), 2000);
  }

  const emailMutation = useMutation({
    mutationFn: () => api.emailKeys(accountId!, emailAddress),
    onSuccess: (data) => {
      setEmailResult(data);
    },
  });

  function getConfigureScript() {
    if (!keys) return "";
    return [
      `aws configure set aws_access_key_id ${keys.accessKeyId} --profile ${keys.profileName}`,
      `aws configure set aws_secret_access_key ${keys.secretAccessKey} --profile ${keys.profileName}`,
      `aws configure set region us-east-1 --profile ${keys.profileName}`,
      `aws configure set output json --profile ${keys.profileName}`,
      ``,
      `echo "✅ Profile '${keys.profileName}' configured"`,
    ].join("\n");
  }

  function getCredentialsFileBlock() {
    if (!keys) return "";
    return keys.cliConfig;
  }

  function getMaskedCredentialsFileBlock() {
    if (!keys) return "";
    return keys.cliConfig.replace(keys.secretAccessKey, "••••••••••••••••••••••••••••••••••••••••");
  }

  function getMaskedConfigureScript() {
    if (!keys) return "";
    return getConfigureScript().replace(keys.secretAccessKey, "••••••••••••••••••••••••••••••••••••••••");
  }

  function getSsmCommand() {
    if (!keys || !instructions) return "";
    const ssmBase = instructions.ssmCommand;
    if (ssmBase.startsWith("#")) return ssmBase;
    return `${ssmBase} --profile ${keys.profileName}`;
  }

  function getVerifyCommand() {
    if (!keys) return "";
    return `aws sts get-caller-identity --profile ${keys.profileName}`;
  }

  function getAllInstructions() {
    if (!instructions) return "";
    const parts = [
      `FastStart Environment: ${instructions.accountName} (${instructions.accountId})`,
      `${"=".repeat(60)}`,
    ];
    if (keys) {
      parts.push("", "## Step 1: Configure AWS CLI", "", getConfigureScript());
      parts.push("", "## Step 2: Verify", "", getVerifyCommand());
      parts.push("", "## Step 3: Connect to Instance", "", getSsmCommand());
    }
    parts.push(
      "", "## Identity Center Portal", instructions.portalUrl,
      "", "## AWS Console URL", instructions.consoleUrl,
    );
    if (envStatus?.consoleUrl && instructions.ownerEmail) {
      parts.push(
        "", "## Solo Console",
        `URL:      ${envStatus.consoleUrl}`,
        `Email:    ${instructions.ownerEmail}`,
        `Password: ${consolePassword || "(reveal password first)"}`,
      );
    }
    return parts.join("\n");
  }

  async function copyAll() {
    await navigator.clipboard.writeText(getAllInstructions());
    setAllCopied(true);
    setTimeout(() => setAllCopied(false), 2000);
  }



  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-20">
        <AlertTriangle className="w-10 h-10 text-destructive mx-auto mb-3" />
        <p className="text-destructive font-medium">Failed to load connection instructions</p>
        <p className="text-muted-foreground text-sm mt-1">{(error as Error)?.message}</p>
        <Button variant="link" className="mt-4 text-primary" onClick={() => navigate("/")}>
          Back to dashboard
        </Button>
      </div>
    );
  }

  if (!instructions) return null;

  const acctLabel = `${instructions.accountName} (${instructions.accountId})`;

  return (
    <div>
      <Button
        variant="ghost"
        className="text-muted-foreground hover:text-foreground mb-6"
        onClick={() => navigate("/")}
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Environments
      </Button>

      <div className="max-w-3xl mx-auto">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
              <Terminal className="w-7 h-7 text-primary" />
              How to Connect
            </h1>
            <p className="text-muted-foreground mt-1">
              {instructions.accountName}{" "}
              <span className="font-mono">({instructions.accountId})</span>
            </p>
          </div>
          {keys && (
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => { if (!emailAddress && instructions?.ownerEmail) setEmailAddress(instructions.ownerEmail); setShowEmailDialog(true); }}>
                <Mail className="w-4 h-4 mr-2" />
                Send via Email
              </Button>
              <Button variant="outline" onClick={copyAll}>
                {allCopied ? (
                  <>
                    <Check className="w-4 h-4 mr-2 text-emerald-400" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy All
                  </>
                )}
              </Button>
            </div>
          )}
        </div>

        {/* ── Deploying Status ── */}
        {isDeploying && envStatus && (
          <Card className="mb-6 border-primary/30 bg-primary/5">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
                <h2 className="text-lg font-semibold text-foreground">Environment Deploying</h2>
                <StatusBadge status={envStatus.status} />
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Account</span>
                  <span className="font-mono text-foreground">{envStatus.accountName} ({envStatus.accountId})</span>
                </div>
                {envStatus.instanceId && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Instance</span>
                    <span className="font-mono text-foreground">{envStatus.instanceId}</span>
                  </div>
                )}
                {envStatus.ssmStatus && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">SSM Agent</span>
                    <span className={envStatus.ssmStatus === "Online" ? "text-emerald-400" : "text-amber-400"}>{envStatus.ssmStatus}</span>
                  </div>
                )}
                {envStatus.stackStatus && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Stack</span>
                    <span className="font-mono text-foreground">{envStatus.stackStatus}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Owner</span>
                  <span className="text-foreground">{envStatus.ownerEmail}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-4 pt-3 border-t border-primary/10">
                <RefreshCw className="w-3.5 h-3.5 text-muted-foreground animate-spin" style={{ animationDuration: "3s" }} />
                <span className="text-xs text-muted-foreground">Auto-refreshing every 5 seconds...</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Solo Console ── */}
        {instructions.ownerEmail && (
          <Card className="mb-6 border-violet-500/30 bg-violet-500/5">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <Monitor className="w-5 h-5 text-violet-400" />
                <h2 className="text-lg font-semibold text-violet-400">Solo Console</h2>
              </div>
              <div className="space-y-3">
                <div>
                  <span className="text-xs text-muted-foreground block mb-1">Console URL</span>
                  <div className="flex items-center gap-2">
                    <a
                      href={envStatus?.consoleUrl || ""}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-violet-400 hover:text-violet-300 font-mono flex items-center gap-1.5"
                    >
                      <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                      {envStatus?.consoleUrl || ""}
                    </a>
                    <CopyInlineButton value={envStatus?.consoleUrl || ""} />
                  </div>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block mb-1">Login Email</span>
                  <div className="flex items-center gap-2">
                    <code className="text-sm text-foreground font-mono">{instructions.ownerEmail}</code>
                    <CopyInlineButton value={instructions.ownerEmail} label="Copy" />
                  </div>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block mb-1">Password</span>
                  <div className="flex items-center gap-2">
                    <code className="text-sm text-foreground font-mono">
                      {consolePasswordVisible && consolePassword ? consolePassword : "••••••••••••••••"}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-muted-foreground hover:text-foreground shrink-0"
                      onClick={handleRevealConsolePassword}
                      disabled={consolePasswordLoading}
                    >
                      {consolePasswordLoading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : consolePasswordVisible ? (
                        <EyeOff className="w-3.5 h-3.5" />
                      ) : (
                        <Eye className="w-3.5 h-3.5" />
                      )}
                    </Button>
                    {consolePassword && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-muted-foreground hover:text-foreground shrink-0"
                        onClick={() => copyConsoleField("password", consolePassword)}
                      >
                        {consoleCopied.password ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              <div className="pt-3 mt-1 border-t border-violet-500/20">
                <Button
                  variant="ghost"
                  className="w-full bg-violet-500/20 hover:bg-violet-500/30 text-violet-300"
                  onClick={copyAllConsoleCredentials}
                  disabled={consolePasswordLoading}
                >
                  {consolePasswordLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" />
                  ) : consoleCopied.all ? (
                    <><Check className="w-4 h-4 mr-2 text-emerald-400" /><span className="text-emerald-400">Copied!</span></>
                  ) : (
                    <><Copy className="w-4 h-4 mr-2" />Copy Console Link with Credentials</>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Solo Mission Control ── */}
        <Card className="mb-6 border-blue-500/30 bg-blue-500/5">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <Monitor className="w-5 h-5 text-blue-400" />
              <h2 className="text-lg font-semibold text-blue-400">Solo Mission Control</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              Manage this environment with the Solo Mission Control dashboard — view instance status, pipelines, costs, and generate credentials.
            </p>
            <a
              href={`https://d2bb25pqbi7pou.cloudfront.net/connect?account=${accountId}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button className="w-full bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 gap-2">
                <ExternalLink className="w-4 h-4" />
                Open Solo Mission Control
              </Button>
            </a>
          </CardContent>
        </Card>

        {/* ── Account Connection Setup ── */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Globe className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Account Connection Setup</h2>
          </div>

          {!keys ? (
            /* Pre-generation state */
            <Card className="bg-card">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <Key className="w-6 h-6 text-muted-foreground mt-1 shrink-0" />
                  <div className="flex-1">
                    <h3 className="text-base font-semibold text-foreground mb-1">
                      Generate AWS Credentials
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Create IAM access keys for the <code className="text-foreground bg-muted px-1 rounded">admin</code> user
                      in this account. You'll get a script to configure your AWS CLI and connect to the instance.
                    </p>
                    <Button
                      onClick={() => mutation.mutate()}
                      disabled={mutation.isPending}
                    >
                      {mutation.isPending ? (
                        <>
                          <Loader className="w-4 h-4 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Key className="w-4 h-4 mr-2" />
                          Generate Access Keys
                        </>
                      )}
                    </Button>
                    {mutation.isError && (
                      <p className="text-sm text-destructive mt-3">
                        {(mutation.error as Error)?.message || "Failed to generate keys"}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            /* Post-generation state — full guided flow */
            <div className="space-y-4">
              {/* Warning banner */}
              <Card className="bg-card border-amber-500/20">
                <CardContent className="px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-amber-400" />
                      <span className="text-sm font-medium text-amber-400">
                        Keys generated — copy or send via email before leaving this page
                      </span>
                    </div>

                  </div>
                </CardContent>
              </Card>

              {/* Email Dialog */}
              {showEmailDialog && !emailResult && (
                <Card className="bg-card border-primary/20">
                  <CardContent className="p-4">
                    <h3 className="text-sm font-semibold text-foreground mb-2">Send Credentials via Secure Link</h3>
                    <p className="text-xs text-muted-foreground mb-3">
                      Generates a one-time link that expires after viewing. The recipient must log in to the dashboard first.
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="email"
                        placeholder="recipient@example.com"
                        value={emailAddress}
                        onChange={(e) => setEmailAddress(e.target.value)}
                        className="flex-1 px-3 py-2 text-sm bg-background border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                      <Button
                        size="sm"
                        onClick={() => emailMutation.mutate()}
                        disabled={!emailAddress || emailMutation.isPending}
                      >
                        {emailMutation.isPending ? (
                          <Loader className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Mail className="w-4 h-4 mr-2" />
                            Send
                          </>
                        )}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setShowEmailDialog(false)}>
                        Cancel
                      </Button>
                    </div>
                    {emailMutation.isError && (
                      <p className="text-xs text-destructive mt-2">
                        {(emailMutation.error as Error)?.message || "Failed to send"}
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Email Result */}
              {emailResult && (
                <Card className={`bg-card ${emailResult.emailSent ? "border-emerald-500/20" : "border-amber-500/20"}`}>
                  <CardContent className="p-4">
                    {emailResult.emailSent ? (
                      <div className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm font-semibold text-emerald-400">Email sent!</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            One-time link sent to <strong>{emailResult.recipientEmail}</strong>.
                            They must log in to the dashboard to view it.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-start gap-3 mb-3">
                          <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-sm font-semibold text-amber-400">Email not sent (SES not configured)</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {emailResult.emailError || "SES identity not verified"}. Copy the one-time link below and share it manually:
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 bg-muted/50 rounded-md px-3 py-2">
                          <code className="text-xs text-foreground font-mono flex-1 truncate">
                            {emailResult.link}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 shrink-0"
                            onClick={async () => {
                              await navigator.clipboard.writeText(emailResult.link);
                              setLinkCopied(true);
                              setTimeout(() => setLinkCopied(false), 2000);
                            }}
                          >
                            {linkCopied ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          🔒 Link is one-time use and expires in 24 hours. Recipient must be logged in.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Credentials (collapsed by default) */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/50 rounded-md px-3 py-2">
                  <span className="text-xs text-muted-foreground block mb-1">Access Key ID</span>
                  <div className="flex items-center gap-2">
                    <code className="text-sm text-foreground font-mono flex-1 truncate">
                      {keys.accessKeyId}
                    </code>
                    <CopyInlineButton value={keys.accessKeyId} />
                  </div>
                </div>
                <SecretField value={keys.secretAccessKey} label="Secret Access Key" />
              </div>

              {/* Step 1: Configure */}
              <Card className="bg-card">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <StepNumber n={1} />
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">Configure AWS CLI</h3>
                      <p className="text-xs text-muted-foreground">Run this to set up a named profile</p>
                    </div>
                  </div>
                  <MaskedCopyBlock
                    label={`Sets up profile "${keys.profileName}"`}
                    content={getConfigureScript()}
                    maskedContent={getMaskedConfigureScript()}
                    
                  />
                  <div className="mt-3">
                    <p className="text-xs text-muted-foreground mb-2">
                      Or manually add to <code className="text-foreground bg-muted px-1 rounded">~/.aws/credentials</code>:
                    </p>
                    <MaskedCopyBlock
                      label="credentials file entry"
                      content={getCredentialsFileBlock()}
                      maskedContent={getMaskedCredentialsFileBlock()}
                      
                    />
                  </div>
                </CardContent>
              </Card>

            </div>
          )}
        </div>

        {/* ── Instance Connection ── */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Server className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Instance Connection</h2>
          </div>
          <div className="space-y-4">
            <CopyBlock
              label="Start SSM session"
              content={keys ? getSsmCommand() : instructions.ssmCommand}
            />
            <Card className="bg-primary/5 border-primary/10">
              <CardContent className="px-4 py-3">
                <p className="text-xs text-foreground font-medium mb-2">Once connected:</p>
                <pre className="text-xs text-muted-foreground font-mono whitespace-pre-wrap">{`You land as ec2-user with a welcome screen.

Available commands:
  openclaw tui    — Launch OpenClaw TUI
  openclaw status — Check gateway status`}</pre>
              </CardContent>
            </Card>
            <p className="text-xs text-muted-foreground">
              Requires the{" "}
              <a
                href="https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-install-plugin.html"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Session Manager plugin
              </a>{" "}
              installed locally.
              {!keys && " Generate access keys above to get a profile-based command."}
            </p>
          </div>
        </div>

        {/* ── Other Access Methods ── */}
        <div className="mb-6">
          <Card className="bg-card/50">
            <CardContent className="p-5 space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">Identity Center Portal</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      const subject = encodeURIComponent(`Identity Center Portal — ${acctLabel}`);
                      const body = encodeURIComponent(`Portal: ${instructions.portalUrl}\nEmail: ${instructions.ownerEmail}`);
                      window.open(`mailto:?subject=${subject}&body=${body}`, "_blank");
                    }}
                  >
                    <Mail className="w-3.5 h-3.5 mr-1" />
                    <span className="text-xs">Email</span>
                  </Button>
                </div>
                <a
                  href={instructions.portalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline font-mono block"
                >
                  {instructions.portalUrl}
                </a>
                {instructions.ownerEmail && (
                  <div className="flex items-center gap-2 bg-muted/50 rounded-md px-3 py-2">
                    <span className="text-xs text-muted-foreground">Login email:</span>
                    <code className="text-sm text-foreground font-mono flex-1">
                      {instructions.ownerEmail}
                    </code>
                    <CopyInlineButton value={instructions.ownerEmail} label="Copy Email" />
                  </div>
                )}
              </div>

              <Separator />

              <div className="space-y-2">
                <span className="text-sm font-semibold text-foreground">AWS Console</span>
                <div className="flex items-center gap-2">
                  <a
                    href={instructions.consoleUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline font-mono"
                  >
                    {instructions.consoleUrl}
                  </a>
                  <CopyInlineButton value={instructions.consoleUrl} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
