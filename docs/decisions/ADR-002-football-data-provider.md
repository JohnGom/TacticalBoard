# ADR-002: Football data provider

- **Status:** Open — no provider selected.
- **Review date:** 2026-10-11

## Context

MVP asks for real clubs and national teams with player information. Coverage varies by provider, competition, season, plan, and data type. Team/player images have rights separate from provider API access.

## Evidence reviewed

- [Sportmonks pricing](https://www.sportmonks.com/football-api/plans-pricing/) currently lists a free two-league plan; paid Starter €29/month for 5 leagues, Growth €99 for 30, Pro €249 for 120, and entity-based hourly request limits. The official [team squad endpoint](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/team-squads/get-team-squad-by-team-id) documents current domestic squads. Official documentation distinguishes national and domestic team types and provides tournament squad guidance. Specific target-country squad completeness still requires real requests. [Terms](https://www.sportmonks.com/terms-of-service/) allow product use but restrict unapproved raw-data resale and require the customer to arrange image rights. Paid 14-day trial billing/card terms should be checked carefully.
- [football-data.org pricing](https://www.football-data.org/pricing) lists Free + Deep Data at €29/month for 12 competitions and squads/lineups; higher tiers increase competition count and call rate. Its [coverage page](https://www.football-data.org/coverage) lists World Cup and European Championship competitions. The [Team API](https://docs.football-data.org/general/v4/team.html) includes current-season squad fields. Its [terms](https://www.football-data.org/client/register) require visible attribution, reserve image rights to their owners, and say API data cannot be referenced on the product after subscription cancellation.
- [API-Football pricing](https://www.api-football.com/pricing) lists 100 requests/day free and paid plans from $19/month. Its [coverage page](https://www.api-football.com/coverage) shows coverage varies by league/season. Terms and image rights were not verified in this review.

Public provider pages can change; recheck before commercial approval. The review did not use authenticated API calls and does not verify actual target squad payloads.

## Decision criteria

1. Target clubs and national-team squads are actually returned with the fields required for the editor.
2. Contract terms permit the intended web product and retained snapshots.
3. Separate image permissions are available or a text/color-only fallback is acceptable.
4. Cost, league cap, and rate limit fit approved budget and expected traffic.
5. API stability, attribution requirements, provider failure behavior, and cancellation consequences are acceptable.

## Next action

Obtain the target league/team list and approved test credentials/trial access. Compare sample team search and squad responses, record omissions and plan restrictions, obtain clarification on image rights and product use, then select a provider by a human-approved ADR update. Do not select or purchase a plan yet.
