# AGENTS.md — Engineering Rules

## 1. General principles

* Read this file and any relevant project documentation before making changes.
* Follow the approved product requirements, architecture, roadmap, and architecture decision records (ADRs).
* Treat approved documentation as the source of truth. If documents conflict, identify the conflict and request clarification when it affects important behavior or architecture.
* Do not implement features outside the approved iteration scope without authorization.
* Prefer simple, maintainable solutions over unnecessary abstractions.
* Do not rewrite working modules or introduce unrelated refactors without a clear reason.
* Never claim a task is complete without verifying its acceptance criteria.

## 2. Workflow

For every iteration:

1. Read the relevant requirements and approved plan.
2. Identify dependencies, affected modules, and acceptance criteria.
3. Present a short implementation plan before significant changes.
4. Implement only the approved scope.
5. Run the relevant tests, type checks, linting, and formatting.
6. Review the changes for security, regressions, and unintended behavior.
7. Update documentation and iteration status.
8. Summarize changed files, verification results, known limitations, and outstanding issues.

If an important assumption proves false, stop the affected work and propose an updated plan.

Do not proceed with destructive operations, major architectural changes, new paid services, or irreversible migrations without authorization.

## 3. Code quality

* Use TypeScript strict mode where applicable.
* Use explicit types for domain entities and external API contracts.
* Avoid `any` unless there is a documented, justified exception.
* Keep functions focused and modules cohesive.
* Separate domain rules from UI components and external service implementations.
* Avoid duplicate business logic.
* Avoid premature abstraction and unnecessary dependencies.
* Follow the existing project conventions unless an approved change establishes new conventions.
* Do not suppress compiler errors or lint rules simply to make checks pass.
* Do not leave unfinished TODOs, fake implementations, or placeholder behavior presented as complete functionality.

## 4. Frontend and tactical editor

* Keep tactical-board state separate from its visual rendering.
* Use stable identifiers for players and tactical elements.
* Store player positions in normalized pitch coordinates independent of viewport dimensions.
* Keep player markers, arrows, paths, zones, and annotations independently editable.
* Preserve user changes when editing a formation or replacing a player, unless the user explicitly requests otherwise.
* Implement clear loading, empty, error, and success states.
* Support mouse and keyboard interactions where appropriate.
* Consider touch input and responsive layouts from the beginning.
* Do not assume that web components can be reused directly in React Native.
* Verify that saved tactical boards can be restored without losing their editable state.

## 5. Backend and API

* Validate incoming requests at API boundaries.
* Enforce authentication and resource ownership on the server.
* Never trust client-supplied user IDs or authorization claims without server-side verification.
* Keep provider credentials exclusively on trusted server infrastructure.
* Normalize external football data before it enters domain logic.
* Handle missing fields, provider errors, rate limits, and timeouts explicitly.
* Apply caching only in accordance with provider terms and data freshness requirements.
* Keep API contracts documented and version changes carefully.
* Use database migrations for schema changes.
* Ensure that authorization checks apply to read, update, duplicate, and delete operations.

## 6. Data integrity

* Distinguish custom teams and players from externally sourced entities.
* Preserve provider identifiers when available.
* Store sufficient snapshots of player data to keep saved boards understandable if external records change.
* Keep saved board state versioned when necessary to support future schema evolution.
* Validate coordinate ranges and tactical-element references.
* Define transactional behavior for operations that modify related records.
* Never delete production data or execute destructive migrations without explicit approval.

## 7. Security and privacy

* Never commit secrets, access tokens, passwords, or private credentials.
* Use environment variables and a documented example environment file.
* Never expose private football API keys to the frontend.
* Avoid logging credentials, authentication tokens, or unnecessary personal information.
* Follow least-privilege principles.
* Use secure password handling or a reputable authentication provider.
* Apply server-side ownership checks to every private resource.
* Do not weaken authentication or authorization to make tests pass.

## 8. Testing and verification

* Add tests for new business rules and important edge cases.
* Test persistence and restoration of tactical-board state.
* Test authorization boundaries and cross-user access prevention.
* Test external provider failures and incomplete responses.
* Test formation changes, free player movement, substitutions, and tactical-element editing.
* Use unit, integration, and end-to-end tests according to the risk and scope of the change.
* Do not remove or weaken tests merely to make a build pass.
* Report commands that were run and whether they passed.
* Clearly disclose checks that could not be executed.

## 9. Documentation

* Update documentation when behavior, contracts, architecture, or setup changes.
* Record significant architectural decisions in ADRs.
* Keep the implementation roadmap and iteration status accurate.
* Document environment variables without including their real secret values.
* Maintain clear setup, migration, test, and deployment instructions.
* Do not mark an iteration complete while required acceptance criteria remain unmet.

## 10. Definition of done

A task is complete only when:

* Its approved scope has been implemented.
* Its acceptance criteria have been checked.
* Relevant tests and quality checks have passed, or failures are explicitly documented.
* No known critical security or data-integrity issue has been introduced.
* Relevant documentation has been updated.
* Outstanding limitations are disclosed.
* The implementation remains within the approved architecture and iteration scope.

If any condition is unmet, report the task as incomplete or partially complete rather than claiming success.
