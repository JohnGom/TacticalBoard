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

Start the local PostgreSQL database (Docker Compose binds it only to localhost on port 5434; the named volume keeps data across restarts):

```sh
pnpm db:up
```

The API applies additive development migrations at startup. You can also run them explicitly:

```sh
pnpm db:migrate
```

Start the API in one terminal:

```sh
pnpm dev:api
```

Start the web app in a second terminal:

```sh
pnpm dev:web
```

Open the URL printed by Vite. Its `/api` development proxy forwards to the local API on port 3001. Check the API directly at `http://127.0.0.1:3001/api/health`.

## Checks

```sh
pnpm typecheck
pnpm test
pnpm build
```

The typecheck command covers the API, web client, shared contracts, and domain package. The test command runs domain rules, API/provider route tests, pre-pitch real/custom setup, and database-backed auth/ownership tests. Start PostgreSQL first; the persistence test skips with a clear message when the database is unavailable. A linter and formatter are not configured yet.

## API-Football Free key

The provisional free-provider candidate is API-Football. If `apps/api/.env` does not exist, create it from the example. If it already contains your API-Football key, keep that file and append the database/session settings from `apps/api/.env.example`; do not overwrite the key.

`apps/api/.env` is ignored by Git. Keep `APIFOOTBALL_API_KEY` there, never in the browser, source control, or chat. Keep using the API-Football Free plan; do not add payment details or upgrade for this prototype.

Set `SESSION_COOKIE_SECRET` to a random secret so login cookies remain valid after API restarts:

```sh
openssl rand -hex 32
```

Paste the result into `SESSION_COOKIE_SECRET=`. If left blank in development, the API generates an ephemeral secret and existing sessions will need to sign in again after restart.

### Google sign-in (optional)

Email/password accounts work without Google credentials. To enable Google, create an OAuth 2.0 **Web application** client in Google Cloud Console and set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `apps/api/.env`. The client secret must remain server-side. Set `GOOGLE_REDIRECT_URI` to `http://127.0.0.1:5173/api/auth/google/callback` and add `http://127.0.0.1:5173` as an authorized JavaScript origin. The redirect URI must match exactly. For a deployed site, use its HTTPS origin and callback.

The landing page is public. Register or sign in to open your private workspace. From there, choose a real club/selection, a saved custom team, or create a new custom team before entering the pitch. Boards and custom teams are stored in the local PostgreSQL database and can be reopened by their owner. The Free plan's season-specific league endpoint rejected 2026 and reported access only for 2022–2024, while the current-squad endpoint worked for the tested clubs and selections. Provider image/publication rights still need clarification. The database runs locally; cross-device access requires deploying the API and database to a host you choose.
