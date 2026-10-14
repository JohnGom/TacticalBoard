# Local Development

## Prerequisites

- Node.js 22.12 or newer (required by the current Vite release).
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

## API-Football Free key

The provisional free-provider candidate is API-Football. To prepare a local key file:

```sh
cp apps/api/.env.example apps/api/.env
```

Put your API-Football key after `APIFOOTBALL_API_KEY=` in `apps/api/.env`. That file is ignored by Git. The API loads it server-side through `dotenv`; never put the key in `apps/web`, a browser request, source control, or chat. Keep using the API-Football Free plan; do not add payment details or upgrade for this prototype.

The integration is active for local team search and current-squad lookup. Use it to search clubs or national-team names in the editor. The Free plan's league-season data endpoint rejected season 2026 and reported access only for seasons 2022–2024, but the current-squad endpoint worked for the tested clubs and selections. The key does not confer data-publication or image rights. Current board edits are still in memory and are not saved.
