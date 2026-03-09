import type {
  Environment,
  EnvironmentDetails,
  ConnectInstructions,
  AccessKeysResponse,
  EmailKeysResponse,
  RevealKeysResponse,
  CreateEnvironmentRequest,
  ConsoleCredentials,
  Signup,
  SignupsResponse,
  RegistryApp,
  KeyUsage,
  BedrockApiKey,
  CreateKeyResponse,
} from "../types";
import { config } from "@/config";
import { getAuthAdapter } from "@/auth/adapter";

const BASE_URL = config.apiBaseUrl;

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem("id_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function request<T>(
  path: string,
  options: RequestInit = {},
  _retried = false,
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
      ...options.headers,
    },
  });

  if (res.status === 401 && !_retried) {
    const newToken = await getAuthAdapter().refreshToken();
    if (newToken) {
      return request<T>(path, options, true);
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      body.message || `Request failed: ${res.status} ${res.statusText}`
    );
  }

  return res.json();
}

export const api = {
  listEnvironments(): Promise<Environment[]> {
    return request<Environment[]>("/environments");
  },

  createEnvironment(data: CreateEnvironmentRequest): Promise<Environment> {
    return request<Environment>("/environments", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  getEnvironment(accountId: string): Promise<EnvironmentDetails> {
    return request<EnvironmentDetails>(`/environments/${accountId}`);
  },

  deleteEnvironment(accountId: string): Promise<void> {
    return request<void>(`/environments/${accountId}`, {
      method: "DELETE",
    });
  },

  emailKeys(accountId: string, recipientEmail: string): Promise<EmailKeysResponse> {
    return request<EmailKeysResponse>(
      `/environments/${accountId}/email-keys`,
      { method: "POST", body: JSON.stringify({ recipientEmail }) }
    );
  },

  revealKeys(token: string): Promise<RevealKeysResponse> {
    return request<RevealKeysResponse>(`/reveal/${token}`);
  },

  generateAccessKeys(accountId: string): Promise<AccessKeysResponse> {
    return request<AccessKeysResponse>(
      `/environments/${accountId}/access-keys`,
      { method: "POST" }
    );
  },

  getConnectInstructions(accountId: string): Promise<ConnectInstructions> {
    return request<ConnectInstructions>(
      `/environments/${accountId}/connect`
    );
  },

  getSsmSession(accountId: string): Promise<{ streamUrl: string; tokenValue: string; sessionId: string; instanceId: string }> {
    return request<{ streamUrl: string; tokenValue: string; sessionId: string; instanceId: string }>(
      `/environments/${accountId}/ssm-url`
    );
  },

  getConsoleCredentials(accountId: string): Promise<ConsoleCredentials> {
    return request<ConsoleCredentials>(
      `/environments/${accountId}/console-credentials`
    );
  },

  getMessages(accountId: string, forceRefresh = false): Promise<MessagesResponse> {
    const qs = forceRefresh ? "?refresh=true" : "";
    return request<MessagesResponse>(`/environments/${accountId}/messages${qs}`);
  },

  renameEnvironment(accountId: string, displayName: string): Promise<{ accountId: string; displayName: string }> {
    return request<{ accountId: string; displayName: string }>(
      `/environments/${accountId}/display-name`,
      { method: "PATCH", body: JSON.stringify({ displayName }) }
    );
  },
};

export interface AgentTarget {
  accountId: string;
  commandId: string;
  instanceId: string;
  status: string;
  error?: string;
}

export interface AgentResult {
  status: string;
  output: string;
  model?: string;
  durationMs?: number;
  tokens?: number;
  error?: string;
}

export const agentApi = {
  send(prompt: string, targets: string[], type: "agent" | "shell" = "agent", runAs?: string): Promise<{ results: AgentTarget[] }> {
    return request<{ results: AgentTarget[] }>("/agent-send", {
      method: "POST",
      body: JSON.stringify({ prompt, targets, type, ...(runAs && { runAs }) }),
    });
  },

  getResult(accountId: string, commandId: string, instanceId: string): Promise<AgentResult> {
    return request<AgentResult>(`/agent-result/${accountId}/${commandId}/${instanceId}`);
  },

  getHistory(accountId: string): Promise<{ history: AgentHistoryEntry[] }> {
    return request<{ history: AgentHistoryEntry[] }>(`/agent-history/${accountId}`);
  },
};

export interface AgentHistoryEntry {
  commandId: string;
  instanceId: string;
  comment: string;
  prompt?: string;
  status: string;
  requestedAt: string;
  output?: string;
  model?: string;
  durationMs?: number;
  tokens?: number;
}

export const insightsApi = {
  getSecurityFindings: () => request<any>("/insights/security"),
  getCosts: () => request<any>("/insights/costs"),
  getTokenUsage: () => request<any>("/insights/tokens"),
  getQuotaStatus: () => request<any>("/insights/quotas"),
  getLitellmOverview: () => request<any>("/insights/litellm"),
  getLitellmKeys: (days = 1) => request<any>(`/insights/litellm/keys?days=${days}`),
  getLitellmModels: (days = 1) => request<any>(`/insights/litellm/models?days=${days}`),
  getLitellmTimeline: (days = 1) => request<any>(`/insights/litellm/timeline?days=${days}`),
};

export interface ChatMessage {
  role: "user" | "assistant";
  text: string;
  timestamp: string;
  sessionId: string;
  model?: string;
  tokens?: number;
  cost?: number;
}

export interface MessagesResponse {
  messages: ChatMessage[];
  cachedAt?: string;
  fromCache: boolean;
}

export interface PipelineCommit {
  id: string;
  message: string;
  author: string;
  date: string;
}

export interface PipelineStage {
  name: string;
  status: string;
  lastUpdated?: string;
}

export interface PipelineInfo {
  name: string;
  repo: string;
  status: string;
  stages: PipelineStage[];
  lastExecutionTime?: string;
  commits: PipelineCommit[];
}

export interface PipelinesResponse {
  pipelines: PipelineInfo[];
  reposWithoutPipeline: string[];
}

export const pipelinesApi = {
  list(): Promise<PipelinesResponse> {
    return request<PipelinesResponse>("/pipelines");
  },
};

// --- Prompts ---
export interface Prompt {
  promptId: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  template: string;
  variables: unknown[];
  icon: string;
  scope: "base" | "account" | "shared";
  accountId?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export const prompts = {
  list: (scope?: string) => request<Prompt[]>(`/prompts${scope ? `?scope=${scope}` : ""}`),
  get: (id: string) => request<Prompt>(`/prompts/${id}`),
  save: (data: Partial<Prompt> & { title: string; template: string }) =>
    data.promptId
      ? request<Prompt>(`/prompts/${data.promptId}`, { method: "PUT", body: JSON.stringify(data) })
      : request<Prompt>("/prompts", { method: "POST", body: JSON.stringify(data) }),
  delete: (id: string) => request<void>(`/prompts/${id}`, { method: "DELETE" }),
};

// --- Prompt Postfix Settings ---
export const promptSettings = {
  getPostfix: () => prompts.get("__settings__postfix"),
  savePostfix: (text: string, enabled: boolean) =>
    prompts.save({
      promptId: "__settings__postfix",
      title: "Global Prompt Postfix",
      description: "Appended to all prompts when applied from the terminal picker",
      category: "__settings__",
      tags: [],
      template: text,
      icon: "⚙️",
      scope: "base",
    } as any),
};

export const signupsApi = {
  list(status?: string): Promise<SignupsResponse> {
    const qs = status ? `?status=${encodeURIComponent(status)}` : "";
    return request<SignupsResponse>(`/signups${qs}`);
  },
  updateStatus(id: string, status: string): Promise<Signup> {
    return request<Signup>(`/signups/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  },
  approve(id: string): Promise<any> {
    return request(`/signups/${id}/approve`, { method: "POST" });
  },
  delete(id: string): Promise<any> {
    return request(`/signups/${id}`, { method: "DELETE" });
  },
  templateApprove(id: string): Promise<{ ok: boolean; templateUrl: string; consoleUrl: string; signupId: string }> {
    return request(`/signups/${id}/template`);
  },
  check(id: string): Promise<{ ok?: boolean; conflict?: boolean; existingAccountId?: string; existingAccountName?: string; existingStatus?: string }> {
    return request(`/signups/${id}/check`);
  },
};

export const appsApi = {
  list(): Promise<RegistryApp[]> {
    return request<RegistryApp[]>("/apps");
  },
};

export const keysApi = {
  list(): Promise<{ keys: BedrockApiKey[] }> {
    return request<{ keys: BedrockApiKey[] }>("/keys");
  },
  create(email: string, description?: string, expirationDays?: number): Promise<CreateKeyResponse> {
    return request<CreateKeyResponse>("/keys", {
      method: "POST",
      body: JSON.stringify({ email, description, expirationDays }),
    });
  },
  deactivate(keyId: string): Promise<{ ok: boolean }> {
    return request<{ ok: boolean }>(`/keys/${keyId}/deactivate`, { method: "PATCH" });
  },
  activate(keyId: string): Promise<{ ok: boolean }> {
    return request<{ ok: boolean }>(`/keys/${keyId}/activate`, { method: "PATCH" });
  },
  revoke(keyId: string): Promise<{ ok: boolean }> {
    return request<{ ok: boolean }>(`/keys/${keyId}`, { method: "DELETE" });
  },
  usage(keyId: string, days?: number): Promise<KeyUsage> {
    const qs = days ? `?days=${days}` : "";
    return request<KeyUsage>(`/keys/${keyId}/usage${qs}`);
  },
};

export const budgetsApi = {
  listKeys: () => request<any[]>("/litellm/keys"),
  updateBudget: (token: string, maxBudget: number | null) =>
    request<any>(`/litellm/keys/${token}/budget`, {
      method: "PATCH",
      body: JSON.stringify({ maxBudget }),
    }),
};
