export interface HealthCheckResult {
  name: string;
  healthy: boolean;
  message?: string;
  durationMs: number;
}

export interface IHealthCheck {
  name: string;
  check(): Promise<void>;
}
