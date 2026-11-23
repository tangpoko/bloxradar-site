# BloxRadar: product ideas

Written 2026-10-28. Based on Tang's two August reports (`reports/2026-08-27-roblox-trends.md` and `reports/2026-08-27-roblox-cycles.md`), a look at comparable sites, and live tests of public Roblox endpoints run on 2026-10-28. Every data source named below was called with curl that day unless it says otherwise.

---

## What Tang's own research asks for

The two reports keep returning to the same questions, and they make a good test for every idea below.

- **How long does a hit last, and where is a given game in that curve?** The cycles report found a rise of about five months, a fall to under 1% of peak within 6 to 12 months, and almost no games charting between months 6 and 14. It says plainly that it could not measure this properly because Roblox exposes no history and games that die disappear from the charts.
- **What format is rising, and has my idea been done?** Title families ("+1 ___", "Steal a ___", "Grow a ___", cleaning verbs) were the earliest signal of a format change.
- **What do thumbnails look like right now?** About a third of the trends report is thumbnail description.
- **What do games sell, and for how much?** Monetisation was marked "inferred" throughout because the gamepass endpoint failed in August. It works now (see the data section).
- **Is a game healthy, or are lifetime visits hiding a dead game?** MeepCity at 16.3B visits and 149 players was the example.
- **When should I launch?** The report ends on launch timing: live by March for a summer peak, early September for autumn.
- **Measured versus reported.** Both reports separate what was measured from what was read in the press. That habit is worth putting into the site itself.

---

## What comparable sites offer

| Site | What it does | Notes |
|---|---|---|
| roterminal.co | Most played now, climbing fastest (24h and 7d), title-word trends (last 30 days against the 30 before), game pages with daily history, studio lookup, compare up to 5 games, a screener with filters (genre, age, like %, growth), charts by country and device, an update log showing players in the hours after each update against the same hours a week earlier, live watch of up to 10 games. Also a command-line tool and an MCP connector for AI assistants. | Tracking since 27 Sep 2026. Paid tiers (Free, Plus, Pro, Studio) gate history length and update history. The site itself is plain Markdown text, no images. |
| RoMonitor Stats | Chrome extension that adds stats onto Roblox game pages: visits, likes, players today and this week, milestones, name change history, Discord and YouTube follower counts. | About 20K users, 3.8 stars. Complaints are mostly that it fails to load. Its main value is that the numbers sit on the Roblox page itself. |
| RoWatcher | Live charts, "emerging games" (last 90 days), a "breakout lab" with a scoring method it explains, week-over-week movers, genres, news, and revenue estimates. | Game pages are thin and SEO-shaped ("Is X dying?" FAQ). It does not explain how revenue is estimated. |
| Rolimons | Mainly a trading site. Its game table sorts by playing, visits, votes and vote score, filtered by genre. | Strong on items, light on games. |
| SteamDB (Steam) | The mature reference: all-time peak and 24h peak for every game, full player history, price history with every sale, patch and build history, "hot releases", upcoming calendar, follower counts, and clear notes on where each number comes from. | What people value most is history that never gets deleted and the change log tied to dates. |
| Gamalytic, VG Insights (Steam) | Revenue and sales estimates from review counts. | Developers use them for market sizing, and also distrust them. Roblox has no equivalent public signal for revenue, see below. |

What people value across all of these: history that goes back further than anyone else's, a record of changes (prices, updates, names), and the ability to check an idea against the market before building it. Things that get complaints: numbers with no explanation, paywalls on history, and tools that break.

roterminal already covers a lot of the "what is happening now" ground, including country and device charts and update impact. The ideas that would make BloxRadar different are mostly in data it does not collect.

---

## Data we can actually get

Tested 2026-10-28 with no login. "Works" means it returned real data without a cookie or API key.

