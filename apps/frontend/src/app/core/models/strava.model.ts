/** Response from GET /api/strava/authorize-url */
export interface AuthorizeUrlResponse {
  url: string;
}

/** Response from GET /api/strava/status */
export interface StravaStatus {
  connected: boolean;
}

/** Response from GET /api/strava/last-sync */
export interface LastSyncResponse {
  lastSyncAt: string | null;
}

/** Request body for POST /api/strava/sync */
export interface SyncRequest {
  fromDate: string; // ISO date e.g. '2025-02-01'
}

/** Response from POST /api/strava/sync */
export interface SyncResponse {
  imported: number;
  skipped?: number;
  message?: string;
}
