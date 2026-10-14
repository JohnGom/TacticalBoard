# Iteration Status

Updated: 2026-10-13

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
- [ ] Add board state persistence (planned for Iteration 5, not included here).

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
- [ ] Confirm rights for public use and long-term snapshot retention before publication/cloud persistence.
- [ ] Review provider image rights and commercial terms for intended product use.
- [x] User created a Free account for provider validation; no paid plan has been selected or purchased.

### Free-plan limitations verified

- `/leagues` queries for 2026 were rejected by the Free plan; API error specified seasons 2022–2024. Season-specific 2026 league data is not available on this plan.
- The season-independent `/players/squads?team=…` endpoint returned current squads for all tested clubs and selections.
- Club squad responses can contain duplicate player IDs; the adapter collapses those to unique players. Example: Flamengo returned 166 rows but 34 distinct IDs.
- Team crests and player photos are omitted from the adapter response pending rights review.

### Environment note

The current shell resolves Node.js 20.15.0, below Vite's supported minimum of Node.js 20.19 / 22.12. The production build completed but emitted Vite's unsupported-Node warning. Use Node.js 22.12+ before relying on local web development; the API health route and typechecks passed on the current shell.

### Decisions still open

- API-Football Free is the provisional provider for local squad lookup; a recurring budget is not approved or needed for current testing.
- Logo and player-photo rights strategy.
- Data publication and long-term snapshot retention rights.
- Authentication vendor/approach, hosting, and region (needed before Iteration 5).
- Confirmation that undo/redo and PNG export are MVP requirements.

## Iteration completion policy

An iteration is complete only after its acceptance criteria and checks pass. A blocked external decision must be recorded as a blocker; it must not be presented as verified functionality.