| Data | Endpoint | Status |
|---|---|---|
| Players now, visits, favorites, genre (two levels), creator, created, **updated** time, max players per server, private servers allowed, avatar type, licensed flags | `games.roblox.com/v1/games?universeIds=` | Works. Already used. |
| Likes and dislikes | `games.roblox.com/v1/games/votes?universeIds=` | Works, takes many ids at once. |
| **Badges with awarded-yesterday count and win rate** | `badges.roblox.com/v1/universes/{id}/badges` | Works. 100 per page. This is the most useful new source, see the first idea. |
| **Gamepasses with name, price, on sale, created and updated dates** | `apis.roblox.com/game-passes/v1/universes/{id}/game-passes?passView=Full` | Works now. The older `games.roblox.com/v1/games/{id}/game-passes` returns 404, which is probably why the August report saw failures. |
| Developer products with name, price, on sale | `apis.roblox.com/developer-products/v2/universes/{id}/developerproducts` | Works. Some products show a null price, so treat it as partial. |
| Public servers: players per server, max, server fps and ping | `games.roblox.com/v1/games/{placeId}/servers/Public` | Works, 100 servers per page. A game with 800K players has thousands of servers, so this is only practical for smaller games or a sample. No region field. |
| Events (title, category such as new content, start and end time, status) | `apis.roblox.com/virtual-events/v1/universes/{id}/virtual-events` | Works. Gives a public schedule of announced updates. |
| Age and content maturity rating | `apis.roblox.com/experience-guidelines-api/experience-guidelines/get-age-recommendation` (POST) | Works. |
| Supported languages | `gameinternationalization.roblox.com/v1/supported-languages/games/{id}` | Works. |
| Media list (images, preview video ids) | `games.roblox.com/v2/games/{id}/media` | Works. |
| Icons and thumbnails | `thumbnails.roblox.com/v1/games/icons` and `/multiget/thumbnails` | Works. URLs contain "180DAY", so they look like they expire; store the image id or re-fetch, do not rely on old URLs. |
| Group member count, owner, verified badge | `groups.roblox.com/v1/groups/{id}` | Works. |
| Places inside a universe | `develop.roblox.com/v1/universes/{id}/places` | Works. |
| Explore charts by country and device | `apis.roblox.com/explore-api/v1/get-sorts?country=&device=` | Works. The trending list for `ph` and `br` differs from `all`. |
| Social links (Discord, YouTube, X) | `games.roblox.com/v1/games/{id}/social-links/list` | **Needs login (401).** Not available publicly. |
| Revenue, DAU, retention, session length | none | **Not published.** Roblox shows these only to the game's owner in Creator Analytics. The "Top Earning" chart order is the only public revenue signal. |
| Historical player counts from before we started | none | **Not available.** History starts the day BloxRadar starts collecting. |
| Total players on Roblox right now | none found | Not tested further. We can sum our tracked games, but that is a subset. |

### Daily players from badges

Each badge returns `pastDayAwardedCount` and `winRatePercentage`. Dividing the first by the second gives the same number for every badge in a game, and that number lines up with daily players:

| Game | Badge | Awarded past day | Win rate | Quotient |
|---|---|---|---|---|
| Steal An Egg | WELCOME! | 1,327,819 | 0.059 | 22.5M |
| Steal An Egg | Hatched Secret! | 450,950 | 0.020 | 22.5M |
| Steal An Egg | The Hollow 26 | 297,758 | 0.013 | 22.9M |
| Clean all the leaves! | SECRET ENDING | 11,267 | 0.127 | 88.7K |
| Clean all the leaves! | Halloween Event | 78,587 | 0.884 | 88.9K |

Steal An Egg had 871,205 players at the time and Clean all the leaves! had 3,289. Both give a ratio of about 26 to 27 daily players per concurrent player, which is a normal ratio. So the quotient reads as daily unique players. This is my reading of the numbers, not something Roblox documents. Limits:

- The win rate has three decimal places. A badge with a win rate of 0.001 can be off by up to half, so only use badges with a win rate of 0.05 or more.
- It only works for games that have at least one badge someone earned yesterday. Most active games have one.
- I do not know whether "past day" is a rolling 24 hours or a calendar day. Read it once a day at the same time.
- A "welcome" or "joined" badge has a win rate equal to the share of yesterday's players who were new. For Steal An Egg that is 5.9%.

---

## Ideas that help Tang as a developer and that roterminal does not have

### Daily players and new-player share for every game

**What it is.** Show an estimated daily player count and the share of yesterday's players who were new, for every tracked game, built from badge statistics as described above.

