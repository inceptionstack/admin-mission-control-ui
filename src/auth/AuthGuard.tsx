import { type ReactNode } from "react";
import { Rocket, LogIn } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "./useAuth";

export function AuthGuard({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading, login } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Rocket className="w-12 h-12 text-primary animate-bounce mx-auto mb-4" />
          <p className="text-muted-foreground text-lg">Loading Mission Control...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full mx-4 shadow-2xl">
          <CardContent className="p-10 text-center">
            <div className="flex items-center justify-center gap-3 mb-6">
              <Rocket className="w-10 h-10 text-primary" />
              <h1 className="text-2xl font-bold text-foreground">
                Mission Control
              </h1>
            </div>
            <p className="text-muted-foreground mb-8">
              Sign in to manage your environments
            </p>
            <Button
              className="w-full"
              size="lg"
              onClick={login}
            >
              <LogIn className="w-5 h-5 mr-2" />
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
