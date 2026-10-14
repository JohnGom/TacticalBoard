# API Contracts — Local Football Data Integration

## General

- The web client calls only the same-origin TacticalBoard API; the API-Football key is never sent to the browser.
- JSON responses use normalized internal contracts from `packages/contracts`.
- Provider images/crest URLs are intentionally returned as `null` until usage rights are resolved.
- Current implementation is local-development scope. The API binds to `127.0.0.1` by default and has no user authentication. Do not expose it publicly without authentication, quotas, and authorization.

## `GET /api/health`

Returns `{ "status": "ok", "service": "api" }` when the API process is healthy. This endpoint does not verify provider availability.

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

Team squads are cached in process for five minutes. The adapter observes API-Football's daily remaining-call header and stops making requests when five calls remain; the guard resets at UTC midnight. This is a temporary quota optimization, not persistent board storage or permission for long-term provider-data retention.

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
