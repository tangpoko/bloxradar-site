# Third-party tools for Roblox game discovery and promotion (competitive map, October 2026)

Research done 2026-10-28 with web search and page fetches (about 18 tool calls). Coverage is uneven: some sites
could be read in full (RoTerminal, RoPro listing, BLOXG, DevForum announcement), others only from search snippets
or not at all (Super Biz pricing, RoSeal, BTRoblox, Reddit threads, TikTok/YouTube channel stats). Gaps are listed
under each question. No em dashes used on purpose.

## 1. Analytics and discovery sites: what they offer for NEW or small games, and who sells promotion

### Takeaway
RoTerminal (roterminal.co) is the closest direct competitor to BloxRadar and is already ahead on several fronts:
live counts for every game, "rising" and "breaking out" lists, per-genre trend pages with "new this month" counts,
earnings estimates, a CLI and an MCP connector for AI tools, and paid plans from $9 to $99 a month. Rolimon's is free
and ad funded but only tracks games that are requested or already popular. None of the analytics sites found sells
featuring or promotion slots to developers.

### Cited Findings
**RoTerminal (roterminal.co)**
- Tagline "every Roblox game, live". Features: live player counts per game, daily history, most played now with
  day-over-day change, rising games (1 day and 7 day views, with an "Out since" release date), and "Trends" built
  from words in new game names comparing the last 30 days with the 30 before. Also `npx -y roterminal` CLI and an MCP
  connector for Claude or ChatGPT. The homepage said daily history runs "since Sep 27, 2026" (fetched Oct 2026). — [RoTerminal](https://roterminal.co/)
- Genre trend page example (Board games): 1,194 games, "290 new this month", tabs for Most played, Rising and New,
  each game shows creator, age (e.g. "27d"), current players, 24h change. A "Breaking out" box lists newer games with
  fast percent growth. A "Pro" upsell is shown but data was not behind a sign-in wall. — [RoTerminal Board trends](https://roterminal.co/trends/board)
- Pricing (fetched Oct 2026): Free (every tool with daily limits, 100 API/CLI calls a day); Plus $9/mo or $7/mo
  annual (unlimited earnings and game history, watchlist, alerts, screens, icon and thumbnail history, blue check);
  Pro $20/mo or $16/mo annual (unlimited AI answers, Discord alerts, unlimited API/CLI); Studio $99/mo or $79/mo annual
  plus $39/mo per teammate (team goals, Monday report, "update grades", ads vs organic players, spreadsheet export,
  "lower Marketplace fees", support chat). The table also lists "Clips campaigns" without explanation. No paid
  featuring or promotion of games was found. — [RoTerminal pricing](https://roterminal.co/pricing)
- Search snippets say RoTerminal game pages show a 24-hour high and daily visits, monthly Robux estimates are for
  signed-in users only, and it mentions buying and selling games and "Agreements". — [search result for roterminal.co](https://roterminal.co/g/10768003706-create-a-robot-fighter); [RoTerminal pricing](https://roterminal.co/pricing)
- There is also a separate PyPI package and a GitHub "roterminal-ai" plugin; a third-party Chrome extension
  ("roblox-game-stats") adds a stats panel on Roblox game pages using CreatorExchange, RoTerminal and RoTrends data. — [GitHub roterminal-ai](https://github.com/elijahmadonia/roterminal-ai); [GitHub roblox-game-stats](https://github.com/phasenull/roblox-game-stats)
- Note: roterminal.com is a different domain that also showed up in results; not checked. — [roterminal.com](https://roterminal.com/)

**Rolimon's (rolimons.com) game analytics**
- Launched March 2020 (DevForum post). Free, funded by ads ("All our features are free"). Tracks concurrent players,
  visits, likes, favorites, gamepass sales and prices, badge award counts and win rates, server ping/FPS. Most data
  every 10 minutes, gamepasses and badges every 24 hours. Has a "Game Table" for sorting/comparing and a "Promotion
  Rates" view (sponsorship and ad impressions per Robux). (2020 info) — [DevForum: Rolimon's Game Analytics (2020)](https://devforum.roblox.com/t/rolimons-game-analytics-free-statistics-for-roblox-games/491663)
- Only selected games are tracked: requested through the Rolimon's Discord and reviewed by staff; most games with
  steady concurrents above 100 were accepted (2020). So small new games are mostly absent. — [same thread](https://devforum.roblox.com/t/rolimons-game-analytics-free-statistics-for-roblox-games/491663)
- Game Table page is still live in 2026. — [Rolimon's Game Table](https://www.rolimons.com/gametable)

**RoMonitor Stats**
- Chrome extension and site romonitorstats.com. Listing features: General Experience Stats, Milestones, Name Changes,
  Social Graph; adds a "Top Experiences" carousel to the Roblox homepage and Charts page. No price or promotion offer
  found. Support email domain is silicon.digital. — [Chrome Web Store: RoMonitor Stats](https://chrome.google.com/webstore/detail/romonitor-stats-roblox-st/ednkdolfafcikdchfnffkecohpnifogc?hl=en)

**"New / underrated Roblox games" list sites**
- Mostly editorial listicles, several old (Sportskeeda 2022 and 2023). The closest to a tracker is levelupplay.my's
  2026 "underrated" list, which shows player counts, visits and approval for each game. The Bloxline turns Reddit
  answers into a list. — [levelupplay.my](https://levelupplay.my/best/underrated); [The Bloxline](https://www.thebloxline.com/articles/reddit-answers-what-are-the-most-underrated-games-on-roblox); [Sportskeeda 2023](https://www.sportskeeda.com/roblox-news/top-underrated-games-roblox)
- BLOXG mentions a "Roblox Games Directory" but gives no prices or detail. — [BLOXG marketing cost](https://bloxg.com/how-much-does-roblox-marketing-cost)

### Inferences
- RoTerminal already covers BloxRadar's core list (live counts, charts, rising, new) and adds AI tool access and
  earnings estimates. BloxRadar needs a different angle to stand out. Badges, game passes and change logs overlap
  partly with Rolimon's (badges, passes) and RoTerminal (icon and thumbnail history on Plus).
- No site found runs a player-facing "fresh games worth trying" feed that filters out clones and spam by quality
  signals (retention-like signals, like ratio, playtime). RoTerminal's lists are ranked by player count or growth,
  which still favours games that already have players.
- No analytics site found sells paid featuring. That space is open, but paid placement would hurt trust in rankings
  unless clearly labelled. (Guess.)

### Gaps
- Bloxbiz / Super Biz, RoProxy-based sites, GameTrack-style sites and RTrack: no current pages were found or read, so
  their features and prices are unknown here.
- RoMonitor's website content could not be read (page returned only its title).
- Whether RoTerminal's "Clips campaigns" is a paid promotion product for developers is unclear.

## 2. Browser extensions (RoPro, BTRoblox, RoGold, RoSeal)

### Takeaway
The extensions mainly improve server picking and personal shortcuts (most played, pinned games, quick play), not
finding new games. RoPro's "Most Popular" sort with a genre filter is the only discovery-type feature found, and it
favours games that are already big.

### Cited Findings
- RoPro: about 2,000,000 users, 4.5 stars from 33.5K ratings; Free, Standard and Pro tiers (prices not on listing).
  Discovery-related features: Most Played Games on the home page with hours played; "Most Popular" sort on the
  Discover page with genre dropdown (v1.3.4); genre filters; Experience Quick Search; Quick Play on thumbnails; Join
  Random Server (a random server, not a random game). Server filters Smallest First, Not Full and Custom Player Count
  are free; Server Region, Best Connection, Newest/Oldest and "More Server Info" are for subscribers. No random game,
  favourites sorting or trending feature found. — [Chrome Web Store: RoPro](https://chromewebstore.google.com/detail/adbacgifemdbhdkfppmeilbgppmhaobf)
- RoGold (by Alrovi ApS): Live Game Stats (refreshes game stats in real time), Group Stats, Pinned Games, Small
  Server finder, Best Friends on home page, ID copying for developers. Says it can run alongside RoPro, BTRoblox and
  Roblox+. — [Firefox Add-ons: RoGold](https://addons.mozilla.org/fr/firefox/addon/rogold/)
- RoLocate (free Greasy Fork userscript) offers a "Random Shuffle" of servers that favours emptier ones. — [Greasy Fork: RoLocate](https://greasyfork.org/en/scripts/523727-rolocate)
- A third-party extension adds a stats panel to game pages using CreatorExchange, RoTerminal and RoTrends data. — [GitHub roblox-game-stats](https://github.com/phasenull/roblox-game-stats)

### Inferences
- An extension that injects BloxRadar data into Roblox game pages already has a precedent (the RoTerminal panel
  extension). A "small but well-liked games" row on the Roblox home page would be new, as far as these listings show.

### Gaps
- BTRoblox and RoSeal features were not found in this pass.
- RoPro subscription prices were not on the listing.

## 3. Community discovery (Discord, Reddit, DevForum, TikTok/YouTube, X, curators)

### Takeaway
Free channels exist in large numbers (dozens of Roblox advertising Discords, DevForum, Reddit, #RobloxDev on X,
TikTok devlogs), but the evidence on how well they work is anecdotal and mostly negative or "it takes a lot of work".
Advice from 2026 guides consistently says to post devlogs and build a community rather than "play my game" posts.

### Cited Findings
- Directories list many Roblox advertising Discord servers; one directory counted 45 active ones. Some sell a paid
  spotlight "for a low price" or a "Pro Advertiser" subscription for automated ads. — [communityone.io list](https://communityone.io/roblox-advertising-discord-servers/); [Disboard tag](https://disboard.org/servers/tag/roblox-advertising); [top.gg tag](https://top.gg/discord/servers/tag/roblox-game-advertising)
- DevForum guide (2023): developer says Sponsored Ads effect was not significant; getting people into a Discord is
  hard and advertising takes a lot of work. (2023, single anecdote) — [DevForum: How to Successfully Grow Your Game](https://devforum.roblox.com/t/how-to-successfully-grow-your-game-ft-senseideveloper-vikinglaw-promoting-and-advertising-your-game/2535279)
- 2026 guides from promotion sellers recommend thumbnails first, retention before promotion, keyword research using
  Roblox search, devlogs on TikTok/X/YouTube, creator deals in your genre, and cross-promotion with similar
  non-competing games. These come from companies selling promotion, so they are not neutral. — [creation.dev](https://www.creation.dev/learn/how-to-make-roblox-game-popular); [Play My Game blog, May 2026](https://playmygame.net/blog/get-real-players-roblox-game)
- Play My Game names DevForum, Discord servers such as Hidden Devs, and the #RobloxDev hashtag as places to build an
  audience. — [Play My Game blog](https://playmygame.net/blog/get-real-players-roblox-game)

### Inferences
- Most free channels reach other developers rather than players (DevForum, Hidden Devs, #RobloxDev). Player-side
  discovery outside Roblox is mainly TikTok/YouTube creators and listicle sites. (Inference from the channels named.)

### Gaps
- No Reddit thread content was retrieved (searches did not return r/robloxgamedev or r/roblox threads).
- No data on DevForum "Cool Creations" outcomes, TikTok/YouTube "underrated games" channel sizes, X accounts that
  post new games, or Roblox curators.

## 4. Paid promotion beyond Roblox Ads (influencers, ad networks, cross-promo, playtesting)

### Takeaway
For small developers the paid options outside Roblox Ads are influencer/creator marketplaces (BLOXG), pay-per-play
schemes (Play My Game), Discord ad servers and clipping campaigns. Gamefam and Super League are brand studios paid by
big brands, not services for indie developers. Public price lists are mostly from sellers and should be treated as
rough.

### Cited Findings
- BLOXG (2026 price guide, "real data from 850+ promoted games", method not explained; 5% buyer and 5% creator fee,
  escrow, influencer marketplace where creators set rates):
  | Channel | Price stated |
  |---|---|
  | Roblox Sponsored Experiences | $0.01 to $0.05 per visit; $100 test gives 2,000 to 10,000 visits |
  | Roblox Immersive Ads | $0.005 to $0.02 per impression; $1,000 to $5,000 minimum to matter |
  | Micro influencers (1K to 50K) | $20 to $200 per video |
  | Mid-tier (50K to 500K) | $200 to $2,000 per video |
  | Macro (500K+) | $2,000 to $20,000+ per video |
  | Discord server partnerships | $0 to $500 per deal |
  | Discord growth services | $100 to $500 per month |
  | Google Ads | $0.50 to $3.00 per click |
  | Clipping campaigns | from $1,000 plus fee |
  — [BLOXG: How Much Does Roblox Marketing Cost in 2026](https://bloxg.com/how-much-does-roblox-marketing-cost)
- BLOXG's other pages give conflicting CPMs (Roblox Ads $6.50 average on one, Immersive Ads $3.50 on another). — [BLOXG ad benchmarks](https://bloxg.com/statistics/roblox-advertising-benchmarks); [BLOXG marketing stats](https://bloxg.com/statistics/roblox-marketing-statistics-2026)
- Play My Game (May 2026): invite-only for developers; developers set a budget and pay players (in tokens) only for
  verified playtime; early-access developers get 25 free promotion rewards; no prices published. Mentions bot-visit
  sellers at about "10,000 visits for $20" as risky and against Roblox terms. — [Play My Game blog](https://playmygame.net/blog/get-real-players-roblox-game)
- Roblox brand-integration fees from 1 January 2027: per thousand visits $1.50 US, $0.75 UK/CA/AU/NZ/Nordics, $0.20
  Western Europe/Japan/Korea, $0.05 rest of world, dropping to a flat $0.10 after 28 days live. This is what creators
  pay Roblox for brand deals, not a promotion channel. — [PocketGamer.biz](https://www.pocketgamer.biz/roblox-reveals-creator-fee-structure-for-brand-integrations-from-2027/)
- Gamefam builds branded games for brands (ran FIFA Super Soccer); CEO changed Feb 2026. Super League builds branded
  worlds and places brands into existing top games; bought Supersocial in 2025. Neither appears to offer a marketplace
  for small developers. — [Wikipedia: Gamefam](https://en.wikipedia.org/wiki/Gamefam); [Digiday](https://digiday.com/media/roblox-studios-begin-to-consolidate-as-super-league-buys-supersocial/); [Sportico 2025](https://www.sportico.com/business/tech/2025/fifa-super-soccer-roblox-world-cup-game-1234879618/); [Tubefilter Jan 2026](https://www.tubefilter.com/2026/01/06/roblox-branded-entertainment-super-league-hide-or-die/)
- Roblox's own docs estimate about $100 to $250 of ad spend to generate traffic, and describe closed betas, open betas
  and paid access as built-in testing options. — [Roblox docs: beta testing experiences](https://create.roblox.com/docs/education/developer/beta-testing-experiences)
- RDC26 announced early testing with up to 10 age-checked friends and "Roblox Everywhere" web distribution, both for
  late 2026. — [DevForum: RDC26 What We Announced](https://devforum.roblox.com/t/rdc26-what-we-announced/4865880)
- BetaHub is a general beta-test management tool (Discord integration, bug reports, feedback); no Roblox-specific
  pricing found. — [PatchKit game testing](https://patchkit.net/game_testing)

### Inferences
- Pay-per-verified-play (Play My Game) is the newest model aimed at tiny games. It overlaps with what a discovery site
  could do with a "try this new game" feed, but paying players risks low-quality, non-returning traffic. (Guess.)
- Organised cross-promotion networks between small games (e.g. in-game portals swapping traffic) were not found as a
  product in this pass.

### Gaps
- Bloxbiz / Super Biz in-experience ad network rates and current status: not found.
- No independent data on return on spend for any of these channels.

## 5. Gaps: what developers and players say they wish existed

### Takeaway
Developers' main complaint in 2026 is that Roblox's own Home, Charts and search keep showing the same games, and new
rules (age checks, publishing requirements, the Aug 2026 retention-and-monetisation weighting) make it harder for new
games to collect the data they need to be recommended. Nothing outside Roblox gives a new game a fair first audience.

### Cited Findings
- Aug 6, 2026: Roblox Home recommendations now weigh long-term retention and monetisation; live for all players by
  Aug 20. — [DevForum: Boost Your Discovery by Building Games People Want to Play](https://devforum.roblox.com/t/boost-your-discovery-by-building-games-people-want-to-play/4779042)
- Replies in that thread: discovery dominated by the same few games, small games cannot build retention data to
  qualify (42 likes); a niche game lost almost half of Home recommendations after a February change (26 likes); indie
  developers now need heavy ad spend to break in (9 likes); requests to remove the age gate and the 100,000 R$
  requirement (74 likes); the 500+ age-checked spenders in 60 days target is unrealistic for small games (18 likes);
  a request for refunds of the publishing fee if a game does not reach 100 engaged players in 90 days (22 likes). The
  most-liked reply (171) was positive about the direction. First page of replies only. — [same thread](https://devforum.roblox.com/t/boost-your-discovery-by-building-games-people-want-to-play/4779042)
- April 2026 publishing requirements: extra verification for games shown to users under 16; Roblox admits this can
  slow growth for new games without an audience and says it will improve discovery for new games. — [DevForum: New Publishing Requirements](https://devforum.roblox.com/t/new-publishing-requirements-evaluation-process-for-games/4573166)
- Roblox's 2026 roadmaps include "Tackling Spammy and Cloned Games" (spring) and name checks and promotional text to
  protect game names from copycats (fall, late 2026 target). — [Creator Roadmap Spring 2026](https://devforum.roblox.com/t/creator-roadmap-2026-spring-update/4625473); [Creator Roadmap Fall 2026](https://devforum.roblox.com/t/creator-roadmap-2026-fall-update/4880208)
- Play My Game cites over 40 million experiences on Roblox (no date or source). — [Play My Game blog](https://playmygame.net/blog/get-real-players-roblox-game)

### Inferences (gaps none of the tools found fill)
- A player-facing feed of new games filtered for quality (not clones, decent like ratio and session length) rather
  than ranked by player count. RoTerminal's "New" and "Breaking out" are the nearest thing and are aimed at analysts.
- Clone and spam detection visible to players: Roblox is only now working on it.
- A fair "first 100 players" route for a new game that is not paid ads, paid creators or paid-per-play schemes.
- A neutral place that measures whether promotion worked (traffic before and after a creator video or ad). RoTerminal
  Studio's "ads vs organic players" is the only related feature found, at $99 a month.
- Genre or niche discovery for small audiences (the niche game in the DevForum thread that lost half its Home traffic).

### Gaps
- Player-side wishes (as opposed to developer wishes) were not found; Reddit threads were not retrieved.
