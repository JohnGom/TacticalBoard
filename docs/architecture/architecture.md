# Architecture — Proposed Baseline

**Status:** Local web/API, email/password authentication, private PostgreSQL workspaces, and API-Football Free lookup are implemented. Google OAuth is optional and requires credentials. Production hosting and public data/image rights remain undecided.

## System shape

```text
React web client (SVG presentation)
          │ same-origin, versioned JSON API
          ▼
Node.js / TypeScript modular monolith
  ├── authentication and ownership (email/password; optional Google OIDC)
  ├── board/team application services
  ├── provider-neutral football data port (API-Football adapter)
  └── PostgreSQL repository (local Docker Compose for development)
```

The UI is presentation and interaction only. Domain rules—normalized coordinates, formations as initial arrangements, roster substitutions, and board invariants—live outside React components. The API validates requests, derives identity from the authenticated session, checks ownership, and normalizes provider data before domain use.

## Proposed technology choices

- React + TypeScript strict mode and Vite for the web application.
- SVG for the pitch and individually editable players/tactical objects; accessible HTML controls for menus and property editing.
- Node.js + TypeScript modular monolith and a versioned REST contract.
- PostgreSQL with migrations; relational user/team/player data and a versioned JSONB board aggregate.
- pnpm workspace monorepo for web, API, shared contracts, and domain logic. Defer Turborepo until there is measurable build orchestration need.

PostgreSQL is used for local development; production hosting, region, and operations have not been selected. No Redis, queue, microservice, or other auxiliary infrastructure is justified by current requirements.

## Board state and provider boundary

Persist positions in normalized pitch coordinates independent of viewport dimensions. Each player and tactical object has a stable internal ID. Formation metadata records the selected template; it does not constrain subsequent user positions. Store enough team/player snapshot data with each board to preserve context if an external record changes or becomes unavailable.

Provider adapters map external identifiers and nullable/inconsistent fields into internal team/player contracts. The API-Football key stays server-side; the web client calls only the local API. Current-team and squad responses are cached in process for five minutes to avoid repeat quota use. Squad records are deduplicated by provider player ID. Signed-in users may save private board snapshots containing player names, shirt numbers, positions, and provider identifiers; photos and crests are omitted. The user's approval covers private/local snapshots only. Public use, publication, and deployment/retention rights remain unresolved and must be reviewed before expanding this use.

The API exposes team search and current-squad lookup under `/api/football`, plus authenticated account and owner-scoped workspace routes. Details are documented in [API contracts](api-contracts.md). The API binds to loopback by default; the local implementation is not a production deployment.

## Mobile readiness

Future React Native/Expo clients should consume the same stable API and may reuse pure domain rules, schema validation, and API contracts. Do not share SVG/DOM interactions as React Native components. Keep gesture handling and renderers platform-specific.

## Verification and operational principles

Use unit tests for domain invariants, integration tests for persistence/ownership/provider failure modes, and E2E tests for critical user journeys. Use structured logs without credentials or unnecessary personal data. PostgreSQL migrations are additive; deployment, backups, and production secrets management remain future operational work.
