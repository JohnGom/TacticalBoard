# Iteration Status

Updated: 2026-11-10

## Iteration 1 — Foundation

**Status: Foundation delivered.** The workspace, docs, runnable web/API skeleton, health endpoint, and local checks are complete. API-Football Free is provisionally integrated for private/local team and current-squad lookup; legal/publication and persistence approval remain open.

### Verified deliverables

- [x] Inspect workspace and project instructions.
- [x] Record the proposed architecture, iteration roadmap, acceptance criteria, and gates.
- [x] Create runnable web and API workspaces.
- [x] Verify health route, typecheck, and production web/API builds.
- [x] Verify web development server and `/api` proxy end-to-end.

## Current iteration: 2 — Tactical editor core

**Status: In progress.** The editor supports SVG full/half pitch views, 4-3-3/4-4-2/4-2-3-1 starting layouts, editable player selection, pointer/keyboard movement, and domain tests. Browser-level touch/visual verification remains outstanding.

### Checklist

- [x] Define normalized pitch coordinates and formation templates in the domain package.
- [x] Preserve player IDs and player snapshots when applying a new formation.
- [x] Add full/half pitch rendering and free player movement controls.
- [x] Add unit tests for formation creation, movement, bounds, and player preservation.
- [x] Pass strict TypeScript checks, domain tests, and web/API production builds.
- [x] Verify Vite serves the editor shell and proxies `/api/health` successfully.
- [ ] Verify editor interaction and layout in a browser at desktop and phone sizes.
- [x] Add versioned board state persistence through the private workspace flow (Iteration 5 slice).

## Pre-pitch team setup — implemented slice

- [x] Ask users to choose real team or custom team before showing the pitch.
- [x] For a real team, search and load its current squad before proceeding.
- [x] For a custom team, collect team name/color and 11 named, numbered, positioned starters; allow custom substitutes.
- [x] Build the first 11 from the selected formation and place remaining players on the bench.
- [x] Support substitutions while preserving the pitch position.
- [x] Add UI tests for real-team and custom-team setup flows; domain tests cover role matching and position-preserving substitutions.
- [ ] Manually verify touch/visual behavior in desktop and mobile browsers.
- [x] Persist custom teams and boards in the signed-in user's local PostgreSQL workspace.

## Iteration 6 — External football data

- [x] Compare public free-tier coverage and identify API-Football Free as the provisional candidate.
- [x] Provide a backend-only local key-file template and loader.
- [x] Verify the local key against API-Football `/status` without exposing it (HTTP 200, Free plan, 100 requests/day).
- [x] Validate current squads for Real Madrid, Manchester City, Juventus, and Flamengo.
- [x] Validate current squads for Spain (23 players), Brazil (26), France (23), Argentina (26), and England (28; one missing shirt number).
- [x] Add provider-neutral server adapter, team-search/squad routes, in-memory five-minute cache, deduplication by provider ID, and text-only client selection.
- [x] Reserve five daily calls when upstream quota headers are available; reset the local guard at UTC midnight.
- [x] Verify the editor-facing Vite proxy can search Spain and load its squad through the API adapter.
- [x] Handle missing key, upstream rate limit, provider errors, invalid requests, and empty rosters with safe responses.
- [ ] Confirm provider terms for public data use and long-term snapshot retention before publication/cloud persistence; official docs recommend technical caching, while durable retention/publication permission remains unclear.
- [ ] Review provider image rights and commercial terms for intended product use.
- [x] User created a Free account for provider validation; no paid plan has been selected or purchased.

### Free-plan limitations verified

- `/leagues` queries for 2026 were rejected by the Free plan; API error specified seasons 2022–2024. Season-specific 2026 league data is not available on this plan.
- The season-independent `/players/squads?team=…` endpoint returned current squads for all tested clubs and selections.
- Club squad responses can contain duplicate player IDs; the adapter collapses those to unique players. Example: Flamengo returned 166 rows but 34 distinct IDs.
- Team crests and player photos are omitted from the adapter response pending rights review.

## Iteration 5 — Accounts and private workspaces

**Status: Implementation in progress; local verification outstanding.** The local app now includes a public landing, email/password accounts, optional Google OAuth configuration, private saved boards and custom teams, and owner-scoped workspace screens. PostgreSQL is local development infrastructure only; production hosting is not selected.

### Implemented slice

- [x] Store account password hashes, sessions, custom teams, and board snapshots in PostgreSQL with additive migrations.
- [x] Derive resource ownership from signed-in sessions and scope board/team reads and mutations by owner.
- [x] Create, restore, edit, rename, duplicate, and delete private boards; preserve editable player snapshots.
- [x] Save, list, edit, and delete custom teams; retain board snapshots when a source custom team is deleted.
- [x] Add revision-based board conflict detection and a 409 response for stale saves.
- [x] Add Spanish public landing and account/workspace flows; expose Google sign-in only when configured.
- [x] Add PostgreSQL integration coverage for registration/login, ownership isolation, restoration, logout, and stale revision behavior.
- [x] Verify the latest migrations and database-backed account/workspace integration tests against a clean temporary PostgreSQL instance.
- [x] Pass typecheck, all unit/integration tests, and production builds after the final code changes.
- [x] Verify the Compose-managed development database is at the latest migration version.
- [ ] Manually verify responsive visual/editor behavior in desktop and phone browsers.

### Decisions and limits

- Email/password uses the local API; Google OAuth is optional and needs server-side client credentials.
- Local PostgreSQL is available on port 5434 and is not a hosted/cross-device service.
- Private/local snapshots of provider player names, shirt numbers, positions, and IDs are approved; photos, crests, public sharing, and public data publication remain out of scope pending rights review.

### Environment note

The current shell resolves Node.js 24.21.0, which satisfies Vite's requirement. An earlier build ran under Node.js 20.15.0 and emitted an unsupported-version warning; with the current Node version, typecheck, tests, and production builds pass without that warning.

### Decisions still open

- API-Football Free is the provisional provider for local squad lookup; a recurring budget is not approved or needed for current testing.
- Logo and player-photo rights strategy.
- Data publication and long-term snapshot retention rights.
- Production hosting, database region, backups, and deployment operations.
- Confirmation that undo/redo and PNG export are MVP requirements.

## Iteration 7 — Release quality and operations (deployment slice)

**Status: Docker Compose deployment packaging and Ubuntu instructions implemented and locally verified; production server and backup/restore verification remain outstanding.** The stack defines the web, API, and persistent PostgreSQL services, with host Caddy terminating HTTPS and proxying to loopback-published ports.

- [x] Add multistage Docker builds for the API and static web application.
- [x] Add Compose services for web, API, and PostgreSQL with health checks, restart policies, and persistent database storage.
- [x] Keep PostgreSQL, API, and web host ports bound to loopback for the host Caddy proxy.
- [x] Document secret setup, production migrations, Caddy routing, updates, and database backups.
- [x] Validate Compose configuration; pass typecheck, all tests including PostgreSQL persistence integration, production builds, and `git diff --check`.
- [x] Build both container images, run the Compose stack, and verify API health, web response, and database readiness locally.
- [ ] Verify production backup/restore and the deployed service on the target Ubuntu host.

## Iteration completion policy

An iteration is complete only after its acceptance criteria and checks pass. A blocked external decision must be recorded as a blocker; it must not be presented as verified functionality.
