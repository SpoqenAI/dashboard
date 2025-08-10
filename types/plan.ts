export interface Plan {
  version: string;
  fingerprint?: string;
  plan: Record<string, unknown>;
}
