# Implementation Plan — Football Tactics Platform

**Status:** Proposed and approved to begin Iteration 1. Provider, hosting, authentication, and production budget remain undecided.

## Product outcome

Deliver a responsive web application for building, editing, saving, and reusing football tactical boards. Boards retain editable state, use normalized pitch coordinates, and remain independent of external-data providers. A user can complete the core workflow with a custom team even when external data is unavailable.

## MVP boundary

### Included

- Full- and half-pitch SVG editor, configurable formations, free player positioning.
- Editable player markers and team/roster management with substitutes.
- Individually editable arrows, paths, zones, and text annotations.
- Undo/redo and PNG export, subject to validation during Iteration 3.
- Authenticated private workspace with board create, read, update, rename, duplicate, and delete.
- External team search and player/squad loading only after coverage, commercial terms, and image rights are validated and approved.
- Responsive mouse, keyboard, and touch use; persistence round-trip tests.

### Explicitly deferred

Historical match selection; official match lineups and substitutions; live data; multi-frame animation; native clients; billing; public sharing; collaborative editing; and speculative infrastructure (Redis, queues, microservices).

## Proposed technical baseline

- React + TypeScript strict mode, Vite, and SVG for the web client.
- Node.js + TypeScript modular monolith exposing a versioned REST API.
- PostgreSQL for accounts, custom teams, players, and board metadata; versioned board aggregate in JSONB.
- pnpm workspaces for web, API, and shared domain/API contracts. Defer Turborepo until build complexity warrants it.
- Provider interface and normalization layer on the server. Do not ship provider tokens to browsers or mobile clients.
- Authentication and hosting are intentionally not selected in this plan.

## Iterations

### 1. Foundation and provider feasibility — foundation delivered; provider gate open

1. **Goal/value:** create a runnable web/API base and avoid choosing a provider without evidence.
2. **Scope/exclusions:** workspace setup, strict TS, shared contracts, health endpoint, provider coverage/terms investigation; no production data integration, authentication, database, or hosting.
3. **Dependencies:** approval to begin this plan; provider test requires target teams and credentials/trial access.
4. **Deliverables:** web/API skeleton, local development instructions, roadmap/status, architecture/provider decision records.
5. **Likely modules/files:** `apps/web`, `apps/api`, `packages/contracts`, `packages/domain`, `docs/architecture`, `docs/decisions`.
6. **Database/API:** no database; `GET /api/health`; provider-neutral team/player DTOs and provider port only.
7. **Security:** no credentials in client; no secrets committed; bind local API to loopback by default.
8. **Tests/checks:** install, build, strict typecheck; health route; provider sample payload/coverage review once access is approved.
9. **Acceptance:** documented clean install/run; health endpoint succeeds; no provider selected absent evidence; coverage test inputs recorded.
10. **Done:** runnable skeleton and passing checks. Provider gate remains open until actual target squads are validated.
11. **Risks/rollback:** unsupported league/squad availability; retain custom-team path and adapter boundary; avoid paid signup until approved.

### 2. Tactical editor core — in progress

1. **Goal/value:** create a board and freely position players.
2. **Scope/exclusions:** pitch full/half views, player markers, formations; no persistence/accounts.
3. **Dependencies:** Iteration 1.
4. **Deliverables:** editor workspace and formation selector.
5. **Likely modules/files:** `apps/web/src/editor`, `packages/domain/src/board`, `packages/domain/src/formations`.
6. **Database/API:** versioned board model, normalized `x/y` coordinates in `[0,1]`; no database.
7. **Security:** validate board values before state is accepted.
8. **Tests:** formation generation; coordinate bounds; free movement; viewport resize invariance.
9. **Acceptance:** blank board or 4-3-3, 4-4-2, 4-2-3-1; every marker moves independently.
10. **Done:** responsive editor with accessible alternatives for essential controls.
11. **Risks/rollback:** touch interaction quality; validate early and keep keyboard controls.

### 3. Tactical objects, history, and export

1. **Goal/value:** let users explain tactical movement.
2. **Scope/exclusions:** arrows, paths, zones, annotations, selection/edit/delete, undo/redo, PNG; no animation.
3. **Dependencies:** Iteration 2.
4. **Deliverables:** independently editable board elements and history controls.
5. **Likely modules/files:** `apps/web/src/editor/elements`, `packages/domain/src/history`, export utility.
6. **Database/API:** extend versioned board schema with typed element variants.
7. **Security:** bound text lengths and element counts; render annotation text safely.
8. **Tests:** element lifecycle, undo/redo invariants, SVG/PNG output.
9. **Acceptance:** each element is independently selectable and editable; export contains pitch and markers.
10. **Done:** state remains consistent through undo/redo; export behavior documented.
11. **Risks/rollback:** browser export differences; retain SVG export as a fallback.

### 4. Custom teams and lineups

