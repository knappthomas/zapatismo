# Strava API as Workout Data Source

## Summary

Zapatismo uses the **Strava API** to obtain workout data instead of a native iOS app reading from HealthKit. The backend integrates with Strava so that running and walking activities can be imported, normalized, and stored in the local database.

## Rationale

- **Single integration point:** Workout data is fetched server-side via the Strava API; no device-specific app (e.g. iOS/HealthKit) is required.
- **Wide adoption:** Many users already record activities in Strava (phone, watch, or other devices); syncing from Strava avoids maintaining a separate mobile app.
- **REST API:** Strava provides a well-documented REST API for activities, suitable for backend-only integration.

## Integration Principles

- **Backend-only:** All Strava API calls and OAuth flows are implemented in the backend. The frontend never receives Strava API keys or talks to Strava directly.
- **User linkage:** Users connect their Strava account (e.g. OAuth 2.0); the backend stores the necessary tokens (e.g. refresh token) to fetch activities on their behalf.
- **Idempotent import:** Activities are imported by Strava activity ID (or equivalent) so that re-syncs or duplicate fetches do not create duplicate workouts in the database.
- **Activity types:** Focus on running and walking activities; filter or map Strava activity types to the internal workout model as needed.

## Authentication and Activity Import (Summary)

Strava uses **OAuth 2.0** only; there is no “API key” for user data.

- **App registration:** Register the app in the [Strava developer portal](https://developers.strava.com/docs/getting-started/#account); obtain **Client ID** and **Client Secret**. Store both in **environment variables only**; never in the frontend or Settings UI.
- **User connection:** Redirect user to Strava’s authorize URL with `client_id`, `redirect_uri`, `response_type=code`, and scope **`activity:read_all`** (required to list all activities including “Only Me”). On callback, backend exchanges the `code` for tokens via `POST https://www.strava.com/oauth/token` (client_id, client_secret, code, grant_type=authorization_code). Store **refresh_token** and **access_token** (and **expires_at**) per user server-side (e.g. in the database). Access tokens expire (~6 hours); refresh via the same token endpoint with `grant_type=refresh_token` and the current refresh_token; persist the new refresh_token from the response.
- **List activities:** `GET /athlete/activities` with query params `after` and `before` (epoch timestamps), plus pagination. Use `Authorization: Bearer <access_token>`. Filter to running/walking; map Strava activity types to internal WorkoutType; import idempotently by Strava activity ID.
- **Disconnect:** `POST https://www.strava.com/oauth/deauthorize` with the access_token revokes the app for that athlete.

## Implementation Notes (for future work)

- **OAuth:** Use Strava’s OAuth 2.0 flow as above; store access/refresh tokens securely per user; refresh before API calls when expired.
- **Endpoints:** Use Strava’s [API documentation](https://developers.strava.com/docs/reference/) for athlete activities (e.g. list activities, get activity by id). Map fields (distance, duration, start time, type, etc.) to the Zapatismo workout schema.
- **Rate limits:** Respect Strava rate limits; implement backoff or queuing if necessary for bulk or periodic sync.
- **Secrets:** Strava client ID and client secret must be in environment variables only; never committed to the repository.

## References

- [Strava API – Getting Started](https://developers.strava.com/docs/getting-started/)
- [Strava API – OAuth](https://developers.strava.com/docs/oauth/)
- [Strava API – Activities](https://developers.strava.com/docs/reference/#api-Activities)

---

*The original plan was to sync Apple Workout data via a custom iOS app (HealthKit). The project has switched to the Strava API for workout data instead. The previous iOS/HealthKit research is archived in [research-apple-workout.md](./research-apple-workout.md) for reference only.*
