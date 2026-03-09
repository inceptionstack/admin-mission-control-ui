import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Rocket, Loader } from "lucide-react";
import { toast } from "sonner";
import { api } from "../api/client";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CreateEnvironmentRequest } from "../types";

export function CreateEnvironment() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<CreateEnvironmentRequest>({
    accountName: "",
    ownerEmail: "",
    displayName: "",
  });

  const mutation = useMutation({
    mutationFn: api.createEnvironment,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["environments"] });
      navigate(`/env/${data.accountId}`);
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.accountName.trim() || !form.ownerEmail.trim()) return;
    mutation.mutate(form);
  }

  function handleChange(field: keyof CreateEnvironmentRequest, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

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

      <div className="max-w-lg mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <Rocket className="w-7 h-7 text-primary" />
            Create Environment
          </h1>
          <p className="text-muted-foreground mt-1">
            Provision a new FastStart environment
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <Card>
            <CardContent className="p-6 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="accountName">
                  Account Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="accountName"
                  type="text"
                  required
                  value={form.accountName}
                  onChange={(e) => handleChange("accountName", e.target.value)}
                  placeholder="e.g. openclaw-sandbox-acme"
                />
                <p className="text-xs text-muted-foreground">
                  AWS Organizations account name. Must be unique.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ownerEmail">
                  Owner Email <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="ownerEmail"
                  type="email"
                  required
                  value={form.ownerEmail}
                  onChange={(e) => handleChange("ownerEmail", e.target.value)}
                  placeholder="e.g. developer@company.com"
                />
                <p className="text-xs text-muted-foreground">
                  Creates an Identity Center user and assigns AdminAccess.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  type="text"
                  value={form.displayName || ""}
                  onChange={(e) => handleChange("displayName", e.target.value)}
                  placeholder="e.g. John Doe"
                />
                <p className="text-xs text-muted-foreground">
                  Optional display name for the Identity Center user.
                </p>
              </div>

              {mutation.isError && (
                <Card className="border-destructive/30 bg-destructive/5">
                  <CardContent className="p-4 text-sm text-destructive">
                    {(mutation.error as Error)?.message || "Failed to create environment"}
                  </CardContent>
                </Card>
              )}
            </CardContent>

            <CardFooter className="px-6 pb-6 pt-0 gap-3">
              <Button
                type="submit"
                disabled={mutation.isPending}
                className="flex-1"
              >
                {mutation.isPending ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Rocket className="w-4 h-4 mr-2" />
                    Create Environment
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => navigate("/")}
              >
                Cancel
              </Button>
            </CardFooter>
          </Card>
        </form>

        {/* What Happens Next */}
        <Card className="mt-6 bg-card/50">
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold text-foreground mb-3">
              What happens when you create an environment:
            </h3>
            <ol className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="bg-primary/20 text-primary text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shrink-0 mt-0.5">
                  1
                </span>
                Creates a new AWS account in Organizations
              </li>
              <li className="flex items-start gap-2">
                <span className="bg-primary/20 text-primary text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shrink-0 mt-0.5">
                  2
                </span>
                Moves account to Sandbox OU (triggers StackSet deployment)
              </li>
              <li className="flex items-start gap-2">
                <span className="bg-primary/20 text-primary text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shrink-0 mt-0.5">
                  3
                </span>
                Creates Identity Center user with AdminAccess
              </li>
              <li className="flex items-start gap-2">
                <span className="bg-primary/20 text-primary text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shrink-0 mt-0.5">
                  4
                </span>
                Assigns owner access to the account
              </li>
              <li className="flex items-start gap-2">
                <span className="bg-primary/20 text-primary text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shrink-0 mt-0.5">
                  5
                </span>
                Polls until environment is ready (~5-10 min)
              </li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
