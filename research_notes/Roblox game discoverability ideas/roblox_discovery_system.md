# Roblox's own game discovery system (as of late October 2026)

Research date: 2026-10-28. Facts are 2026 unless a year is given. Sources are mostly official Roblox DevForum announcements and Creator Hub docs; third-party sources are flagged.

## 1. How Home, Charts/Discover, and Search decide what to show, and which signals matter

### Takeaway
Home "Recommended For You" (RFY) is a two-stage personalized recommender (retrieval, then ranking) scored on per-user averages measured only on players who arrived organically from RFY: play-through rate, early bounce, return days (D1, D2-7, D8-28), capped playtime, co-play, sessions and spend. Since August 2026 it gives more weight to "long-term player value" (returns plus purchases). Charts/Discover sorts are not personalized and run on platform-wide statistics with DAU floors. Search moved to semantic search. Roblox does not publish weights or thresholds.

### Cited Findings
**Home / Recommended For You (RFY)**
- RFY works in two stages. Retrieval picks candidate games a user might enjoy, based on engagement, retention and monetization. Ranking then personalizes and orders them. — [Creator Hub: Discovery](https://create.roblox.com/docs/discovery)
- Ranking only uses signals from users who joined organically from the RFY sort. Users who came from ads, curation, friends, search or social media are not counted. — [Creator Hub: Discovery](https://create.roblox.com/docs/discovery)
- Signals Roblox lists as **most important**: play-through rate (impression to play), first-play bounce rate (under 60 seconds and 61 to 180 seconds), play days per user (D1, D2-7, D8-28), playtime per user (capped at 60 minutes per user, per game, per day). — [Creator Hub: Discovery](https://create.roblox.com/docs/discovery)
- Signals Roblox lists as **important**: intentional co-play days per user (joins, invites, private servers), qualified play sessions per user, spend days per user, Robux spent per user. — [Creator Hub: Discovery](https://create.roblox.com/docs/discovery)
- Signals are per-user averages, so Roblox says small games are not penalized for size. — [Creator Hub: Discovery](https://create.roblox.com/docs/discovery)
- No single signal decides ranking. — [Discovery FAQ](https://create.roblox.com/docs/discovery-faq)
- A "qualified play" filters out accidental clicks and quick bounces. Qualified play-through rate (qPTR) = engaging plays divided by RFY impressions. Roblox added qPTR and "similar experiences" benchmarks to analytics in 2024. — [DevForum: Analytics qPTR and Similar Experiences Benchmarks (2024)](https://devforum.roblox.com/t/analytics-recommendations-qualified-play-through-rate-and-similar-experiences-benchmarks/3075185?page=2); [DevForum: Improved Recommended For You algorithm and analytics (2025)](https://devforum.roblox.com/t/boost-your-discovery-with-the-improved-recommended-for-you-algorithm-and-analytics-for-creators/3587441)
- Benchmark games shown in analytics do not affect ranking. — [Creator Hub: Discovery](https://create.roblox.com/docs/discovery); [DevForum, Aug 2026](https://devforum.roblox.com/t/boost-your-discovery-by-building-games-people-want-to-play/4779042)
- New in 2026: "Deep play-through rate" introduced 9 March 2026, meant to capture sustained interest rather than just impression-to-play conversion. "7-day qualified play sessions per user" added 26 March 2026. "Not interested" dismissals were folded into discovery on 26 March 2026, with stats in Creator Analytics. — [DevForum: How we are improving Home this year (9 Mar 2026, with updates)](https://devforum.roblox.com/t/how-we-are-improving-home-this-year/4502571)
- Roblox says it will not share signal weights or thresholds and is moving toward per-user personalized weighting. — [DevForum, Mar 2026](https://devforum.roblox.com/t/how-we-are-improving-home-this-year/4502571)
- 6 August 2026 (live for all players 20 August 2026), signed by Chief Growth Officer John Ciancutti: Home recommendations now give more weight to "long-term player value", meaning games players return to and games where players find value in purchases. Guidance: build retention first, then monetization. Games strong in only one area still get impressions but may get less distribution. No numbers given. — [DevForum: Boost Your Discovery by Building Games People Want to Play](https://devforum.roblox.com/t/boost-your-discovery-by-building-games-people-want-to-play/4779042)
- Players acquired via featured tiles or ads move into the "Continue" sort, so a game's RFY impressions can drop afterward. Ads do not change organic RFY ranking. — [DevForum, Mar 2026](https://devforum.roblox.com/t/how-we-are-improving-home-this-year/4502571)
- Other Home sorts: Continue Playing, Friends List, Sponsored, Curated Sorts, Standout Games, Live Events. — [Creator Hub: Discovery](https://create.roblox.com/docs/discovery)
- "Today's Picks" was renamed "Standout Games" in 2026: hand-curated games with novel mechanics, distinctive visuals or underrepresented genres. Creators can nominate via a survey form. — [DevForum, Mar 2026](https://devforum.roblox.com/t/how-we-are-improving-home-this-year/4502571); [Creator Hub: Discovery](https://create.roblox.com/docs/discovery)
- Roblox said it is exploring genre sorts, "Because you played X" sorts, and sorts for first-time players. — [DevForum, Mar 2026](https://devforum.roblox.com/t/how-we-are-improving-home-this-year/4502571)

**Thumbnails and video**
- A custom thumbnail is required to receive any impressions from Home recommendations. Thumbnail personalization is available for Home. — [Creator Hub: Discovery](https://create.roblox.com/docs/discovery)
- Gameplay video previews: started in Standout Games (2 April 2026). Roblox reported +47% quality plays and +1.09% playtime in Standout Games (14 May 2026). From 29 July 2026 videos autoplay in RFY (hover on desktop, on scroll stop on mobile), with up to +39% playtime from RFY for games with video in May to July tests. Ranking unchanged. Videos are reviewed and must show real current gameplay. — [DevForum, Mar 2026 thread updates](https://devforum.roblox.com/t/how-we-are-improving-home-this-year/4502571)

**Reduced exposure**
- Games get reduced exposure for giveaway-led metadata, metadata that does not match content, or non-unique (copy) games. A daily-updated banner on the Creator Dashboard flags affected games. — [Creator Hub: Discovery](https://create.roblox.com/docs/discovery)

**Charts / Discover**
- May 2024: Roblox tested an enhanced Discover page with new charts including Top Trending, Top Revisited, Fun with Friends, feature-themed sorts (e.g. games with voice chat, automatically eligible) and genre sorts (genres assigned by consensus of human evaluators). These sorts are **not personalized**; every user sees the same lists, based on statistics. — [DevForum: Testing an Enhanced Discover Page (May 2024, updated Aug 2024)](https://devforum.roblox.com/t/testing-an-enhanced-discover-page-top-charts-and-new-sorts/2954676)
- Eligibility principles for sorts (2024): freshness (overlap of a sort's top 10 with previous weeks, averaged over 4 weeks), whole-page uniqueness (unique games contributed in the top 10), quality (safety filters and a DAU threshold whose value is not published). — [same post](https://devforum.roblox.com/t/testing-an-enhanced-discover-page-top-charts-and-new-sorts/2954676)
- November 2024: Charts default to the viewer's device type and can be filtered by country. Genre filtering was promised for early 2025. — [same post](https://devforum.roblox.com/t/testing-an-enhanced-discover-page-top-charts-and-new-sorts/2954676)
- 29 April 2025: "Top Playing Now" chart launched globally, ranking by concurrent users in near real time. — [DevForum: Introducing Top Playing Now](https://devforum.roblox.com/t/introducing-top-playing-now-on-charts/3529809)
- No official formula for "Up-and-Coming" was found. Forum users complain it lists games with 10K to 200K+ CCU and overlaps with Most Popular and Top Trending. — [DevForum thread p1](https://devforum.roblox.com/t/introducing-top-playing-now-on-charts/3529809); [p5](https://devforum.roblox.com/t/introducing-top-playing-now-on-charts/3529809?page=5)

**Search**
- Search now uses semantic search in all supported languages, so queries like "food games" work. Previously it matched mainly exact queries and titles. — [Creator Hub: Discovery](https://create.roblox.com/docs/discovery)
- A Search Landing Page and dynamic filters were planned for late 2025 and are delayed to late 2026. — [DevForum: Creator Roadmap 2026 Fall Update](https://devforum.roblox.com/t/creator-roadmap-2026-fall-update/4880208)

**Measurement change**
- 12 October 2026: Roblox moved logging of impressions, clicks and plays from Home, Search and Charts to a "more reliable delivery pipeline". Creators may see higher impression, click and play counts and a small drop in play-through rate. Historical data is not restated. Replies report sudden drops in stats and higher bounce rates. — [DevForum: Improved Discovery Measurement in Creator Analytics](https://devforum.roblox.com/t/improved-discovery-measurement-in-creator-analytics/4930122)

### Inferences
- The organic RFY loop needs RFY impressions to measure RFY signals. A brand new game with no impressions has no RFY data. Roblox does not document how initial test impressions are allocated to new games. This cold-start step is the least transparent part of the system.
- Because Charts are non-personalized and gated by DAU thresholds and statistical rank, they mostly show games that are already big. There is no official "new and small" list. That is a clear gap a third-party site can fill (e.g. "fastest growing under 1K CCU", "first seen this week").
- The 12 Oct 2026 logging change breaks comparability of creator-side discovery metrics before and after that date. Any third-party site that tracks public CCU and visit counts has a steadier time series than creators' own analytics across that date.

### Gaps
- No official definition or thresholds for Up-and-Coming, Top Trending, Top Rated or Top Revisited were found.
- How new games get their first RFY test impressions is not documented.
- I did not find an official Roblox source for a third-party claim (gmmarket.me) that the algorithm window expanded from 7 to 28 days on 15 June 2026. The official signal list does include D8-28 play days.

## 2. What changed in 2024, 2025 and 2026

### Takeaway
2024 brought the Charts/Discover redesign and qPTR analytics. 2025 brought Top Playing Now, Creator Rewards replacing Premium Payouts, and the Improved RFY algorithm. 2026 brought the largest structural change: age-split accounts (Roblox Kids, Roblox Select) with an eligibility gate that keeps new games away from under-16 players until they prove engagement with age-checked 16+ players, plus new Home signals, Standout Games, video previews, ads blended into RFY, the long-term-value reweighting, and a logging change.

### Cited Findings
**2024**
- May 2024 Discover page test with Top Trending, Top Revisited, Fun with Friends, feature and genre sorts; Nov 2024 device default and country filter on Charts. — [DevForum (2024)](https://devforum.roblox.com/t/testing-an-enhanced-discover-page-top-charts-and-new-sorts/2954676)
- 2024: qPTR and similar-experience benchmarks added to analytics. — [DevForum (2024)](https://devforum.roblox.com/t/analytics-recommendations-qualified-play-through-rate-and-similar-experiences-benchmarks/3075185?page=2)

**2025**
- 29 April 2025: Top Playing Now chart (live CCU ranking). — [DevForum](https://devforum.roblox.com/t/introducing-top-playing-now-on-charts/3529809)
- 2025: "Improved Recommended For You algorithm and analytics" announcement. — [DevForum (2025)](https://devforum.roblox.com/t/boost-your-discovery-with-the-improved-recommended-for-you-algorithm-and-analytics-for-creators/3587441)
- Creator Rewards announced 24 June 2025, live 24 July 2025, replacing Engagement Based Payouts (Premium Payouts) and the Creator Affiliate program. Two parts. **Daily Engagement Reward**: 5 Robux each time an "Active Spender" (spent at least $9.99 in the last 60 days) plays a game at least 10 minutes in a day; only the first 3 unique games that user launches that day count. **Audience Expansion Reward**: 35% revenue share on the first $100 of Robux purchases by new users or users returning after 60+ days inactive, credited when the user arrives via a direct link to the game page or by searching the game's name and plays 10+ minutes; requires average 100 DAU. 60-day hold. — [DevForum: Introducing Creator Rewards (2025)](https://devforum.roblox.com/t/introducing-creator-rewards-earn-more-by-growing-the-community/3777628)

**2026**
- 9 March 2026: Home roadmap post. Today's Picks becomes Standout Games; deep play-through rate; ads blended into RFY rolled out to all users; larger promo tile test; mobile flyout test. 26 March: 7-day qualified sessions signal and "not interested". April to July: video previews, then autoplay in RFY. — [DevForum](https://devforum.roblox.com/t/how-we-are-improving-home-this-year/4502571)
- 13 April 2026: Roblox announced Roblox Kids (ages 5 to 8, games rated Minimal or Mild) and Roblox Select (ages 9 to 15, up to Moderate). Users move to standard accounts at 16. — [TechCrunch](https://techcrunch.com/2026/04/13/roblox-introduces-kids-and-select-accounts-for-age-appropriate-access-to-games-and-chat/); [Roblox IR](https://ir.roblox.com/news/news-details/2026/Roblox-Kids-and-Roblox-Select-Accounts-Now-Available-Worldwide/default.aspx)
- 19 May 2026: Kids/Select launched in New Zealand, Netherlands, Australia, Indonesia; global on 16 June 2026. — [DevForum: Kids and Select Global Launch](https://devforum.roblox.com/t/roblox-kids-and-select-global-launch-upcoming-updates-to-eligibility-ads-manager-and-expedited-review/4685717)
- Eligibility to reach under-16 players: creator must be age-checked (ID if 18+, facial age estimation if under 18), have 2-step verification and good standing; pay a one-time refundable 1,000 Robux fee per game (refunded 3 months after becoming eligible) or have two consecutive months of Plus/Premium; pass automated safety screening; then reach **500 Highly Engaged Players (HEP)** from age-checked 16+ players for entry. Until then the game is only visible to age-checked 16+ users. Maintenance threshold cut from 100 to 25 HEP over 60 days (16 July 2026). HEP definition relaxed 6 July 2026, which Roblox estimated raises new game entries by 33%. — [DevForum: Kids and Select Global Launch](https://devforum.roblox.com/t/roblox-kids-and-select-global-launch-upcoming-updates-to-eligibility-ads-manager-and-expedited-review/4685717); [DevForum: Alternate Publishing Requirements](https://devforum.roblox.com/t/alternate-publishing-requirements-for-roblox-kids-and-select/4630944); [Creator Hub: Kids and Select](https://create.roblox.com/docs/production/publishing/kids-and-select)
- At RDC 2026 Roblox said the HEP threshold drops from 250 to 100 in November 2026. This conflicts with the 500 figure in the June post; the DevForum thread history suggests the threshold has already been changed more than once. A third-party guide (Aug 2026) quotes 250. Treat the current number as 250, dropping to 100 in November, but check the live doc. — [RDC26: What We Announced](https://devforum.roblox.com/t/rdc26-what-we-announced/4865880); [obby.fun guide, third party](https://www.obby.fun/blog/how-to-publish-roblox-game)
- Expedited Review: optional refundable 100,000 Robux per game, up to 48 hours, skips the HEP threshold, aimed at professional studios. — [DevForum](https://devforum.roblox.com/t/roblox-kids-and-select-global-launch-upcoming-updates-to-eligibility-ads-manager-and-expedited-review/4685717)
- Ads Manager got a beta "Engagement" objective that targets players whose sessions count toward the HEP threshold, for games not yet in Kids/Select. Cost may exceed the Plays objective. — [same](https://devforum.roblox.com/t/roblox-kids-and-select-global-launch-upcoming-updates-to-eligibility-ads-manager-and-expedited-review/4685717)
- From 30 June 2026 social media links (on profiles, game pages, groups, Creator Hub) are visible only to age-checked 16+ users (previously 13+). This cuts the Discord/YouTube link path to younger players. — [same](https://devforum.roblox.com/t/roblox-kids-and-select-global-launch-upcoming-updates-to-eligibility-ads-manager-and-expedited-review/4685717)
- July 2026: Roblox launched "Build", an AI game-creation feature in the mobile app. — [TechCrunch, 16 Jul 2026](https://techcrunch.com/2026/07/16/roblox-launches-an-ai-powered-game-creation-feature-in-its-mobile-app/)
- 6/20 August 2026: long-term player value reweighting of Home. — [DevForum](https://devforum.roblox.com/t/boost-your-discovery-by-building-games-people-want-to-play/4779042)
- RDC 2026 (September): age-rating shortcut (a single question instead of the full questionnaire to reach 16+ in most regions); early testing with up to 10 age-checked friends before publishing; pre-roll skippable video ads on loading screens with revenue share (Roblox Plus subscribers exempt); Play on the Web from a shared game page URL in Chrome (late 2026); Roblox Wallet daily USD payouts (late 2026). — [RDC26: What We Announced](https://devforum.roblox.com/t/rdc26-what-we-announced/4865880)
- Fall 2026 roadmap: game passes and dev products shown on Home and other discovery surfaces before joining; name protection against copycats and promotional text for updates; takedowns of games copying another game's title or thumbnail; relaxed Kids & Select requirements and under-18 creators publishing without ID; Home UI changes, Search Landing Page and dynamic filters all delayed to late 2026. — [Creator Roadmap 2026 Fall Update](https://devforum.roblox.com/t/creator-roadmap-2026-fall-update/4880208)
- 12 October 2026: discovery logging pipeline change. — [DevForum](https://devforum.roblox.com/t/improved-discovery-measurement-in-creator-analytics/4930122)

### Inferences
- The Kids/Select gate means a new game now starts life visible only to age-checked 16+ players and must collect hundreds of highly engaged players there before it can reach the younger majority. Paid ads (Engagement objective) or the 100,000 Robux expedited fee are Roblox's official ways to speed that up. Any free, external traffic source that sends real 16+ players to a new game helps it clear the HEP gate. That is a concrete value proposition for a discovery site.
- The Audience Expansion Reward pays creators 35% on new or returning users who arrive by direct link or name search. A third-party site that sends players via direct game links is aligned with a payment Roblox already makes to creators, which gives developers a reason to promote their BloxRadar listing.

### Gaps
- The exact HEP definition is not public (creators call it a "black box").
- No official date found for when thumbnail personalization and thumbnail A/B testing first launched (believed RDC 2024 era; not verified in this session).
- Sponsored Search ads and Rewarded video ads: no 2026 primary source found in this session.

## 3. Volume of new games, how many get players, and concentration

### Takeaway
Roblox does not publish a daily or monthly count of newly published games or the share that get zero players. The best official concentration-related figure is from RDC 2026: in August 2026, 28% of the top 100 games by hours and 33% of the top 1,000 had launched in the previous 90 days. Platform size: 152M average DAU in Q2 2026 (Roblox now notes DAU methodology changes for bot mitigation and age checks).

### Cited Findings
- In August 2026, 28% of the top 100 games by hours and 33% of the top 1,000 launched in the preceding 90 days. — [RDC26: What We Announced](https://devforum.roblox.com/t/rdc26-what-we-announced/4865880)
- Game visits up 55% year over year (12 months to 30 June 2026); about $1.7B DevEx in the last twelve months, up about 50%. RDC post also cites "123 million daily users" (quarter to 30 June 2026), which conflicts with the 152M DAU in the Q2 report; the definitions likely differ (e.g. after bot/age methodology changes). — [RDC26 post](https://devforum.roblox.com/t/rdc26-what-we-announced/4865880); [Roblox 10-Q Q2 2026](https://www.sec.gov/Archives/edgar/data/0001315098/000162828026051082/rblx-20260630.htm); [Q2 2026 earnings release mirror](https://gameindustrylibrary.com/documents/roblox-fy2026-q2-earnings-release/read)
- Q2 2026: 152M average DAU, 29B hours engaged, $2.2B bookings (+8%). Roblox guided to year-over-year declines in bookings for Q3 2026. Q3 2026 results are due 29 October 2026, one day after this research. — [Q2 2026 release mirror](https://gameindustrylibrary.com/documents/roblox-fy2026-q2-earnings-release/read); [Kalshi listing](https://kalshi.com/company-reports/RBLX)
- Third-party estimates of total active experiences: about 6.7M to 7M (2025); aggregator quality, not verified against Roblox filings. — [Exploding Topics](https://explodingtopics.com/blog/roblox-stats)
- GameAnalytics 2025 benchmark: its sample of games with 1M+ MAU covers 47% of total player engagement on the platform. This implies very high concentration in a small set of large games. — [GameAnalytics 2025 Roblox Benchmark Report](https://www.gameanalytics.com/reports/2025-roblox-report)
- Users engaged with more than 24 unique experiences per month (2025, per a secondary source citing the Q4 2025 shareholder letter). — [Exploding Topics](https://explodingtopics.com/blog/roblox-stats)
- AI creation: Roblox "Build" (mobile, July 2026) lets users make games from text prompts. Critics expect an influx of low-quality, repetitive games. Roblox's stated response is that discovery ranks by retention so games nobody plays will not be featured. — [TechCrunch](https://techcrunch.com/2026/07/16/roblox-launches-an-ai-powered-game-creation-feature-in-its-mobile-app/); [VOI](https://voi.id/en/technology/585316)
- A third-party analysis says the 2026 effect of AI tools is more games published, lower average quality, top creators unaffected. Opinion, no data. — [RoWatcher](https://rowatcher.com/news/roblox-ai-tools-in-2026-what-s-actually-changed-for-developers)

### Inferences
- The 28% / 33% "launched in last 90 days" figures show the top lists do turn over. They say nothing about the long tail; they describe games that already made the top 1,000.
- The Kids/Select gate (Section 2) probably filters a large share of AI-generated and low-effort games away from under-16 players, since they need hundreds of engaged age-checked 16+ players first. This is a guess; no data found.

### Gaps
- No official or reliable count of games published per day or month, in any year.
- No data on what share of new games get any players, or zero-impression rates.
- No official top-N share of playtime. A third-party site with full CCU sampling could compute this itself.
- No official count of AI-generated games or Build-made games.

## 4. Developer complaints and Roblox's promises

### Takeaway
The repeated complaints are: the same handful of games dominate Home, Charts and search; "brainrot" and copycat games crowd the front page; niche or story games are punished by retention metrics; the Kids/Select gate and fees hurt small and new creators; signals and HEP are opaque; ads now sit inside RFY. Roblox's answers are curation (Standout Games), new signals (deep PTR, 7-day sessions, long-term value), video previews, anti-copycat name protection and takedowns, and lowering the HEP threshold.

### Cited Findings
- Replies to the Aug 2026 discovery post: the same few games dominate Home, Charts and search leaving no room for new or small games; niche games with low early retention but heavy spenders are hurt (one developer reported a near 50% drop in Home recommendations from late February); complaints about ID/age verification, the fee and the 100,000 Robux expedited price; requests to restore the older algorithm. — [DevForum, Aug 2026](https://devforum.roblox.com/t/boost-your-discovery-by-building-games-people-want-to-play/4779042)
- Replies to the Mar 2026 Home post: "brainrot" games dominate charts and front page; the change is "just a rename" of Today's Picks; objections to an ad after every two games in RFY; questions whether story games with low replay or light monetization will ever be promoted; older players get irrelevant results. — [DevForum, Mar 2026](https://devforum.roblox.com/t/how-we-are-improving-home-this-year/4502571)
- Replies to the Kids/Select launch: 100,000 Robux (roughly $880 to $1,000) expedited fee favors big studios; reaching 500 HEP is hard for small games; HEP is a black box; 16+ social links cut off Discord communities. — [DevForum, Jun 2026](https://devforum.roblox.com/t/roblox-kids-and-select-global-launch-upcoming-updates-to-eligibility-ads-manager-and-expedited-review/4685717)
- A developer paid the 1,000 Robux fee and the game stayed restricted to 16+. — [DevForum support thread](https://devforum.roblox.com/t/paid-1000-robux-publishing-fee-but-game-is-still-restricted-to-16-trusted-friends/4645558)
- Up-and-Coming chart criticized for listing games at 10K to 200K+ CCU; users asked for a real small/new games list. — [DevForum Top Playing Now thread p3](https://devforum.roblox.com/t/introducing-top-playing-now-on-charts/3529809?page=3)
- Logging change on 12 Oct 2026 met with reports of sudden stat drops. — [DevForum](https://devforum.roblox.com/t/improved-discovery-measurement-in-creator-analytics/4930122)
- Promises: Standout Games with nomination form; genre and "Because you played X" sorts (exploring); name checks and anti-copycat takedowns (late 2026); search landing page and dynamic filters (late 2026, delayed); HEP threshold 250 to 100 in November 2026; relaxed Kids & Select requirements (late 2026). — [DevForum Mar 2026](https://devforum.roblox.com/t/how-we-are-improving-home-this-year/4502571); [Fall Roadmap](https://devforum.roblox.com/t/creator-roadmap-2026-fall-update/4880208); [RDC26](https://devforum.roblox.com/t/rdc26-what-we-announced/4865880)

### Inferences
- Several promised discovery features (genre filters promised for early 2025, Search Landing Page, dynamic filters, Home UI) have slipped repeatedly. Genre browsing and filtering is a long-standing unmet request that a third-party site can deliver now.
- Players asking for a reliable list of games they own or favourite, and creators asking to watch their own games' player counts on Home, both match BloxRadar's existing live-count features.

### Gaps
- Reddit r/robloxgamedev and X threads were not sampled in this session; complaints above are from the DevForum only.

## 5. Public APIs exposing discovery data, and what is not public

### Takeaway
Roblox's public web endpoints expose the outputs of discovery (what is in each sort, search results, live player counts, visits, votes, favorites, badges, passes) but none of the inputs (impressions, play-through rate, retention, bounce, HEP status, Kids/Select eligibility, revenue).

### Cited Findings
- `apis.roblox.com/search-api/omni-search` is used by third-party scrapers to turn keywords into universe IDs with paging; `games.roblox.com/v1/games?universeIds=` returns details for up to 100 universes per call. — [Apify Roblox scraper (third party)](https://apify.com/ninhothedev/roblox-scraper.md)
- Creator-side discovery metrics (impressions, play-through rate, bounce, D1/D7, benchmarks, "not interested") live in Creator Analytics > Acquisition > Home Recommendations, visible only to the game's own creators. — [Creator Hub: Discovery](https://create.roblox.com/docs/discovery); [DevForum Aug 2026](https://devforum.roblox.com/t/boost-your-discovery-by-building-games-people-want-to-play/4779042)

### Inferences
- From prior knowledge, not verified in this session: `apis.roblox.com/explore-api/v1/get-sorts` (list of Charts sorts, takes a sessionId) and `explore-api/v1/get-sort-content` (games in a given sort); `games.roblox.com/v1/games/votes`, `/v1/games/{universeId}/favorites/count`, `/v1/games/{universeId}/game-passes`; `badges.roblox.com/v1/universes/{universeId}/badges` with awarded counts. These are undocumented web endpoints and can change without notice.
- Not public: RFY impressions, qPTR, deep PTR, bounce, retention, session length, playtime, revenue, HEP count, Kids/Select eligibility status, content maturity gating per audience, ad spend, personalized Home contents, Standout Games nomination outcomes. Content maturity label is shown on game pages but per-audience eligibility is not.
- What a third party can derive from public data: CCU time series (growth rate, peak hour), visits per day, like ratio change, favorites growth, badge award rates (a rough proxy for retention and progression: share of visitors who earn a later badge), new game passes (a monetization change log), and a "first seen in any sort" date by polling get-sorts. Sampling Charts sorts over time also lets a site measure turnover and concentration that Roblox does not publish.

### Gaps
- No official Roblox documentation was found for explore-api or omni-search; they are undocumented.
- Rate limits for these endpoints were not researched.
