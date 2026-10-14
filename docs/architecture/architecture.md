# Architecture — Proposed Baseline

**Status:** Web/API baseline implemented. API-Football Free is provisionally integrated for local team and current-squad lookup. Authentication, hosting, database vendor/region, and publication/data-retention rights remain undecided.

## System shape

```text
React web client (SVG presentation)
          │ same-origin, versioned JSON API
          ▼
Node.js / TypeScript modular monolith
  ├── authentication and ownership (later iteration)
  ├── board/team application services
  ├── provider-neutral football data port (API-Football adapter)
  └── PostgreSQL repository (later iteration)
```

The UI is presentation and interaction only. Domain rules—normalized coordinates, formations as initial arrangements, roster substitutions, and board invariants—live outside React components. The API validates requests, derives identity from the authenticated session, checks ownership, and normalizes provider data before domain use.

## Proposed technology choices

- React + TypeScript strict mode and Vite for the web application.
- SVG for the pitch and individually editable players/tactical objects; accessible HTML controls for menus and property editing.
- Node.js + TypeScript modular monolith and a versioned REST contract.
- PostgreSQL with migrations; relational user/team/player data and a versioned JSONB board aggregate.
- pnpm workspace monorepo for web, API, shared contracts, and domain logic. Defer Turborepo until there is measurable build orchestration need.

These are implementation defaults, not a final hosting/authentication decision. No Redis, queue, microservice, or other auxiliary infrastructure is justified by current requirements.

## Board state and provider boundary

Persist positions in normalized pitch coordinates independent of viewport dimensions. Each player and tactical object has a stable internal ID. Formation metadata records the selected template; it does not constrain subsequent user positions. Store enough team/player snapshot data with each board to preserve context if an external record changes or becomes unavailable.

Provider adapters map external identifiers and nullable/inconsistent fields into internal team/player contracts. The API-Football key stays server-side; the web client calls only the local API. Current-team and squad responses are cached in process for five minutes to avoid repeat quota use. Squad records are deduplicated by provider player ID. External images are omitted pending separate rights validation. The Free plan does not grant permission to publish third-party data, and private-board snapshot retention still needs clarification before cloud persistence.

The current read-only integration exposes team search and current-squad lookup under `/api/football`; request/response details and safe error codes are documented in [API contracts](api-contracts.md). The API binds to loopback by default and must not be exposed publicly before authentication and quota controls exist.

## Mobile readiness

Future React Native/Expo clients should consume the same stable API and may reuse pure domain rules, schema validation, and API contracts. Do not share SVG/DOM interactions as React Native components. Keep gesture handling and renderers platform-specific.

## Verification and operational principles

Use unit tests for domain invariants, integration tests for persistence/ownership/provider failure modes, and E2E tests for critical user journeys. Use structured logs without credentials or unnecessary personal data. Add migrations, deployment, backups, and secrets management after hosting is approved.
