# BloxRadar

Live player counts and history for Roblox games, at [bloxradar.net](https://bloxradar.net).

Roblox shows how many people are playing a game right now, but it keeps no history. BloxRadar
reads Roblox's public endpoints every 10 minutes, stores the readings, and turns them into charts
and lists: what is breaking out, new all-time highs, top games, genres and studios. A second
section reads Roblox's public catalog every day and shows the best selling and most favourited
items, with creator pages.

## How it works

| Part | What it does |
| --- | --- |
| `src/collect.js` | Reads current player counts for tracked games. Cron runs it every 10 minutes. |
| `src/discover.js` | Hourly search for games that are not in any Roblox chart yet. |
| `src/daily.js` | Once a day per game: votes, badges, game passes, developer products and thumbnails, plus a dated record of anything that changed. Split into small slices because the host stops cron jobs after 30 minutes. |
| `src/catalog.js` | Once a day: prices, favourites and list order for the top of six catalog lists. Roblox only shows today's numbers, so the stored history is the point. |
| `server/` | Plain Node HTTP server with a JSON API under `/api`, backed by MySQL. |
| `public/` | The site itself: plain HTML, CSS and JavaScript, no framework. |
| `db/schema.sql` | MySQL / MariaDB schema. |

Everything uses public Roblox endpoints with no login or API key. Ten-minute readings are kept
for a set number of days (`RAW_RETENTION_DAYS`), after which only hourly averages are kept.

## Run it locally

Needs Node 20.6 or newer.

```
npm install
npm run fixture     # builds test data in data/fixture.json
npm run preview     # runs the site on the test data, no database needed
```

To run against a real database, copy `.env.example` to `.env`, fill in the MySQL details, then:

```
npm run migrate
npm run collect
npm start
```

Each collector job also has a `:dry` version (`npm run collect:dry`) that fetches data and
prints it without writing to the database.

## Research

`research_notes/` and `docs/ideas.md` hold the research behind the site: how players find
Roblox games, what developers do to get discovered, what other stats sites offer, and which
Roblox data is publicly available.