**Who it helps.** Developers judging whether a game is growing because it keeps players or because it is pulling in new ones. A game with high daily players but a falling new-player share is held up by players it already had, and is not attracting many new ones. A high new-player share with flat daily players means people try it and leave. Roblox shows this to owners only. Nobody else shows it publicly, as far as I found.

**Data.** Badge endpoint, once a day per game. About 900 games at 1 to 5 pages each is a few thousand calls a day.

**Effort.** Medium. The arithmetic is simple. Choosing the right badge (a high win rate one, and a name match for "welcome", "joined", "played" for the new-player share) needs a few rules and a manual override.

**When.** Before launch if possible, because history only starts when collection starts. Even if the page comes later, start storing the numbers now.

### Progression funnel from badges

**What it is.** For games whose badges mark progress (reached area 2, hatched a secret, secret ending), show what share of daily players reached each one, sorted into a funnel.

**Who it helps.** Developers designing their first session and pacing. Example: 12.7% of Clean all the leaves! players earned the secret ending yesterday. Seeing those numbers for successful games gives real benchmarks for "how many players should reach the second zone". Ties directly to the first-session and progression work Tang already does.

**Data.** Same badge calls. Badge names and descriptions need light manual tagging for the top games, or simple keyword rules.

**Effort.** Medium.

**When.** After launch. Store the data from day one.

### Gamepass and developer product price benchmarks

**What it is.** A page that answers "what do games like mine charge". For each genre: median price of a 2x money pass, a VIP pass, an extra slot, a starter pack; how many passes a top game has; the cheapest and most expensive. Each game page lists its passes and products with prices.

**Who it helps.** Any developer setting prices. The August report had to mark every monetisation line as inferred. Now it can be measured. Example from today: Steal An Egg has only two passes (399 and 467 Robux). Clean all the leaves! has five, most at 25 to 50 Robux, plus one at 599.

**Data.** Gamepass and developer product endpoints. Pass names need grouping into types (2x, VIP, slot, skip) by keyword.

**Effort.** Medium. Collecting is small, grouping names into types is the work.

**When.** Collecting before launch. The benchmark page can follow shortly after.

### Change log: titles, thumbnails, icons, prices, events

**What it is.** For each game, a dated list of every change we can see: title (Roblox games rename often, for example "[🎃] Adopt Me!"), icon, thumbnails, description, gamepass prices and new passes, announced events. Each entry shows players in the 24 hours after against the same hours a week earlier. A site-wide feed shows the biggest changes of the day.

**Who it helps.** Developers who want evidence about what works: did a new thumbnail move players, did a seasonal title tag help, did a price cut raise anything. roterminal tracks updates (version releases) and their effect, but not thumbnails, titles or prices. SteamDB's price and patch history is its most used feature, and this is the Roblox version of that.

**Data.** Games endpoint (name, description, updated), thumbnails and icon endpoints (compare image ids), gamepass endpoint, events endpoint. Compare against the last stored value each run.

**Effort.** Medium. The "after against a week earlier" comparison is the same calculation for every change type.

**When.** Collect before launch. Thumbnail change detection is the piece most worth having early, because it matches what Tang studies most.

### Full lifecycle tracking, including games that fall off the charts

**What it is.** Once a game appears in any chart, keep polling it after it drops out (hourly is enough), so its whole curve is recorded. Then show each game's position on a typical curve: days since launch, days since peak, share of peak remaining. A "where did they go" page lists games that charted and have since lost more than 90% of their peak.

**Who it helps.** This is the gap the cycles report names as its biggest limit: "anything that launched and died between snapshots is invisible". It makes the five-month rise and the collapse measurable instead of reported. It also tells a developer whether a format is still early or already past its peak.

**Data.** Existing collector, plus a list of "retired" games polled at lower frequency. The games endpoint takes many ids per call, so the cost is small.

**Effort.** Small for the collection. Medium for the curve comparison page.

**When.** Before launch for collection. This is cheap now and impossible to recover later.

### Launch cohorts and benchmark curves

**What it is.** Group games by the week they were created. For each group, show how many reached 1K, 10K and 100K players, and the median curve of the ones that charted. A developer can pick a game (their own or any other) and see it plotted against its cohort.

**Who it helps.** A developer with a game in its first weeks who wants to know if it is ahead of or behind similar launches. The August report's survival table (70 games aged 0 to 3 months still charting, single digits for months 6 to 14) becomes a live page.

