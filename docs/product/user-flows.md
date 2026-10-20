# User Flows — Tactical Board Setup

## Choose a team source before opening the pitch

The first screen asks the user to choose one of two paths. The pitch/editor is not shown until a team roster is ready.

### Real club or national team

1. Choose **Use a real team**.
2. Search by club or country name.
3. Select a search result; the app loads its current squad and shirt numbers.
4. Review the roster and choose a formation.
5. The app assigns up to 11 players to formation slots by position, then uses remaining roster players as substitutes.
6. Continue to the pitch. Names and shirt numbers are already displayed on the lineup.

Search errors, unavailable squads, or fewer than 11 returned players keep the user in setup and show a recoverable message. Team/player images are not loaded pending rights review. API-Football Free quota and season limits are disclosed in the flow.

### Create a custom team

1. Choose **Create a custom team**, either from the workspace or before opening a board.
2. Enter a team name and color.
3. Fill the 11 starting-player names, shirt numbers, and positions. Shirt numbers must be distinct and between 1 and 99.
4. Optionally add substitutes and fill their names, numbers, and positions.
5. Choose a starting formation and continue to the pitch.

When signed in, saving the custom team adds it to the user's private team library. The roster is also copied into each board as an editable snapshot, so later team changes do not erase the board's player identities or positions.

## Edit the loaded board

- Player markers begin at the chosen formation positions and remain freely movable.
- Selecting a substitute replaces the selected on-pitch player while preserving that pitch position; the replaced player moves to the bench.
- Applying a different formation repositions the current lineup while retaining player identities/snapshots.
- Save creates a private board on the account. Reopening it restores the roster snapshots, formation, pitch view, player positions, and title.
- Renaming and editing update the saved board. Duplicate creates a separate copy; delete removes the selected saved board.
- Board updates include a revision number; if another session saved a newer revision, the stale update is rejected and the user is asked to reload.

## Account and workspace

- The landing page is public. Registration and sign-in use email/password; Google sign-in appears only when the API has OAuth credentials configured.
- A signed-in user sees only their own boards and custom teams. The API enforces ownership for reads and mutations.
- Signing out invalidates the current session. Saved boards and custom teams remain in the local PostgreSQL database for the next sign-in.
- Real-team snapshots saved to a private board include player names, shirt numbers, positions, and provider IDs. Photos and crests are not stored. Public sharing and deployment are not part of this flow.
