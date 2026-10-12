# Iteration Status

Updated: 2026-10-11

## Iteration 1 — Foundation

**Status: Foundation delivered; provider feasibility gate open.** The workspace, docs, runnable web/API skeleton, health endpoint, and local checks are complete. No provider is selected. Target-team payload validation is deferred until target leagues/teams and API access are available; this is a hard gate before Iteration 6, but does not block the provider-independent editor.

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

## Provider gate before Iteration 6

- [ ] Obtain target club/national-team list and validate real squad responses.
- [ ] Review provider image rights and commercial terms for intended product use.
- [ ] Approve provider choice and recurring budget; no paid plan has been selected or purchased.

### Decisions still open

- Target competitions/clubs and national teams.
- Provider selection and recurring budget.
- Logo and player-photo rights strategy.
- Authentication vendor/approach, hosting, and region (needed before Iteration 5).
- Confirmation that undo/redo and PNG export are MVP requirements.

## Iteration completion policy

An iteration is complete only after its acceptance criteria and checks pass. A blocked external decision must be recorded as a blocker; it must not be presented as verified functionality.
