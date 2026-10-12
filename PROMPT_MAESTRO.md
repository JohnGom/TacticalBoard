# MASTER PROMPT — FOOTBALL TACTICS PLATFORM

## 1. ROLE AND OBJECTIVE

Act as a senior software architect, product engineer, UX designer, and technical planner.

Your task is to analyze and plan the development of a high-quality football tactics platform. You must prioritize maintainability, a good user experience, security, testability, incremental delivery, and a balanced trade-off between development speed and long-term scalability.

**IMPORTANT: This is a planning-only task. Do not implement the application, modify source code, install dependencies, or execute destructive commands.** First produce a comprehensive, actionable plan for human review and approval.

Do not assume that generating more code or more infrastructure automatically means better engineering.

## 2. PRODUCT VISION

Build a web platform that lets football coaches, analysts, content creators, and football fans create, edit, save, and reuse interactive tactical boards.

The pitch is the central workspace. Users must be able to arrange players, explain tactical movements, create teams, select real-world clubs or national teams, and manage their own saved tactical work.

The platform must be designed so that a mobile application can be developed in the future without rebuilding the backend or duplicating all business logic.

## 3. CORE PRODUCT REQUIREMENTS

### 3.1 Interactive tactical editor

The editor must support:

* A football pitch with full-pitch and half-pitch views.
* Players represented by editable visual markers, including circles.
* Free drag-and-drop positioning throughout the pitch.
* Initial formations such as 4-3-3, 4-4-2, 4-2-3-1, and other configurable formations.
* Editing player names, shirt numbers, labels, colors, and other relevant visual properties.
* Moving players independently after selecting a formation.
* Tactical arrows, paths, annotations, and zones.
* Adding, editing, selecting, and removing individual tactical elements.
* Undo/redo as a capability to evaluate and preferably include in the MVP.
* Exporting a tactical board as an image, if feasible within the agreed MVP.
* Responsive layouts and usable touch interactions in preparation for future mobile clients.

Selecting or changing a formation must not permanently constrain player movement. The formation provides an initial arrangement, not an automatic positioning rule.

Use a coordinate system independent of screen resolution. Persist normalized pitch coordinates so that saved boards remain consistent across different screen sizes.

### 3.2 Team management

Users must be able to:

* Create teams with custom names and colors.
* Add, edit, and remove custom players.
* Assign shirt numbers and positions.
* Create an initial lineup and manage substitutes.
* Select formations and populate the pitch.
* Replace players between the pitch and the substitutes list.

Keep custom data independent of external football providers.

### 3.3 Real-world football data

Users should be able to search for real football clubs and national teams and load available player information without manually entering every player.

Evaluate football data providers such as Sportmonks and football-data.org, as well as alternatives if justified.

Do not assume that any provider supports all clubs, national teams, competitions, player photographs, current squads, historical squads, or match lineups.

Investigate and document:

* Team and national-team coverage.
* Squad and player data availability.
* Player identifiers, positions, shirt numbers, and photographs.
* Current versus historical data.
* Match-specific starting lineups and substitutes.
* Free and paid plans, rate limits, and expected costs.
* API key requirements.
* Licensing and permitted use of data, badges, and images.
* Caching restrictions and attribution requirements.

Separate verified facts from assumptions and unresolved questions. Use official provider documentation where available. Do not fabricate prices, coverage, endpoints, or capabilities.

Design a provider-independent integration layer that normalizes external data into internal domain models.

The frontend must never contain private provider API keys. Provider failures, missing fields, rate limits, and unavailable data must be handled gracefully.

### 3.4 User accounts and saved workspaces

Users should be able to:

* Register, log in, and log out.
* Create and manage their own workspace.
* Save and reopen tactical boards.
* Rename, edit, duplicate, and delete boards.
* Create and manage custom teams.
* Retrieve their work from another device after authentication.

Define ownership and authorization rules. Users must not be able to access or modify other users' private resources without explicit permission.

A saved board must preserve all relevant editable state, including player identities or snapshots, positions, substitutes, formation metadata, colors, arrows, paths, annotations, and other supported elements.

Persist a useful snapshot of external player information alongside the provider identifier so that saved boards remain understandable if an external player or squad record changes.

### 3.5 Future capabilities

Do not implement these features in the initial MVP unless explicitly approved:

* Historical match selection.
* Live matches and live lineup updates.
* Official match lineups and substitutions.
* Multi-step animated tactical sequences.
* Native mobile applications.
* Payments, subscriptions, or monetization.

However, identify architectural decisions that would make these features easier to add later.

## 4. TECHNICAL DIRECTION

Evaluate the following initial direction rather than accepting it blindly:

* Web frontend: React and TypeScript.
* Backend: Node.js and TypeScript.
* Database: PostgreSQL.
* Tactical rendering: SVG as the initial candidate, compared with Canvas where appropriate.
* Future mobile client: React Native with Expo.
* Shared code: domain models, validation rules, and API contracts where technically appropriate.
* Repository organization: a monorepo using pnpm and optionally Turborepo, if the benefits justify the added tooling.

Prefer a modular monolith for the backend unless there is a demonstrated reason to choose another architecture.

Evaluate authentication, deployment, database migrations, logging, API validation, testing, and environment management.

Do not add infrastructure such as Redis, microservices, message queues, or additional services without a concrete requirement.

The web application must not be coupled to a particular football data provider.

Keep business logic independent of the web UI and future mobile UI. Do not force web and mobile to share components that require different rendering or interaction models.

## 5. PLANNING WORKFLOW

### Phase A — Repository and environment discovery

Inspect the current workspace in read-only mode.

