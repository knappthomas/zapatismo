/**
 * Minimal types for Strava API responses. Not exposed in public API.
 */

export interface StravaTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  athlete?: { id: number };
}

export interface StravaActivitySummary {
  id: number;
  type: string;
  name: string;
  distance: number;
  moving_time: number;
  start_date: string;
  start_date_local?: string;
}
