# TacticalBoard

A web-first football tactics platform. The public landing page leads into email/password accounts, with optional Google sign-in when server credentials are configured. Authenticated users can save private boards and custom teams in local PostgreSQL, restore and edit board state, and choose real squads or custom rosters before entering the editor. The editor supports formations, free positioning, and substitutions. Provider images remain omitted pending rights review. API-Football Free season-specific league data is limited to 2022–2024, while its current-squad endpoint works independently of season.

## Development

See [Local Development](docs/operations/local-development.md) for prerequisites, install, run, and checks.

## Deployment

See [Ubuntu Server Deployment](docs/operations/ubuntu-deployment.md) for Docker Compose deployment and production requirements.

## Planning

- [Product vision](docs/product/vision.md)
- [User flows](docs/product/user-flows.md)
- [Implementation plan](docs/roadmap/implementation-plan.md)
- [Iteration status](docs/roadmap/iteration-status.md)
- [Proposed architecture](docs/architecture/architecture.md)
- [Current API contracts](docs/architecture/api-contracts.md)
- [Provider decision record](docs/decisions/ADR-002-football-data-provider.md)
