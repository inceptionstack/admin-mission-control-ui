import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import {
  Key,
  Copy,
  Check,
  AlertTriangle,
  Loader,
  ShieldAlert,
  Eye,
  EyeOff,
  Rocket,
  Terminal,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { RevealKeysResponse } from "../types";

const BASE_URL = "/api";

// Standalone fetch — no auth headers needed
async function revealKeysPublic(token: string): Promise<RevealKeysResponse> {
  const res = await fetch(`${BASE_URL}/reveal/${token}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `Request failed: ${res.status}`);
  }
  return res.json();
}

function SecretField({ value, label }: { value: string; label: string }) {
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  return (
    <div className="bg-muted/50 rounded-md px-3 py-2">
      <span className="text-xs text-muted-foreground block mb-1">{label}</span>
      <div className="flex items-center gap-2">
        <code className="text-sm text-foreground font-mono flex-1 break-all">
          {visible ? value : "•".repeat(40)}
        </code>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-muted-foreground hover:text-foreground shrink-0"
          onClick={() => setVisible(!visible)}
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
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
        </Button>
      </div>
    </div>
  );
}

function CopyField({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="bg-muted/50 rounded-md px-3 py-2">
      <span className="text-xs text-muted-foreground block mb-1">{label}</span>
      <div className="flex items-center gap-2">
        <code className="text-sm text-foreground font-mono flex-1 truncate">{value}</code>
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
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
        </Button>
      </div>
    </div>
  );
}

function CopyBlockSimple({ label, content }: { label: string; content: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Card className="bg-card">
      <CardContent className="p-0">
        <div className="flex items-center justify-between px-4 py-2 border-b border-border">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-muted-foreground hover:text-foreground"
            onClick={async () => {
              await navigator.clipboard.writeText(content);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
          >
            {copied ? (
              <><Check className="w-3.5 h-3.5 mr-1 text-emerald-400" /><span className="text-xs text-emerald-400">Copied</span></>
            ) : (
              <><Copy className="w-3.5 h-3.5 mr-1" /><span className="text-xs">Copy</span></>
            )}
          </Button>
        </div>
        <pre className="p-4 text-sm text-foreground font-mono overflow-x-auto whitespace-pre-wrap break-all">{content}</pre>
      </CardContent>
    </Card>
  );
}

export function RevealKeys() {
  const { token } = useParams<{ token: string }>();
  const [keys, setKeys] = useState<RevealKeysResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    revealKeysPublic(token)
      .then((data) => { setKeys(data); setLoading(false); })
      .catch((err) => { setError(err.message || "Link expired or invalid"); setLoading(false); });
  }, [token]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <Rocket className="w-6 h-6 text-primary" />
          <span className="text-lg font-bold text-foreground">FastStart</span>
          <span className="text-sm text-muted-foreground">Secure Credential Delivery</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader className="w-8 h-8 text-primary animate-spin mb-4" />
            <p className="text-muted-foreground">Retrieving credentials...</p>
          </div>
        )}

        {/* Error / expired */}
        {!loading && (error || !keys) && (
          <div className="text-center py-16">
            <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h1 className="text-xl font-bold text-foreground mb-2">Link Unavailable</h1>
            <p className="text-muted-foreground mb-4 max-w-md mx-auto">
              {error || "This link has expired, was already used, or is invalid."}
            </p>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              One-time credential links can only be viewed once. Contact your administrator
              to generate a new link.
            </p>
          </div>
        )}

        {/* Credentials */}
        {!loading && keys && (
          <div className="space-y-6">
            {/* Title */}
            <div>
              <div className="flex items-center gap-3 mb-1">
                <Key className="w-6 h-6 text-primary" />
                <h1 className="text-xl font-bold text-foreground">
                  Your AWS Credentials
                </h1>
              </div>
              <p className="text-sm text-muted-foreground ml-9">
                Environment: <strong className="text-foreground">{keys.accountName}</strong>{" "}
                <span className="font-mono">({keys.accountId})</span>
              </p>
            </div>

            {/* Warning banner */}
            <Card className="bg-amber-500/5 border-amber-500/20">
              <CardContent className="px-4 py-3">
                <div className="flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-400">
                    This is a one-time link. These credentials will <strong>not</strong> be shown again.
                    Save them now.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Credentials */}
            <div className="space-y-3">
              <CopyField value={keys.accessKeyId} label="Access Key ID" />
              <SecretField value={keys.secretAccessKey} label="Secret Access Key" />
            </div>

            {/* Quick configure */}
            <div>
              <h2 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                <Terminal className="w-4 h-4 text-primary" />
                Quick Setup
              </h2>
              <p className="text-xs text-muted-foreground mb-3">
                Paste this in your terminal to configure the AWS CLI:
              </p>
              <CopyBlockSimple
                label="Run in terminal"
                content={[
                  `aws configure --profile ${keys.profileName} << EOF`,
                  keys.accessKeyId,
                  keys.secretAccessKey,
                  `us-east-1`,
                  `json`,
                  `EOF`,
                ].join("\n")}
              />
            </div>

            {/* Credentials file */}
            <div>
              <p className="text-xs text-muted-foreground mb-3">
                Or add directly to <code className="text-foreground bg-muted px-1 rounded">~/.aws/credentials</code>:
              </p>
              <CopyBlockSimple
                label={`profile: ${keys.profileName}`}
                content={keys.cliConfig}
              />
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-16">
        <div className="max-w-3xl mx-auto px-4 py-4 text-center">
          <p className="text-xs text-muted-foreground">
            FastStart Mission Control — Secure credential delivery
          </p>
        </div>
      </footer>
    </div>
  );
}
