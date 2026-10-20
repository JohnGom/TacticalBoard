# ADR-002: Football data provider

- **Status:** API-Football Free provisionally integrated for a local prototype; terms for persistent cloud storage and public data use remain open.
- **Review date:** 2026-10-14

## Context

MVP asks for real clubs and national teams with player information. Coverage varies by provider, competition, season, plan, and data type. Team/player images have rights separate from provider API access.

## Evidence reviewed

- **API-Football / API-SPORTS — selected provisionally for the free local prototype.** Its [pricing page](https://www.api-football.com/pricing) says all plans include all competitions and endpoints, with free plans limited by available seasons; the free tier lists 100 requests/day. The official [coverage page](https://www.api-football.com/coverage) lists the requested Spanish, English, Italian, and Brazilian top divisions, and reported 1,248 leagues/cups on its 2026-10-11 update. This is the product catalogue/coverage, not a guarantee that all seasons or all data types are populated on the free plan. Authenticated calls on 2026-10-13 confirmed that `leagues?country=…&season=2026` is denied on Free with the API response specifying available seasons 2022–2024. The current `/players/squads?team=…` endpoint succeeded without a season parameter for a sample club in each requested league and for Spain, Brazil, France, Argentina, and England. National squad results contained 23, 26, 23, 26, and 28 rows respectively; England had one row without a shirt number. Club responses can include repeated player IDs (Flamengo returned 166 rows but 34 distinct IDs), so the adapter deduplicates on provider ID. The official [2026 getting-started guide](https://www.api-football.com/news/post/how-to-get-started-with-api-football-the-complete-beginners-guide) recommends caching reference data and downloading team/league logos to local storage to avoid quota and CDN throttling. The separate [image-storage tutorial](https://www.api-football.com/news/post/optimizing-sports-websites-bunnycdn-api-sports-image-storage-guide) also describes caching media through BunnyCDN. This confirms caching is technically recommended; it does not grant intellectual-property or publication rights. The [terms](https://www.api-football.com/terms) say API-SPORTS does not own the images and grants no license to publish provider data; they place rights clearance on the customer. We found no explicit blanket ban on private cloud storage/caching, but the terms also do not clearly grant long-term cloud retention of player/team snapshots. Obtain written clarification before cloud persistence/public launch. The adapter omits image URLs and board state is not persisted.
- **football-data.org — best no-cost match for the named leagues, but not for automatic rosters.** Its [free coverage list](https://www.football-data.org/coverage) includes La Liga, Premier League, Serie A, Brazil Serie A, World Cup, and European Championship (12 competitions total). The [free pricing tier](https://www.football-data.org/pricing) provides delayed scores/schedules, fixtures, and tables at 10 calls/minute; squads and lineups are in the €29/month “Free + Deep Data” tier, not the €0 tier. Thus it cannot currently meet the free MVP squad/player-picker requirement. Its [terms](https://www.football-data.org/client/register) require visible attribution and say data obtained through the API may no longer be referenced after cancellation; logos/photos are copyrighted by their owners.
- **Sportmonks — not suitable for these leagues on its free plan.** Its [free-plan documentation](https://docs.sportmonks.com/v3/api/rate-limit) lists the Danish Superliga and Scottish Premiership, no card and no expiry; those leagues are fixed. The requested Spanish, English, Italian, and Brazilian competitions require a paid plan. Squad support is documented, but does not override that league restriction. [Terms](https://www.sportmonks.com/terms-of-service/) require customers to arrange logo/photo rights.

## Recommendation

Use API-Football Free for the local prototype's team and current-squad picker. Its developer docs explicitly recommend caching reference data and downloading logos locally for performance; there is no blanket technical prohibition on caching in the docs or terms we reviewed. The terms do not, however, clearly grant long-term cloud retention and place publication/data and third-party image rights on the customer. The five-minute server cache follows the technical guidance; publication and durable-snapshot rights remain open. The 100-call daily quota is suitable for deliberate user searches with short in-memory caching, not high traffic. Do not use it for 2026 season-specific league statistics on Free.

The key should be stored only in `apps/api/.env` as `APIFOOTBALL_API_KEY`. The committed example is `apps/api/.env.example`. Never place the key in the web app or paste it into chat. Use the API-SPORTS dashboard's API key for the official API-Football service, not a browser/widget key.

On 2026-10-13, the configured key authenticated successfully to `/status` (HTTP 200; Free; 100 requests/day). Tested current-squad API responses for all four target league representatives and all five named national teams. The web development proxy successfully served a Spain team search and 23-player squad through the API adapter. No API key or real provider response payload is stored in the repository.

Public provider pages can change; recheck before commercial approval. The key itself is kept in the ignored local `apps/api/.env` file and is not recorded here.

## Decision criteria

1. Target clubs and national-team squads are actually returned with the fields required for the editor.
2. Contract terms permit the intended web product and retained snapshots.
3. Separate image permissions are available or a text/color-only fallback is acceptable.
4. Cost, league cap, and rate limit fit approved budget and expected traffic.
5. API stability, attribution requirements, provider failure behavior, and cancellation consequences are acceptable.

## Storage and image-rights clarification

The official [getting-started guide](https://www.api-football.com/news/post/how-to-get-started-with-api-football-the-complete-beginners-guide) explicitly recommends storing reference data and downloading team/league logos locally to avoid repeated API calls and media-CDN throttling. The [image-storage tutorial](https://www.api-football.com/news/post/optimizing-sports-websites-bunnycdn-api-sports-image-storage-guide) demonstrates caching API media through BunnyCDN. This confirms the user's finding: caching is recommended as a technical/performance practice.

Separately, the [terms of service](https://www.api-football.com/terms) say that API-Sports does not own the image assets and that users are responsible for any rights required. They also say API-Sports does not provide a general license to use/publish its sports data and that publication permission must be obtained from the relevant authorities. The page identified itself as last updated May 21, 2025 when reviewed. The terms reviewed do **not** explicitly state a blanket prohibition on private cloud storage; they also do not clearly grant long-term snapshot retention. Thus neither a general storage ban nor unrestricted cloud/publication rights can be confirmed from these documents alone.

For a firm decision, ask API-Sports support in writing whether private user-owned board snapshots containing player names, shirt numbers, and positions may be retained in the application's cloud database, and whether logos/player photos may be displayed and cached in a public or commercial product. Until clarified, the prototype uses only a five-minute in-memory data cache, omits provider images, and does not persist provider data to boards.

## Next action

Before public release or cloud persistence, obtain confirmation of data publication and snapshot-retention terms, plus any separate team/player image permissions. Continue to respect Free's 100 requests/day limit and the season restriction.
