# How other game and creator platforms handle discovery of new content (for BloxRadar)

Research date: 2026-10-28. Years are labelled on each finding. Anything not backed by a link is in Gaps or marked as a guess.

## 1. Steam: what moves visibility, and what share of releases get noticed?

### Takeaway
Steam is flooded the same way Roblox is: about 19,100 games released in 2025 and roughly half got fewer than 10 reviews. Visibility runs up a ladder that starts with wishlists (Popular Upcoming), then launch revenue (New & Trending), then Discovery Queue and "More Like This". Next Fest works mainly for games that already have an audience: pre-fest wishlists are the strongest predictor of fest wishlists. Third-party sites (SteamDB, Steam 250, GameDiscoverCo) built real audiences purely by re-ranking public data, which is the closest model for BloxRadar.

### Cited Findings
- 2025: 19,112 games launched on Steam; 9,327 (about 48.8%) had fewer than 10 user reviews; 2,229 had zero reviews (SteamDB data). [PC Gamer](https://pcgamer.com/gaming-industry/more-than-19-000-games-launched-on-steam-this-year-but-almost-half-have-fewer-than-10-reviews/); [TechSpot](https://www.techspot.com/news/110592-nearly-half-19000-games-released-steam-year-went.html)
- 2024: 43.56% of Steam releases got fewer than 10 reviews, so the share rose in 2025. [WN Hub](https://wnhub.io/news/analytics/item-49561)
- 2025: Steam players spent only 14% of their playtime on games released in 2025; most time went to older games. [MP1st](https://mp1st.com/news/only-14-of-steam-playtime-went-to-2025-games)
- 2025: Valve's developer Year in Review listed a Discovery Queue overhaul, Daily Deal spotlights and monthly themed sales as notable changes; one summary cites a 274% revenue increase from Daily Deals. [KitGuru](https://www.kitguru.net/desktop-pc/mustafa-mahmoud/valve-shares-developer-focused-steam-year-in-review-2025/)
- 2024, Chris Zukowski (How To Market A Game): Valve trusts signals in this order: traffic (not at all), wishlists (medium), purchases/revenue (high). Wishlists directly affect only Popular Upcoming. Popular Upcoming leads to New & Trending, then Discovery Queue and "More Like This". Entry to New & Trending depends on an unpublished revenue threshold. [howtomarketagame.com](https://howtomarketagame.com/2024/01/29/do-wishlists-matter-any-more/)
- 2024, Zukowski: a featured game on Popular Upcoming gets roughly 750 to 2,000 wishlists per day. Wishlist-to-sale conversion ranges from about 1% to 40%. Wishlist velocity matters more than a slow total (7,000 in a month beats 30,000 over seven years). [howtomarketagame.com](https://howtomarketagame.com/2024/01/29/do-wishlists-matter-any-more/)
- The common rule of thumb is about 7,000 wishlists to reach Popular Upcoming, but Valve has never published a number, and secondary sites disagree on tiers. [Steam Page Analyzer](https://www.steampageanalyzer.com/blog/steam-popular-upcoming-list); [presskit.gg](https://presskit.gg/field-guides/how-to-build-steam-wishlist)
- Feb 2025 Next Fest: 2,244 games took part; Zukowski's survey got 208 responses (about 9.2% of entrants) and sorted games into tiers from Bronze (0 to 999 fest wishlists) to Diamond (10,000+). [howtomarketagame.com](https://howtomarketagame.com/2025/03/04/steam-next-fest-feb-2025/)
- 2026 follow-up (secondhand): 182 developers surveyed; the strongest correlation was between pre-fest wishlists and fest wishlists (Spearman r = 0.825). Treat as secondhand. [Cinevva guide](https://app.cinevva.com/guides/steam-next-fest-strategy)
- June 2025 Next Fest: top demo (Stellar Blade) gained 227,200 wishlists; GameDiscoverCo publishes full festival data spreadsheets. [Game World Observer](https://gameworldobserver.com/2025/06/19/gamediscoverco-named-the-games-with-the-most-wishlists-following-the-june-2025s-steam-next-fest); [GameDiscoverCo Oct 2025](https://newsletter.gamediscover.co/p/who-won-october-2025s-steam-next)
- 2024, Zukowski "double jump": entering Next Fest with a demo early, then again later, as a tactic. [howtomarketagame.com](https://howtomarketagame.com/2024/06/18/the-double-jump-trick-to-steam-next-fest/)
- Steam 250 (third party): ranks games only by Steam review votes, combining count and approval percentage with a tuned weight; tested seven algorithms; refreshes at least daily by scanning store pages. Has a separate Hidden Gems list for high approval but few reviews. [Steam 250 About](https://steam250.com/about); [PC Gamer](https://pcgamer.com/this-algorithm-picks-out-steams-best-hidden-gems)
- Older (2017) hidden-gems approach by a developer named Wok: popularity score = alpha / (alpha + total players), alpha around 2.8 million, multiplied by a quality score from SteamDB review ratio. This rewards high-quality games with few players. [PC Gamer](https://pcgamer.com/this-algorithm-picks-out-steams-best-hidden-gems)

### Inferences
- The Steam ladder is: early interest signal, then a gated launch window with a threshold, then personalised long-tail placement. A third-party site cannot grant placement, but it can publish the early-interest signal (BloxRadar equivalent: favourites, follows, visit growth in the first days) as its own "Popular Upcoming" style list.
- The Steam 250 / Wok formula ports directly to Roblox public data: like ratio as quality, visit or CCU count as the popularity penalty. A "Hidden Gems" list (high like ratio, low visits, enough votes to be trusted) is cheap to build and naturally favours small creators.
- Next Fest mostly amplifies games that already have momentum. A BloxRadar "fest" would need a separate lane for zero-audience games or it will repeat that pattern. (Guess, based on the r = 0.825 finding.)

### Gaps
- Steam Curators and the Interactive Recommender: no 2023-2026 evidence found on their effect for small games within this research budget.
- Valve's own figures on what share of Discovery Queue impressions go to new releases were not found.

## 2. Web game portals and indie hubs: itch.io, Newgrounds, Poki, CrazyGames (Game Jolt, Kongregate, Armor Games)

### Takeaway
Poki and CrazyGames run the clearest "small traffic test, then promote" pipelines in games: every new game gets a measured sample of real players, judged on playtime and retention, and only winners get broad exposure. Newgrounds uses a crowd version of the same idea: new uploads sit in a hidden-score judgement period and are deleted or kept by vote thresholds. itch.io relies on jams plus a mostly opaque "New & Popular" sort and a human-curated front page.

### Cited Findings
- Poki Playtesting: developers pick a category audience; a small group plays once; each playtest returns 10 session recordings with inputs, console output, play length, country and device. [Poki docs](https://sdk.poki.com/playtesting)
- Poki Player Fit Test: requires watching at least 5 playtest recordings first; result is a play-time histogram across 500 players; limited to 2 test requests per day. [Poki docs](https://sdk.poki.com/player-fit)
- A third-party guide says 125 of 500 players (25%) must play 3+ minutes to pass. Not confirmed on Poki's own pages. [Cinevva (German)](https://app.cinevva.com/de/guides/publish-game-poki)
- Poki Web Fit Test: Poki assigns the game to several categories (it can override the developer's choice) to build a balanced audience; runs 3 to 5 days; cannot be stopped once started; passing is required for Final Review. A failed test is described as "needs more work", not "bad game". [Poki docs](https://sdk.poki.com/web-fit-test); [Poki help](https://sdk.poki.com/web-fit-help)
- Poki release: soft release to a subset of the audience; a Technical Test releases globally but only in the "new games" category, which limits plays to about 5,000 a day; soft release slots take 1 to 2 weeks to schedule. [Poki release process](https://sdk.poki.com/releaseprocess)
- Google's developer blog profiled Poki's pre-launch testing as a model. [Google Developers Blog](https://developers.googleblog.com/en/app-monetization-insights-how-poki-cleverly-tests-their-games-before-launching)
- CrazyGames Basic Launch: a 2-week test with a limited audience; ads off (so data is not skewed) and SDK not required. Full Launch requires SDK and QA and turns on revenue share. If all metrics hit benchmarks the game is invited to Full Launch; if some do, it can improve and retry; if most fail, it cannot advance. [CrazyGames docs](https://docs.crazygames.com); [FAQ](https://docs.crazygames.com/faq/)
- CrazyGames benchmarks: successful games often reach 10+ minutes average session playtime; strong games often hit 10 to 15% Day 1 retention. Developer dashboard shows players, average playtime, gameplay conversion, retention, revenue. [Basic launch metrics](https://docs.crazygames.com/resources/basic-launch-metrics/); [Requirements](https://docs.crazygames.com/requirements/intro/)
- Newgrounds "Under Judgment": new uploads are voted 0 to 5; score, reviews and favourites are hidden from everyone but reviewer and author during judgement; low scorers are "blammed" (deleted) automatically. Thresholds changed on 6 Dec 2024 to 1.0 at 40 votes, 1.5 at 50 votes, 2.0 at 60 votes (previously 1.0/100, 1.25/150, 1.6/200). Community wiki source. [Newgrounds wiki](https://newgrounds.wiki.gg/wiki/Under_Judgment)
- itch.io: no official documentation of how "New & Popular" ranks. Third-party guides say it mixes historical and recent activity (views, downloads, plays) with recent weighted more, has a short post-release window, and that the front page is hand-picked by staff. Jams are described as putting "real eyes" on a game when nothing else will, without directly boosting the Popular sort. All secondhand. [Cinevva itch guide](https://app.cinevva.com/guides/get-more-plays-itch-io); [Luden.io post-mortem](https://blog.luden.io/how-we-stayed-on-the-front-page-of-itch-io-for-over-a-month-8e0d0cf1cc17); [itch.io browse update](https://itch.io/updates/say-hello-to-the-new-browse-search-pages)

### Inferences
- The portal test (small fixed sample, judged on playtime and Day 1 retention, ads off) is the most proven fair mechanism found. BloxRadar cannot route players, but it can run a voluntary version: a "New Games Test" list where opted-in players are sent to a fixed number of new games and BloxRadar measures return visits through public visit/CCU deltas. (Guess at feasibility.)
- Newgrounds' hidden-score judgement period is a cheap defence against bandwagon voting and is directly copyable for any BloxRadar community rating of new games.

### Gaps
- Game Jolt, Kongregate and Armor Games: no 2023-2026 sources gathered within the research budget. Kongregate's and Armor Games' relevance has declined since Flash ended (general knowledge, not sourced here).

## 3. Fortnite Creative / UEFN Discover and Fortnite.gg

### Takeaway
Fortnite is the closest analogue to Roblox. Epic deliberately shows every new or updated island to a slice of players across Discover rows, then promotes islands that keep players engaged; most rows are algorithmic (players, party share, return rate) with a small curated "Epic's Picks" row tied to CCU thresholds. Fortnite.gg shows that a third-party tracker built on a public data API becomes the default place creators and players check island stats.

### Cited Findings
- Most Discover rows are algorithmic, using metrics like player count, percentage of players in parties, and how often players return. "Epic's Picks" is curated by an editorial team. Epic says surfacing unproven islands to a subset of players gives every creator a chance, and admits this sometimes shows lower-quality islands. [Fortnite: How Discover works](https://www.fortnite.com/news/how-fortnite-discover-works) (page returned 403 to direct fetch; content via search summary)
- Aug 2024: new and updated islands are tested across various Discover rows; based on engagement during these tests they may qualify for other spaces. Epic reported a significant rise in new and updated islands reaching 50,000 impressions in their first week. Personalisation ("For You") uses preference, attraction, engagement and satisfaction metrics. Epic says it does not favour new creators over existing ones. [Fortnite: Discover questions answered](https://www.fortnite.com/news/the-fortnite-discover-section-your-questions-answered); [Evolving Discover together](https://www.fortnite.com/news/evolving-fortnite-discover-together)
- July 2025 Epic's Picks overhaul: four islands highlighted per week with large thumbnails and autoplay trailers; a Pick above 4,000 CCU may enter the Trending row; above 2,000 CCU after 7 days may be recommended for in-game news. [Fortnite: Epic's Picks update](https://www.fortnite.com/news/epics-picks-update-putting-originality-creativity-and-innovation-in-the-spotlight-in-fortnite)
- Oct 2025: Epic's Picks added priority themes (physics games, sports/competitive variety, social games) through Dec 2025. Chapter 7 added a creator banner, a "Following" tab, and changes to the "New and For You" row that controls how new content is tested. [Fortnite news](https://create.fortnite.com/news/epics-picks-update-putting-originality-creativity-and-innovation-in-the-spotlight-in-fortnite); [GamesBeat](https://gamesbeat.com/fortnites-discover-updates-are-boosting-creators-traffic-and-revenue/)
- Epic said it is taking cues from streaming services (HBO Max) for personalised rows. [GamesBeat](https://gamesbeat.com/why-fortnites-new-discover-system-is-taking-cues-from-streaming-platforms-like-hbo-max/)
- 2025-2026: Epic added a paid Sponsored Row; revenue from it goes 100% into the creator engagement pool until end of 2026, then 50%. [VGC](https://www.videogameschronicle.com/news/fortnite-will-soon-let-island-creators-sell-in-game-items-and-pay-to-appear-in-a-new-sponsored-row)
- From June 2026, Epic says thumbnails and presentation will have greater impact on Discover visibility. [Epic docs: How Discover works](https://dev.epicgames.com/documentation/uefn/how-discover-works-in-fortnite)
- Fortnite Data API: public, no authentication, covers last 10 minutes / hour / 24 hours with 7 days of history, only for public discoverable islands; Epic explicitly expects third-party analytics sites to use it. [Fortnite: Data API](https://www.fortnite.com/news/fortnite-data-api-unlocks-more-island-insights-for-creators)
- Fortnite.gg island pages show current players, 24-hour peak, all-time peak, unique players, favourites and average playtime with charts from 1 hour to all-time. [fortnite.gg example](https://fortnite.gg/island/5275-3043-8273)
- Other third-party tools (Island Pulse) sell CCU and retention alerts for followed islands. [Island Pulse](https://mwm.ai/apps/island-pulse-creator-stats/6792227135)

### Inferences
- Epic's CCU thresholds (2,000 and 4,000) show the platform itself promotes on concurrency and retention. BloxRadar already tracks CCU, so a "fast risers among new games" list (for example games under 30 days old crossing a CCU step) mirrors Epic's own logic using only public data.
- Fortnite.gg's value to creators is a public, linkable stats page per island. BloxRadar's per-game pages are the same asset; adding a shareable "new game card" creators can post is a low-cost growth loop. (Guess.)

### Gaps
- No source found on how creators specifically use Fortnite.gg in their marketing workflow, or Fortnite.gg's traffic numbers.
- No published share of players who see new islands in tests.

## 4. Non-game parallels for the cold-start problem

### Takeaway
The repeated pattern across TikTok, Product Hunt, Hacker News and Spotify is a guaranteed small first exposure, a fast measurement of real engagement, then promotion or a stop. Several also add a second chance for things the first pass missed (HN's pool) or a fixed release-day slot (Product Hunt days, Spotify Release Radar Fridays). Sources on TikTok and Product Hunt internals are mostly unofficial.

### Cited Findings
- TikTok: new videos go to a small first batch, then to larger batches if completion rate and watch time are strong; distribution stops if not. Batch size (one guide says 200 to 500 viewers) and whether the first batch is followers or random non-followers are disputed; a late-2025 guide says it shifted toward followers first. No official TikTok source found. [Tubefilter 2019](https://www.tubefilter.com/2019/08/15/tiktok-creators-and-their-fans-are-trying-to-crack-its-recommendation-algorithm-report/); [SocialPilot 2026](https://www.socialpilot.co/de/blog/tiktok-algorithm); [Virlo](https://virlo.ai/glossary/tiktok-algorithm)
- Hacker News: ranking uses votes divided by age raised to a "gravity" exponent (commonly 1.8) with penalties; published code is incomplete. [righto.com 2013](https://www.righto.com/2013/11/how-hacker-news-ranking-really-works.html)
- Hacker News Second-Chance Pool (since late 2014): moderators and a few reviewers pick older submissions that got overlooked; software randomly places one at a time on the lower front page, and readers decide if it gets traction. Users can nominate by email; nominating others' work is preferred over your own. There is also an "invited" list where moderators ask submitters to repost. [dang on HN](https://hn.svelte.dev/item/26998308)
- Product Hunt: featured share reportedly dropped to 25% in Jan 2024 and about 16 featured products per day by Sept 2024; another source says about 10% of launches are featured. CEO reportedly said they "can't just feature everyone's AI wrapper". Community-derived claims say ranking is randomised for the first 4 hours, then sorted, and votes are weighted by account quality. All unofficial. [Awesome Directories guide](https://scour.ing/p/https://awesome-directories.com/blog/product-hunt-launch-guide-2025-algorithm-changes); [Playbooks skill guide](https://playbooks.com/skills/yoanbernabeu/producthunt-skills/ph-algorithm-guide)
- Spotify Release Radar (official): updates every Friday; any artist, signed or not, can pitch an unreleased track at least 7 days before release; a pitched track goes into all followers' Release Radar; one song per artist per listener per week. [Spotify support](https://support.spotify.com/artists/article/getting-music-on-release-radar/); [Spotify for Artists blog](https://artists.spotify.com/blog/behind-the-playlists-your-questions-answered-by-our-playlist-editors)
- Spotify Discover Weekly cannot be pitched; third-party guides say it is driven by saves, completions, low skips and playlist adds (unofficial). [Playlist Supply](https://playlistsupply.com/blog/release-radar-vs-discover-weekly/)

### Inferences
- Release Radar maps cleanly onto BloxRadar: users follow developers or groups, and BloxRadar sends a weekly "new from creators you follow" digest. Follower data would be BloxRadar's own, so this works without platform access.
- A randomised early ordering (Product Hunt style) on a "New today" list stops the first few minutes of votes from deciding everything, which helps fairness. (Guess at effect size.)
- An HN-style second-chance slot (a curated or random pick from games that launched weeks ago and had good like ratios but low visits) is cheap and fair.

### Gaps
- Reddit "rising", YouTube Shorts test pools, Letterboxd and Backloggd lists: not researched within budget; no sourced findings.

## 5. Platform-only data versus third-party data, and fairness / resistance to gaming

### Takeaway
The strongest platform mechanisms (Poki/CrazyGames tests, Fortnite and TikTok test pools, Steam revenue thresholds) depend on the platform controlling traffic and seeing private metrics such as playtime and retention. Third parties can only re-rank public counts (CCU, visits, likes, favourites, reviews), plus whatever they collect themselves (follows, votes, lists). The fair-to-small-creators mechanisms that need only public data are: ratio-based hidden gems lists, new-game risers measured in relative growth, curated weekly picks, and follow-based release digests.

### Cited Findings
- Fortnite publishes island metrics through a public, unauthenticated API meant for third-party sites, which is why Fortnite.gg can exist. [Fortnite: Data API](https://www.fortnite.com/news/fortnite-data-api-unlocks-more-island-insights-for-creators)
- Steam 250 and SteamDB-based analyses rely only on public review counts and store pages. [Steam 250 About](https://steam250.com/about); [PC Gamer](https://pcgamer.com/gaming-industry/more-than-19-000-games-launched-on-steam-this-year-but-almost-half-have-fewer-than-10-reviews/)
- Poki and CrazyGames tests use playtime, conversion and Day 1 retention, which only the host sees. [CrazyGames metrics](https://docs.crazygames.com/resources/basic-launch-metrics/); [Poki Player Fit](https://sdk.poki.com/player-fit)
- Valve trusts purchases over wishlists over traffic, because purchases are hardest to fake. [howtomarketagame.com](https://howtomarketagame.com/2024/01/29/do-wishlists-matter-any-more/)
- Newgrounds hides scores during judgement to stop bandwagon voting. [Newgrounds wiki](https://newgrounds.wiki.gg/wiki/Under_Judgment)
- Product Hunt reportedly weights votes by account quality and penalises manipulation (unofficial). [Playbooks skill guide](https://playbooks.com/skills/yoanbernabeu/producthunt-skills/ph-algorithm-guide)

### Inferences
Summary table (fairness and gaming ratings are my judgement, not measured):

| Mechanism | Data needed | Available to BloxRadar? | Fair to small creators | Hard to game |
|---|---|---|---|---|
| Steam 250 style Hidden Gems (like ratio, low visits) | Public likes, visits | Yes | High | Medium (like bots possible; needs a minimum vote count) |
| New-game risers by relative CCU/visit growth | Public CCU, visits over time | Yes (BloxRadar already polls) | High if measured as % growth with a floor | Medium (botted visits) |
| Popular Upcoming style list from early follows/favourites | Public favourites; BloxRadar follows | Yes | Medium (favours marketed games) | Medium |
| Release Radar style follow digest | BloxRadar's own follows | Yes | High for creators with any following | High |
| Curated weekly picks (Epic's Picks, itch front page) | Human editors | Yes | Depends on editors | High |
| Hidden-score community judgement (Newgrounds) | BloxRadar's own votes | Yes | High | Medium (needs account age limits) |
| HN second-chance pool | Editors plus random slot | Yes | High | High |
| Small-sample play test (Poki, CrazyGames, Fortnite, TikTok) | Traffic routing plus private retention | Only partly, via opted-in BloxRadar users and public visit deltas | Highest | High when platform runs it; weak for a third party |
| Revenue threshold (Steam New & Trending) | Private sales | No | Low | High |

- Bot-inflated Roblox visits would distort any public-count mechanism; ratio metrics and CCU sustained over several days are harder to fake than raw visits. (Guess.)

### Gaps
- No source found measuring how much traffic third-party discovery sites (Steam 250, Fortnite.gg) actually send to small games.