1. **Goal/value:** make boards reusable without external data.
2. **Scope/exclusions:** teams, colors, custom players, numbers, positions, starters, substitutes, swaps.
3. **Dependencies:** Iterations 2–3.
4. **Deliverables:** team editor and lineup/bench management.
5. **Likely modules/files:** `apps/web/src/teams`, `packages/domain/src/teams`.
6. **Database/API:** custom team/player/roster domain contracts; persistence waits for Iteration 5.
7. **Security:** validate values and player/team references.
8. **Tests:** roster CRUD, substitutions, formation population, preserve board edits when replacing players.
9. **Acceptance:** custom team populates a board and players can move between pitch and bench.
10. **Done:** roster changes do not reset unrelated board positions/elements.
11. **Risks/rollback:** divergence between roster and board; retain player snapshots in board state.

### 5. Accounts and cloud workspaces

1. **Goal/value:** save and restore private boards across devices.
2. **Scope/exclusions:** authentication and private board/team CRUD; no sharing/collaboration.
3. **Dependencies:** Iteration 4; approve auth and hosting choices first.
4. **Deliverables:** account flows, workspace list, save/open/rename/duplicate/delete.
5. **Likely modules/files:** `apps/api/src/auth`, `boards`, `teams`, migrations, workspace UI.
6. **Database/API:** PostgreSQL; owner-scoped `/api/v1` contracts; versioned JSONB board snapshots.
7. **Security:** server-derived identity; ownership checks on every operation; secure sessions and safe errors.
8. **Tests:** migrations, board round-trip, concurrent revision behavior, cross-user denial for all CRUD operations.
9. **Acceptance:** restored board retains all supported editable state; one user cannot access another's private resources.
10. **Done:** migrations, backup/restore notes, ownership tests, loading/error/empty/success UI states.
11. **Risks/rollback:** schema migration/data loss; additive migrations and tested restore path.

### 6. External football data

1. **Goal/value:** reduce manual player entry for supported teams.
2. **Scope/exclusions:** approved provider's search and squad import; no live feeds, historical match use, or unlicensed images.
3. **Dependencies:** target league/team validation in Iteration 1 and approval of provider/terms/budget.
4. **Deliverables:** server-side provider adapter, search UI, normalized records, player snapshots.
5. **Likely modules/files:** `apps/api/src/providers`, `apps/api/src/football-data`, search UI.
6. **Database/API:** preserve provider IDs and snapshot fields; internal API types remain provider independent.
7. **Security:** provider token remains server-side; validate provider payloads; redact logs.
8. **Tests:** sparse/invalid payloads, rate limit, timeout, outage, missing squad, normalization.
9. **Acceptance:** supported team search and squad load; honest empty/error state; boards remain understandable after provider change.
10. **Done:** usage complies with selected plan/terms; attribution and imagery rights addressed.
11. **Risks/rollback:** coverage/terms change; feature flag can disable provider search without affecting custom data.

### 7. Release quality and operations

1. **Goal/value:** ship a reliable web MVP.
2. **Scope/exclusions:** deployment, accessibility, observability, performance, critical E2E; no new product features.
3. **Dependencies:** Iterations 1–6 and approved hosting.
4. **Deliverables:** production deployment, operations guide, verification report, rollback procedure.
5. **Likely modules/files:** CI/CD, deployment configuration, `docs/operations`, E2E tests.
6. **Database/API:** migration and backup/restore procedures; API smoke tests.
7. **Security:** TLS, secure cookies, secret rotation, dependency review, log redaction.
8. **Tests:** critical journeys, keyboard and mobile viewport, authorization, backup restore.
9. **Acceptance:** custom-team-to-save/reopen/edit/export E2E passes; provider errors degrade gracefully; unauthorized requests fail.
10. **Done:** operational/rollback documentation and release checks pass.
11. **Risks/rollback:** release regression; staged deployment and tested rollback/restore.

## Test strategy

- **Unit:** coordinate boundaries, formation initialization versus free movement, stable IDs, substitutions, board schema migration, element references.
- **Integration:** API validation, transactions, migrations, ownership enforcement, board persistence/restoration, revision conflicts.
- **Provider contract:** missing fields, malformed response, 429, timeouts, outages, incomplete squads; fixtures must be labeled test data.
- **End-to-end:** custom team, edit, save, reload, duplicate, delete, export, provider search when approved, and cross-user denial.
- **Accessibility/responsive:** keyboard essentials, labels/focus, touch sizing, narrow viewport, contrast.
- **CI quality gates:** install, lint/format, strict typecheck, tests, production build, migration checks.

## Proposed measurable acceptance targets

- Every persisted player coordinate is within `[0,1]` and independent of viewport size.
- A board round-trip restores all supported editable state and stable identifiers.
- Cross-user reads and mutations are denied by the API.
- Core editor controls remain usable at a 320px-wide viewport and with keyboard navigation.
- Provider failure never prevents custom boards from opening or editing.
- Establish latency/performance budgets after the editor prototype rather than asserting unmeasured targets now.

## Approval gates

Before Iteration 5: authentication approach, hosting, and database region. Before Iteration 6: target leagues/national teams, provider, budget, commercial terms, attribution, and image permissions. Before MVP release: confirm undo/redo, PNG export, and any changes to deferred sharing/collaboration scope.
