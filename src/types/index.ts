export type EnvironmentStatus = string;

export interface PipelineStep {
  id: string;
  label: string;
  status: "complete" | "in-progress" | "pending" | "error";
  detail?: string;
  timestamp?: string;
  durationMs?: number;
}

export interface PipelineSummary {
  completedSteps: number;
  totalSteps: number;
  currentStep: string;
}

export interface Environment {
  accountId: string;
  accountName: string;
  displayName?: string | null;
  accountEmail: string;
  status: EnvironmentStatus;
  instanceId?: string;
  publicIp?: string;
  ssmStatus?: string;
  ownerEmail: string;
  openclawVersion?: string;
  model?: string;
  createdDate: string;
  stackStatus?: string;
  errorMessage?: string;
  pipelineSummary?: PipelineSummary;
  consoleUrl?: string;
  consoleEmail?: string;
}

export interface EnvironmentDetails extends Environment {
  setupLog: SetupLogEntry[];
  pipelineSteps?: PipelineStep[];
  stackStatus: string;
  bedrockStatus?: string;
  gatewayUrl?: string;
  lambdaLogs?: string[];
}

export interface SetupLogEntry {
  timestamp: string;
  message: string;
  status: "complete" | "pending" | "error";
}

export interface ConnectInstructions {
  accountId: string;
  accountName: string;
  displayName?: string | null;
  cliCommands: string;
  profileScript: string;
  ssmCommand: string;
  ssmNotes: string;
  ownerEmail: string;
  portalUrl: string;
  consoleUrl: string;
}

export interface CreateEnvironmentRequest {
  accountName: string;
  displayName?: string | null;
  ownerEmail: string;
}

export interface AccessKeysResponse {
  accessKeyId: string;
  secretAccessKey: string;
  userName: string;
  accountId: string;
  accountName: string;
  displayName?: string | null;
  profileName: string;
  cliConfig: string;
}

export interface EmailKeysResponse {
  link: string;
  token: string;
  emailSent: boolean;
  emailError?: string;
  recipientEmail: string;
  accountName: string;
  displayName?: string | null;
}

export interface RevealKeysResponse {
  accessKeyId: string;
  secretAccessKey: string;
  accountId: string;
  accountName: string;
  displayName?: string | null;
  profileName: string;
  cliConfig: string;
}

export interface ConsoleCredentials {
  email: string;
  password: string;
  consoleUrl: string;
  accountId: string;
}

export type SignupStatus = "new" | "contacted" | "approved" | "rejected" | "ignored";

export interface Signup {
  signupId: string;
  fullName: string;
  firstName?: string;
  lastName?: string;
  email: string;
  role?: string;
  team?: string;
  teamSize?: string;
  accountAccess?: string;
  accountAccessType?: string;
  useCases?: string[];
  useCaseOther?: string;
  orgId?: string;
  organization?: string;
  notes?: string;
  status: SignupStatus;
  createdAt: string;
  updatedAt?: string;
  accountId?: string;
}

export interface SignupsResponse {
  signups: Signup[];
  total: number;
}

export interface BedrockApiKey {
  keyId: string;
  email: string;
  description: string;
  iamUsername: string;
  serviceSpecificCredentialId: string;
  serviceUserName: string;
  status: "Active" | "Inactive" | "Revoked";
  createdAt: string;
  expiresAt?: string;
  expirationDays?: number;
  revokedAt?: string;
}

export interface CreateKeyResponse extends BedrockApiKey {
  apiKey: string;
}

export interface RegistryApp {
  id: string;
  name: string;
  description: string;
  repo: string;
  status: "active" | "deprecated" | "maintenance";
  category: string;
  cloudfront_id?: string;
  cloudfront_domain?: string;
  s3_bucket?: string;
  api_gw_id?: string;
  lambda_name?: string;
  pipeline_name?: string;
  cognito_client_id?: string;
  created_at: string;
  updated_at: string;
  last_accessed_at?: string;
}

export interface KeyUsage {
  keyId: string;
  email: string;
  iamUsername: string;
  period: string;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalInvocations: number;
  estimatedCost: number;
  byModel: Record<string, {
    inputTokens: number;
    outputTokens: number;
    invocations: number;
    estimatedCost: number;
  }>;
}