* Identify existing files, project conventions, installed tooling, and available documentation.
* Determine whether the repository is empty or contains existing work.
* Identify relevant constraints and existing instructions, including AGENTS.md.
* Do not overwrite or delete existing work.
* If a necessary tool, credential, or external resource is unavailable, state the limitation instead of pretending to verify it.

### Phase B — Requirements analysis

Organize requirements into:

* Functional requirements.
* Non-functional requirements.
* User journeys.
* Data requirements.
* Security and privacy requirements.
* Accessibility and responsive-design requirements.
* External integration requirements.
* Explicitly deferred features.

Identify ambiguity, conflicting requirements, risks, assumptions, and decisions requiring human approval.

Ask only the questions that materially affect architecture, feasibility, costs, or product scope. If a reasonable default allows planning to proceed, state it clearly instead of blocking on minor details.

### Phase C — Technical investigation

Evaluate the proposed architecture and relevant alternatives.

Investigate the football API integration before committing to a provider.

Consider the implications of the future mobile application, particularly API stability, shared domain logic, authentication, touch interactions, coordinate persistence, and rendering.

Provide clear trade-offs and justify major technical decisions.

### Phase D — Iterative roadmap

Produce an implementation roadmap divided into small, verifiable iterations.

For each iteration define:

1. Goal and user value.
2. Scope and explicit exclusions.
3. Dependencies and prerequisites.
4. Expected deliverables.
5. Relevant modules and likely files.
6. Database changes and API contracts, if applicable.
7. Security considerations.
8. Unit, integration, and end-to-end tests as appropriate.
9. Concrete acceptance criteria.
10. Definition of done.
11. Risks and rollback considerations where relevant.

Order iterations according to dependencies and risk. Validate uncertain, high-impact assumptions early.

Every iteration must leave the project in a working, testable state. Avoid combining unrelated features into oversized iterations.

### Phase E — Documentation proposal

Propose the following documentation structure:

* AGENTS.md
* docs/product/vision.md
* docs/product/requirements.md
* docs/product/user-flows.md
* docs/architecture/architecture.md
* docs/architecture/data-model.md
* docs/architecture/api-contracts.md
* docs/architecture/mobile-readiness.md
* docs/decisions/ADR-001-architecture.md
* docs/decisions/ADR-002-football-data-provider.md
* docs/roadmap/implementation-plan.md
* docs/roadmap/iteration-status.md
* docs/quality/testing-strategy.md
* docs/operations/local-development.md

Explain the purpose and expected content of each document.

Do not create these files during this planning-only task. Provide the proposed contents or detailed outlines for review. After approval, these documents can be created in a separate, explicitly authorized implementation step.

## 6. ENGINEERING STANDARDS

Plan for the following practices:

* TypeScript strict mode.
* Clear separation of domain, application, infrastructure, and presentation responsibilities where justified.
* Reusable code without premature abstraction.
* Input validation at API boundaries.
* Consistent error handling.
* Secure authentication and authorization.
* Secret management through environment variables.
* Database migrations and appropriate indexes.
* Structured logging without leaking secrets or sensitive data.
* Unit and integration tests.
* End-to-end tests for critical user journeys.
* Linting, formatting, and type checking.
* Accessible controls and keyboard interaction where applicable.
* Responsive and touch-friendly interactions.
* Clear README and local development instructions.
* Dependency management and documented version choices.
* No unnecessary dependencies or speculative infrastructure.

Do not use mocks or sample data in a way that makes incomplete integrations appear production-ready. Clearly label demo data and define how it will be replaced.

## 7. MOBILE READINESS

The first deliverable is the web application, not a mobile application.

Plan for a future React Native/Expo client by:

* Designing stable backend API contracts.
* Keeping domain rules independent of React components.
* Defining platform-independent data models.
* Persisting normalized pitch coordinates.
* Separating tactical-board state from rendering.
* Documenting which modules can be shared and which must be platform-specific.

Do not create an empty mobile application or implement mobile-specific infrastructure in the MVP merely to claim cross-platform support.

## 8. SECURITY AND DATA INTEGRITY

Plan for:

* Per-user ownership and authorization.
* Validation of all externally supplied data.
* Protection of API credentials.
* Safe error messages.
* Database integrity and migrations.
* Appropriate handling of deletion and data retention.
* No unnecessary collection of personal information.
* No secrets committed to source control.
* No destructive database or filesystem operations without explicit authorization.

## 9. ACCEPTANCE CRITERIA FOR THE PLANNING PHASE

The planning phase is complete only when the response includes:

1. A concise product specification.
2. An MVP scope and a list of deferred capabilities.
3. A proposed architecture and justified alternatives.
4. A preliminary domain model and persistence strategy.
5. An assessment of football API providers, including verified limitations and unresolved issues.
6. A mobile-readiness strategy.
7. A detailed, dependency-aware iteration roadmap.
8. Test strategy and measurable acceptance criteria.
9. A risk register with mitigations.
10. A proposed documentation structure with sufficient content to create the documents.
11. A list of decisions requiring human approval.
12. A recommended next action.

## 10. INTERACTION AND STOP CONDITIONS

Work in Plan mode and remain read-only.

Do not implement features, modify application files, install dependencies, create migrations, or deploy anything.

Do not silently make major decisions on budget, provider selection, hosting, or authentication.

Present the plan in a structured, reviewable format. Highlight important uncertainties and explain their consequences.

At the end, explicitly state:

* What is verified.
* What is proposed.
* What remains unresolved.
* What approval is required before implementation.

**Stop after presenting the plan and proposed documentation. Wait for explicit human approval before making changes.**
