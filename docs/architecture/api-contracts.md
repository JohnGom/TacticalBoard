# API Contracts — Authentication, Workspace, and Football Data

## General

- The web client calls only the same-origin TacticalBoard API; the API-Football key is never sent to the browser.
- JSON responses use normalized internal contracts from `packages/contracts`.
- Provider images/crest URLs are intentionally returned as `null` until usage rights are resolved.
- The API binds to `127.0.0.1` by default and is intended for local development; production hosting and operations are not configured.
- Authentication uses a signed `HttpOnly` session cookie. Mutating requests require a same-origin `Origin`; identity is derived from the session and all private resources are owner-scoped.
- Private boards store versioned editable state in PostgreSQL JSONB. Provider player snapshots contain names, shirt numbers, positions, and provider IDs only; no images are stored.

## `GET /api/health`

Returns `{ "status": "ok", "service": "api" }` when the API process is healthy. This endpoint does not verify provider availability.

## Authentication

| Method and path | Behavior |
|---|---|
| `GET /api/auth/providers` | Returns whether email/password and Google sign-in are available. |
| `GET /api/auth/me` | Returns the current user or `{ "user": null }`. |
| `POST /api/auth/register` | Creates an account and session; requires display name, email, and password (12–128 characters). |
| `POST /api/auth/login` | Verifies email/password and creates a session. |
| `POST /api/auth/logout` | Invalidates the current session and clears the cookie. |
| `GET /api/auth/google/start` | Starts Google OAuth when configured; otherwise returns 503. |
| `GET /api/auth/google/callback` | Verifies the OAuth state/nonce and creates or signs into an account. |

Registration and login have per-route rate limits. Authentication failures use safe messages and do not reveal stored password hashes. Configure `SESSION_COOKIE_SECRET` for stable local sessions and Google client credentials to enable Google sign-in; see [Local Development](../operations/local-development.md).

## Private workspace

All workspace endpoints require a valid session and scope each lookup/mutation to the session owner. A resource belonging to another user returns 404.

| Method and path | Behavior |
|---|---|
| `GET /api/boards` | Lists the current user's saved board summaries. |
| `POST /api/boards` | Creates a board from `{ "title", "state" }`; initial revision is 1. |
| `GET /api/boards/{boardId}` | Restores title, revision, and editable state. |
| `PATCH /api/boards/{boardId}` | Updates title and/or state; body must include the revision last read by the client. |
| `POST /api/boards/{boardId}/duplicate` | Creates an owner-scoped copy. |
| `DELETE /api/boards/{boardId}` | Deletes the board. |
| `GET /api/teams` | Lists the current user's custom teams. |
| `POST /api/teams` | Creates a custom team and roster. |
| `GET /api/teams/{teamId}` | Loads a custom team and roster. |
| `PATCH /api/teams/{teamId}` | Updates the custom team. |
| `DELETE /api/teams/{teamId}` | Deletes the team; board player snapshots remain understandable. |

Board updates increment the revision atomically. A stale revision returns `409` and leaves the newer version unchanged. A board's state includes schema version, team/player snapshots, normalized player coordinates, formation, pitch view, and bench. Custom-team references must belong to the signed-in user.

## `GET /api/football/teams?query={text}`

Searches API-Football teams by name. `query` is required, 3–80 characters. The provider may return multiple similarly named clubs or national teams; the client displays country and team kind for selection.

Response:

```json
{
  "teams": [
    {
      "id": "api-football:541",
      "name": "Real Madrid",
      "country": "Spain",
      "kind": "club",
      "crestUrl": null,
      "externalReference": {
        "provider": "api-football",
        "providerId": "541"
      }
    }
  ]
}
```

Results are cached in process for five minutes. The in-memory team lookup is required by the next route; search the team again if the API process restarts or that cache expires.

## `GET /api/football/teams/{providerTeamId}/squad`

`providerTeamId` must be a numeric API-Football ID returned by a recent search. Calls the season-independent `/players/squads?team={id}` endpoint and returns unique players keyed by provider ID. Duplicate player records are collapsed; shirt number and position are selected from the most frequently observed non-null values. An empty player list means the provider did not return a usable squad.

Response:

```json
{
  "team": {
    "id": "api-football:541",
    "name": "Real Madrid",
    "country": "Spain",
    "kind": "club",
    "crestUrl": null,
    "externalReference": { "provider": "api-football", "providerId": "541" }
  },
  "players": [
    {
      "id": "api-football:99",
      "name": "Player Name",
      "shirtNumber": 10,
      "position": "Midfielder",
      "imageUrl": null,
      "externalReference": { "provider": "api-football", "providerId": "99" }
    }
  ],
  "retrievedAt": "ISO-8601 timestamp"
}
```

Team squads are cached in process for five minutes. API-Football's developer guides recommend local caching for performance and quota management; the adapter uses only a short-lived server cache and does not return image URLs. It also observes API-Football's daily remaining-call header and stops making requests when five calls remain; the guard resets at UTC midnight. Private/local player snapshots (name, shirt number, position, and provider ID) are enabled with user approval. Provider terms do not clearly grant public publication, image use, or long-term hosted retention; confirm those rights before deployment or public release.

## Errors

Error response shape: `{ "error": "code", "message": "safe user-facing message" }`.

| HTTP status | Code | Meaning |
|---|---|---|
| 400 | Fastify validation response | Missing/invalid query or team ID |
| 404 | `team_not_found` | The numeric ID is not in the recent search cache; search again |
| 502 | `provider_unavailable` | Provider/network failure or rejected credentials |
| 502 | `provider_invalid_response` | Unreadable/unexpected upstream payload |
| 403 | `provider_plan_restricted` | Provider plan/season restriction |
| 503 | `provider_not_configured` | `APIFOOTBALL_API_KEY` is absent on the API server |
| 503 | `provider_rate_limited` | Upstream free request limit reached |
| 504 | `provider_timeout` | Upstream request timed out |

Upstream response bodies, API keys, and image URLs are not forwarded in error responses.

## Provider and season limitation

The key was tested against API-Football Free. Current squads were available for the tested clubs and national teams via `/players/squads`. A league query for season 2026 was denied; API-Football returned that the Free plan only allows seasons 2022–2024. Do not add a season-specific statistics/fixtures UI on the assumption that current season data is free.