**Data.** Stored history and created dates. Needs the lifecycle tracking above to avoid only counting survivors.

**Effort.** Medium.

**When.** After launch, once there are a few months of history.

### Idea check

**What it is.** Type a concept or a title word ("leaves", "steal", "escape"). Get every tracked game with that word in its title or description, with players now, peak, age, and whether it is still alive, plus how many new games used the word in each of the last few months.

**Who it helps.** A developer deciding whether to build an idea, and how crowded it is. roterminal's trend word lookup does part of this, counting titles only. Adding description text, peaks, and how many of those games survived 30 and 90 days makes it a decision tool.

**Data.** Stored titles and descriptions, history, lifecycle tracking.

**Effort.** Small to medium. MySQL full text search on Hostinger is enough.

**When.** Before launch in a simple form (titles only), extend after.

### Release and update calendar

**What it is.** A calendar of announced events and updates from the top games, from the events endpoint, plus a heat map of when the tracked games ship updates (day of week, hour). Also shows the hours when total players across tracked games peak, by day of week.

**Who it helps.** Developers choosing when to launch or update. If three of the top ten games have big updates announced for Saturday, a small game may want to avoid that weekend. The cycles report's launch timing advice becomes something that updates itself.

**Data.** Events endpoint (with start and end time and category), the `updated` timestamp, hourly history.

**Effort.** Medium.

**When.** After launch.

### Track any game, including your own

**What it is.** Let anyone add a game by link or id, even if it is not on any chart. It gets polled like charted games. A developer can follow their own game against competitors and against the cohort curves.

**Who it helps.** Small developers whose games never chart. Creator Analytics shows them their own numbers, but not anyone else's next to theirs.

**Data.** Same endpoints. Needs a cap on how many extra games are tracked, to protect the API budget.

**Effort.** Small to medium. Without accounts, it can be a simple "start tracking" button with a daily limit per IP.

**When.** After launch.

---

## Ideas that make the main dashboard better

### All-time and 24-hour peaks, with "new record today"

**What it is.** Every game page shows its highest player count since tracking began, when it happened, and the 24-hour peak and low. A home page list shows games that set a new peak today. The dashboard already plans "new highs", so this is about making the peak a visible number on every page.

**Who it helps.** Everyone. On SteamDB this is the most looked-at number. It also fixes the problem in the August report that a single reading swings by more than 2x through the day.

**Data.** Stored readings.

**Effort.** Small.

**When.** Before launch.

### Health score that separates past success from current health

**What it is.** Show a few plain numbers side by side instead of lifetime visits alone: players now against 30 days ago, daily players (from badges), like ratio and its 30-day change, favorites added per day. A short label such as "growing", "steady", "falling", "collapsed" is based on those, with the rule shown.

**Who it helps.** Visitors who would otherwise read MeepCity's 16.3B visits as a big game.

**Data.** Games, votes, badges, stored history.

**Effort.** Small to medium.

**When.** Before launch, in a simple form.

### Like ratio and favorites over time

**What it is.** Store votes and favorites with every hourly average, so pages can show whether a game's rating is rising or falling, especially after an update.

**Who it helps.** Developers checking whether an update was received well. Like ratio after an update is a better sign of reception than player count alone.

**Data.** Votes endpoint (batch), favorites from the games endpoint.

**Effort.** Small.

**When.** Before launch. It is one extra call per run.

### Country charts as a feature

**What it is.** Collect the explore charts for a handful of countries (for example US, Philippines, Brazil, Indonesia, Mexico, Germany) and show what is trending in each that is not trending globally.

**Who it helps.** Developers looking for audiences that are not saturated. The trends report found Karinderya! (a Filipino eatery game) at 95% approval and called regional subject matter underserved. roterminal has country charts in its command line tool, so this is not unique, but showing "trending here and not globally" is a different view.

**Data.** get-sorts with `country=`. 26 charts per country every run multiplies the calls, so collect countries once an hour, not every 10 minutes.

**Effort.** Small to medium.

**When.** After launch.

### Studio pages with group size and full catalogue

**What it is.** Studio and solo developer pages show group member count over time, verified status, every game they own with current and peak players, and their combined players now.

**Who it helps.** Developers studying who keeps producing hits, and looking for collaborators.

