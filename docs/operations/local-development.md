# Local Development

## Prerequisites

- Node.js 22 or newer (the current workspace was inspected with Node.js 24).
- pnpm 10 or newer.

## Install

From the repository root:

```sh
pnpm install
```

## Run locally

Start the API in one terminal:

```sh
pnpm --filter @tactical-board/api dev
```

Start the web app in a second terminal:

```sh
pnpm --filter @tactical-board/web dev
```

Open the URL printed by Vite. Its `/api` development proxy forwards to the local API on port 3001. Check the API directly at `http://127.0.0.1:3001/api/health`.

## Checks

```sh
pnpm typecheck
pnpm test
pnpm build
```

The typecheck command covers the API, web client, shared contracts, and domain package. The current test command runs the domain unit tests. A linter and formatter are not configured yet.

This foundation does not yet require environment variables, a database, authentication, or a football-provider token. Never add provider credentials to client code or commit real secrets. Provider access and deployment instructions will be added only after decisions and credentials are approved.
