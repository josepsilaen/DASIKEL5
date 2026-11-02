export interface HealthResponse {
  status: string;
  message: string;
  version: string;
  timestamp: string;
}

export type ConnectionStatus = 'checking' | 'connected' | 'disconnected';

export interface HealthCheckResult {
  status: ConnectionStatus;
  data?: HealthResponse;
  error?: string;
  latencyMs?: number;
  checkedAt: Date;
}