**Data.** Groups endpoint, games by group or user, stored history.

**Effort.** Small.

**When.** Before launch for the basics (already planned), member count history after.

### Server health for smaller games

**What it is.** For games under a set size (say 20K players), page through public servers and show server count, how full servers are, and median server fps and ping.

**Who it helps.** Developers comparing performance and server size settings. A game whose servers run at 40 fps is likely losing players to lag.

**Data.** Servers endpoint. Each page is 100 servers, so a 20K-player game with 30-player servers is about 7 pages.

**Effort.** Medium, mostly from keeping calls within limits.

**When.** After launch. Low priority.

### Content filters: maturity, languages, licensed, private servers

**What it is.** Filters on lists and search for age rating, supported languages, officially licensed, and whether private servers are allowed.

**Who it helps.** Developers comparing like with like, and parents.

**Data.** Age recommendation endpoint, languages endpoint, games endpoint flags. These change rarely, so fetch once a week.

**Effort.** Small.

**When.** After launch.

---

## Ideas for reaching people

### Weekly written brief

**What it is.** A short weekly page in the style of Tang's August reports: what launched, what is rising, which title words are spreading, which big games collapsed, with every number linked to its source page. Generated from the data with Tang's notes added.

**Who it helps.** Developers who will not dig through tables. It also gives the site something to share and a reason to come back each week. Nothing else in this space does a dated written summary well.

**Data.** Everything already stored.

**Effort.** Medium for a generated draft. Tang's own notes are the part that makes it worth reading.

**When.** Soon after launch. The first few can be written by hand.

### Discord webhook alerts

**What it is.** A visitor pastes a Discord webhook URL and picks what to watch: a game, a genre, a title word, or "any new game passing 10K players". BloxRadar posts there when it happens.

**Who it helps.** Roblox developers mostly coordinate on Discord, so alerts there get seen. roterminal has live watch in its tool, but not alerts pushed to Discord.

**Data.** Stored history and change log. Webhook URLs are the only personal data stored.

**Effort.** Medium.

**When.** After launch.

### Thumbnail board

**What it is.** A page that shows the current thumbnails of a chart (Up-and-Coming, a genre, a title family) as a grid at real phone size, with players and age under each. Clicking one opens its thumbnail history from the change log.

**Who it helps.** Developers designing thumbnails, which is a large part of Tang's own research. roterminal shows no images at all, so this alone makes BloxRadar look and work differently.

**Data.** Thumbnails endpoint, stored image ids.

**Effort.** Small.

**When.** Before launch.

### Public data API and embeds (later)

**What it is.** A small read-only JSON API and an embeddable player-count chart for game pages, DevForum posts or Discord bots.

**Who it helps.** Developers and community sites. roterminal already offers a CLI and MCP connector, so this is catching up rather than different.

**Effort.** Medium, plus caching to protect the shared host.

**When.** Well after launch.

---

## Things not to build

- **Revenue estimates.** Roblox does not publish revenue, and there is no public number like Steam review counts to base a model on. RoWatcher shows estimates without saying how they are made. A made-up number would undercut the "measured" approach. If something is shown, show the Top Earning chart position and the gamepass price list, and say in plain words that revenue is not public.
- **Anything involving Robux** (giveaways, trading, betting on games). Roblox has acted against Robux gambling and trading sites, and it would bring in the wrong audience.

---

## How BloxRadar could look and feel different from roterminal

roterminal presents itself as a terminal: plain text, tables, a command-line tool and an AI connector, aimed at people who want to query data quickly. Its tone is terse.

BloxRadar can be positioned as **a site made by a Roblox developer, for deciding what to build and when**. That is a different question from "what is happening right now", and it uses data roterminal does not collect.

- **Show the games, not only the numbers.** Thumbnails and icons on every list, at the size they appear on a phone. Roblox discovery is visual, Tang's research is visual, and roterminal is text only.
- **Explain every number on the page.** A short "how this is measured" line next to each metric, and a clear mark on anything estimated (daily players from badges) versus counted (players now). This is the measured versus reported habit from Tang's reports, and it builds trust.
- **Write things down.** A dated weekly brief and dated change logs make the site feel like a record kept by someone who follows the platform, not a feed.
- **Free history.** roterminal limits history and update logs by plan. Keeping full history free, at least for the first while, gives people a reason to switch.
- **A visual identity of its own.** Avoid the dark terminal look and avoid anything that resembles Roblox's own logo, colors or fonts. The radar idea in the name can give a simple mark and a colour, but the identity should not lean on Roblox's.
- **Credit and voice.** An "about" page saying who built it and why, as a developer, gives it a person behind it, which none of the comparable sites have.

