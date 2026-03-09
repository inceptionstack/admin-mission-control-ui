import Bootstrap from "./pages/Bootstrap";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "./auth/AuthProvider";
import { AuthGuard } from "./auth/AuthGuard";
import { SsmSessionProvider } from "./context/SsmSessionContext";
import { FavoritesProvider } from "./context/FavoritesContext";
import { Layout } from "./components/Layout";
import { Dashboard } from "./pages/Dashboard";
import { CreateEnvironment } from "./pages/CreateEnvironment";
import { EnvironmentDetails } from "./pages/EnvironmentDetails";
import { HowToConnect } from "./pages/HowToConnect";
import { Sessions } from "./pages/Sessions";
import { AgentBroadcast } from "./pages/AgentBroadcast";
import { Pipelines } from "./pages/Pipelines";
import { Insights } from "./pages/Insights";
import { Prompts } from "./pages/Prompts";
import { Signups } from "./pages/Signups";
import Budgets from "./pages/Budgets";
import { Apps } from "./pages/Apps";
import { ApiKeys } from "./pages/ApiKeys";
import { RevealKeys } from "./pages/RevealKeys";
import Tasks from "./pages/Tasks";
import { TerminalPopup } from "./pages/TerminalPopup";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/reveal/:token" element={<RevealKeys />} />
          <Route path="/terminal-popup" element={<TerminalPopup />} />
          <Route
            path="/*"
            element={
              <AuthProvider>
                <AuthGuard>
                  <FavoritesProvider>
                    <SsmSessionProvider>
                      <Routes>
                        <Route element={<Layout />}>
                          <Route path="/" element={<Dashboard />} />
                          <Route path="/create" element={<CreateEnvironment />} />
                          <Route path="/env/:accountId" element={<EnvironmentDetails />} />
                          <Route path="/connect/:accountId" element={<HowToConnect />} />
                          <Route path="/sessions" element={<Sessions />} />
                        <Route path="/broadcast" element={<AgentBroadcast />} />
                        <Route path="/bootstrap" element={<Bootstrap />} />
              <Route path="/pipelines" element={<Pipelines />} />
                        <Route path="/insights" element={<Insights />} />
                        <Route path="/prompts" element={<Prompts />} />
                        <Route path="/signups" element={<Signups />} />
                        <Route path="/apps" element={<Apps />} />
                        <Route path="/budgets" element={<Budgets />} />
                        <Route path="/tasks" element={<Tasks />} />
                        <Route path="/keys" element={<ApiKeys />} />
                        </Route>
                      </Routes>
                    </SsmSessionProvider>
                  </FavoritesProvider>
                </AuthGuard>
              </AuthProvider>
            }
          />
        </Routes>
      </BrowserRouter>
      <Toaster />
    </QueryClientProvider>
  );
}