---

## Things that could cause trouble

### Roblox trademarks and the name

- Roblox owns many registrations for ROBLOX. In 2024 it filed an opposition at the US trademark office against an application for "HOT BLOX" and cited its BLOXY mark as well as ROBLOX ([TTAB 91289835](https://ocr.docketalarm.com/cases/TTAB/91289835/Roblox_Corporation_v._High_5_Games_LLC)). The outcome is not visible in the summary. So Roblox has contested "Blox" names at least when someone tried to register them.
- Many fan sites use "Blox" or "Ro" in their names (Rolimons, RoMonitor, RoWatcher, roterminal) and I found no record of action against them. That is not permission.
- Roblox's name and logo guidelines bar use of the Roblox name "and any name similar to Roblox" on commercial content without a licence, and do not permit using the logo in your own work. I could not load the full page (it returned 403), so this is from a search summary.
- Practical steps: do not use the Roblox logo, its fonts, or a logo that looks like it. Do not put "Roblox" in the domain. Add a line in the footer such as "BloxRadar is not affiliated with or endorsed by Roblox Corporation." Use "Roblox" only to describe what the site covers. Do not try to register "BloxRadar" as a trademark without legal advice, since the HOT BLOX opposition suggests Roblox would contest it.

### Terms of use and the API

- Every Roblox API response includes the header `x-terms-message: Terms apply https://rblx.co/TOU`. The Roblox Terms of Use include restrictions on automated access. I could not load the terms page (403) to quote the current wording. Tang should read the current version herself. Every comparable site uses the same public endpoints, but that does not make it allowed.
- Most of the endpoints we use are not documented and can change or close without warning. The gamepass endpoint has already moved once (the old one now returns 404). The collector should log failures clearly and keep running when one source breaks.
- Roblox Open Cloud is the official API with API keys and published limits. It does not cover cross-game public data like charts, so it does not replace what we use, but it is worth checking before adding new sources.

### Rate limits

- Roblox does not publish limits for these web endpoints, and the responses I tested carried no rate limit headers. If we hit a limit, it returns HTTP 429.
- On Hostinger shared hosting the outgoing IP address is shared with other customers. If someone else on the same server is sending Roblox a lot of requests, our calls can be blocked too. A guess, but it is a known pattern with shared hosting.
- Keep the 10-minute run small (charts plus batched game and vote calls). Put badges, gamepasses, events, age ratings and languages on a daily or weekly schedule, spread across the day rather than all at once. Back off for a few minutes after any 429.
- Do not let visitor actions (search, "track this game") call Roblox directly. Queue them for the next collector run.

### Visitors who are children

- Many people interested in Roblox stats will be under 13. If the site ever adds accounts, comments, email alerts or ads, children's privacy law (COPPA in the US, similar rules in the UK and EU) applies. The Discord webhook idea stores no personal data beyond the webhook URL, which keeps it simple. Accounts should come late, if at all.

### Thumbnails and game images

- Thumbnails belong to the game creators. Showing current thumbnails linked from Roblox's CDN is what every tracker does. Keeping a permanent archive of old thumbnails on our own server is a step further. Storing image ids and small copies for the change log is a guess at a reasonable line. Remove a game's images on request.

---

## Suggested order

Before launch, mainly because history cannot be recovered later:

1. Keep polling games after they leave the charts.
2. Start storing badge statistics (daily players and new-player share), gamepass and product prices, votes, and thumbnail ids daily.
3. Peaks on every page, a simple health label, the thumbnail board, a simple idea check.
4. Footer disclaimer and no Roblox branding.

After launch:

5. Daily players and new-player share on game pages.
6. Change log with before and after comparison.
7. Price benchmarks by genre.
8. Weekly brief.
9. Cohort curves, progression funnels, calendar, Discord alerts, track any game.
10. Country views, server health, filters, public API.
