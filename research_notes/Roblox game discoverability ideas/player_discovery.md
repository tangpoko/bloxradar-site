# Player discovery behaviour and player-facing curation models for BloxRadar

Research date: 2026-10-28. Research was limited to about 16 search/fetch calls, so several questions are only partly covered. Gaps are listed under each section. Anything not backed by a link is marked as an inference or a guess.

## How do Roblox players discover games (friends, home page, YouTube/TikTok, Discord, search)?

### Takeaway
No public survey was found that measures what share of Roblox players find games through friends, the home page, video, Discord or search. What the evidence does show is that Roblox's own home page recommendations ("Recommended For You", switched on March 2025) now decide which games reach the top, that hits spread fastest when a TikTok/YouTube meme turns into a game within days, and that Roblox itself is moving discovery toward friend clips and chat (Moments, July 2026). The audience is also getting older, which matters for any site design.

### Cited Findings
- Roblox switched on its "Recommended For You" (RFY) system globally in March 2025. Analyst Dubit describes it as ranking games by engagement quality (play-through rate, weekly playtime, intentional co-play) rather than raw popularity. — [Dubit](https://dubit.io/blog/roblox-top-20-rfy)
- Effect on the top 20 (Dubit data): games with 24+ months of history held 84% of Top 20 visits before RFY and 18% six months later. Games under six months old went from 1.3% to 60.7%. Total Top 20 visits rose from 8.0B (July 2024) to 28.7B (August 2025), all of the growth from games under 18 months old. Older games kept their absolute traffic (4.0B to 5.9B a month) but lost share. — [Dubit](https://dubit.io/blog/roblox-top-20-rfy)
- Turnover: of the July 2024 Top 20, only 7 were still in the Top 20 by December 2025 (Brookhaven RP, Blox Fruits, Adopt Me!, The Strongest Battlegrounds, Murder Mystery 2, Dress To Impress, Catalog Avatar Creator). Median time in the Top 20 fell from 14 months to 7 months. — [Dubit](https://dubit.io/blog/roblox-top-20-rfy)
- Concentration at the top got stronger, not weaker: Grow a Garden reached 48.1% of Top 20 visits in June 2025 (8.1B visits); Steal a Brainrot held 35-40% for six months in a row from August 2025. — [Dubit](https://dubit.io/blog/roblox-top-20-rfy)
- Roblox's developer docs: RFY works in two stages (retrieval of a candidate set per user, then personal ranking). Signals from ads, curation, search, charts, friends, teleports, notifications and social media sharing can speed up a game's consideration, but engagement from users first acquired through those sources is not counted in the ranking stage. — [Roblox Creator Docs, Discovery](https://create.roblox.com/docs/production/promotion/discovery)
- Roblox's Q2 2025 shareholder letter called the change deliberate, giving more impressions to highly retentive games even though short-term monetisation suffered (as reported). — [God is a Geek](https://godisageek.com/2026/08/roblox-9-billion-algorithm-change/) (secondary report; primary letter not fetched)
- July 2026 app redesign: new tabs Moments, Chat and Me. Moments is a feed of gameplay clips from friends and creators with one-tap join, for age-checked players 16+. Chat is meant for recommending games and joining friends. Creator videos now link straight to the games they show. Roblox says discovery was tuned earlier in 2026 to surface games players stick with. Roblox reports an average of 132 million daily active users. Rollout started in Canada, New Zealand and Singapore, going global over several months. — [Roblox Newsroom, July 2026](https://about.roblox.com/newsroom/2026/07/moments-new-homepage-unlocks-gaming-for-all)
- The meme-to-game pipeline: a meme trends on TikTok and Roblox developers ship a game around it within days. Steal a Brainrot is reported to have peaked at 25.4 million concurrent users in October 2025. — [RoWatcher](https://rowatcher.com/news/from-brainrot-to-skibidi-how-roblox-became-tiktok-s-gaming-mirror) (secondary)
- Older example of video-led discovery: the "Start Survey?" game spread through creator YouTube videos and became popular on TikTok in early 2023 (older fact, anecdote). — [Know Your Meme](https://amp.knowyourmeme.com/memes/subcultures/start-survey)
- Kaspersky Safe Kids data (2020-2021, older fact): YouTube was by far the top app for children, TikTok third; Roblox among top 10 games. Shows where kids spend time, not how they pick games. — [Kaspersky](https://www.kaspersky.com/about/press-releases/2021_tiktok-roblox-and-game-videos-what-kids-were-looking-for-in-2020-2021)
- Audience age: Roblox's Q4 2025 shareholder letter says that among users who completed an age check, 35% are under 13, 38% are 13-17, and 27% are over 18. DAUs grew 69% and hours 88% year over year. — [Roblox Q4 2025 Shareholder Letter](https://s27.q4cdn.com/984876518/files/doc_financials/2025/q4/Q4-2025-Shareholder-Letter.pdf)
- FY2025 annual report calls the 18+ cohort one of the fastest growing. — [Roblox FY2025 ARS (SEC)](https://www.sec.gov/Archives/edgar/data/1315098/000110465926044380/rblx-20251231xars.pdf). The CEO was quoted as estimating 18+ growth above 50% — [Fintool](https://fintool.com/news/roblox-q4-earnings-user-growth-surge) (secondary). A Konvoy analysis (Q2 2025) argued the audience is not really ageing up and self-reported ages are unreliable — [Konvoy](https://konvoy.vc/newsletters/roblox-is-not-aging-up). The two views conflict; the age-check figures came after Konvoy's piece.
- Ofcom's Children and Parents: Media Use and Attitudes report 2025 (published May 2025): about 89% of UK children aged 3-17 play games; younger children mostly on tablets, older ones on consoles and phones; gaming with strangers is flagged as a risk. No Roblox-specific discovery figures were found in summaries. — [Ofcom 2025](https://www.ofcom.org.uk/media-use-and-attitudes/media-habits-children/children-and-parents-media-use-and-attitudes-report-2025); [summary, Media & Learning](https://media-and-learning.eu/uncategorised/children-and-parents-media-use-and-attitudes-report-2025-from-ofcom)
- Roblox is reported to be adding AI-driven game search; critics worry it will hurt small games that rely on exact-name search. Not confirmed by Roblox. — [Dexerto](https://www.dexerto.com/roblox/roblox-reportedly-adding-ai-game-search-but-concerns-raised-over-killing-small-games-3408132/)

### Inferences
- The home page algorithm is now the main gatekeeper, and it rewards retention. A new game has to get some players from outside sources before RFY will test it. That is the gap a third-party site can fill: helping new games get their first players, and helping players find them, without competing with the algorithm on the top games.
- Because RFY now churns the Top 20 faster (median 7 months), a site that records "when did this game first show up and how fast did it grow" has real value. BloxRadar's change logs and player-count history already cover this.
- Friends and short video are clearly central (Roblox is building its home page around them), but there is no public number for how big each channel is. Treat any split between "friends", "video", "search" as a guess.
- The 18+ group (about a quarter of age-checked users) behaves more like Steam/Letterboxd users: lists, reviews, taste-based curation. Kids under 13 are mostly steered by friends and video. The site should probably serve both, with social features aimed at 13+ or 18+.

### Gaps
- No survey (Roblox, Pew, Common Sense Media, Newzoo, Ofcom) was found that splits Roblox game discovery by channel. Ofcom's full PDF and interactive data were not read in detail and may contain a gaming-discovery question.
- Pew and Common Sense Media 2024-2026 data on teen gaming were not searched for within the call budget.
- Roblox's own "Culture" or trends reports were not checked for discovery data.
- No data on Discord's role in finding Roblox games.

## What frustrates players about Roblox discovery?

### Takeaway
The documented frustrations are: a few viral meme games dominating the front page, copycat and low-effort AI-assisted "brainrot" games, monetisation that pushes paid boosts, and fears that algorithm and AI search changes bury small games. Direct Reddit thread evidence was not retrieved, so the strength of player (as opposed to press and developer) sentiment is not measured.

### Cited Findings
- Roblox removed the copycat "Steal an Egg" (paid speed boosts, AI-generated "slop" videos on a treadmill) and announced restrictions for younger accounts on games that reward players for watching a continuous content feed with no natural stopping point (August 2026). — [MassivelyOP](https://massivelyop.com/2026/08/29/roblox-clamps-down-on-gen-ai-brainrot-scrolling-games-after-steal-an-egg-goes-viral/)
- Coverage ties the brainrot wave to Roblox's AI creation tools letting solo developers ship meme games quickly. — [RoWatcher](https://rowatcher.com/news/from-brainrot-to-skibidi-how-roblox-became-tiktok-s-gaming-mirror)
- YPulse (Nov 2025) reports a games executive concluding that Gen Z "doesn't care about quality anymore" after a viral Roblox game, and argues against that reading. — [YPulse](https://www.ypulse.com/newsfeed/2025/11/26/one-viral-roblox-game-has-gaming-execs-convinced-gen-z-loves-ai-slop/)
- Il Sole 24 Ore describes brainrot titles as relying on impulse purchases, low prices and promises of easy rewards (no figures cited). — [Il Sole 24 Ore](https://en.ilsole24ore.com/art/italian-brainrot-now-also-invades-video-games-AHVW3l4B)
- A TD Cowen analyst said the Roblox algorithm was being heavily manipulated (reported). — [Gameranx](https://gameranx.com/updates/id/539174/article/td-cowen-believes-roblox-algorithm-is-being-manipulated-heavily/) (secondary; details not fetched)
- A RoWatcher piece argues worse games outrank better ones in discovery. — [RoWatcher](https://rowatcher.com/news/why-worse-roblox-games-outrank-better-ones-in-discovery-and-how-to-fix-it) (opinion; not fetched)
- Concern that AI search will "kill small games" that depend on exact-keyword search. — [Dexerto](https://www.dexerto.com/roblox/roblox-reportedly-adding-ai-game-search-but-concerns-raised-over-killing-small-games-3408132/)
- Dubit data shows the #1 game alone took 35-48% of Top 20 visits for months in mid to late 2025, which matches the "same few games" complaint in numbers. — [Dubit](https://dubit.io/blog/roblox-top-20-rfy)

### Inferences
- The complaint has shifted. Before 2025 it was "the same old games forever" (Brookhaven, Blox Fruits, Adopt Me). Since RFY it is "the same new meme game everyone copies". Both are about lack of variety on the home page.
- Signals BloxRadar can compute from public APIs that address these complaints (guesses at useful proxies, not tested): clone detection by name/thumbnail similarity to a hit; game pass count and price spread as a "monetisation intensity" measure; update frequency from change logs as an "actively developed" signal; retention proxy from player-count stability rather than spikes.

### Gaps
- No Reddit r/roblox or r/RobloxHelp threads were read directly, and no YouTube comment analysis was done. The volume and wording of player complaints is unmeasured.
- No data found on how many new games are published per day, or how many are AI-assisted.

## Player-run curation models elsewhere, and which BloxRadar could run

### Takeaway
Steam Curators (since 2014) is the best documented model: people or groups publish recommendation lists with short notes, others follow them, and their picks appear on store pages. Letterboxd and Backloggd show that logging, diaries and lists drive discovery for older audiences. No research was found comparing how well these models work. The model list below combines cited precedents with design proposals for BloxRadar, which are marked as proposals.

### Cited Findings
- Steam Curators launched in September 2014 with the Discovery Update: users and groups make lists of recommended games with short blurbs and links; others follow them and see their picks. — [Engadget, 2014](https://www.engadget.com/2014-09-23-steam-reaches-100-million-users-adds-curators-feature.html) (older fact); [MCV/Develop](https://www.mcvuk.com/business-news/pc/valve-shakes-up-steam-game-discoverability/)
- Valve's designer described Steam's recommendations as combining a player's stated tastes, play data and ownership, curator reviews and a recommendations feed. — [MCV/Develop](https://www.mcvuk.com/business-news/pc/valve-shakes-up-steam-game-discoverability/)
- Backloggd uses the IGDB database, is free and web-based, and has weekly and monthly "journals" similar to Letterboxd's diary. — [Nerdburglars roundup](https://nerdburglars.net/?p=1105202)
- Reddit users report better results from human recommendation lists than from recommendation engines (anecdote). — [PC Gamer forums](https://forums.pcgamer.com/threads/steam-can-be-depressing-sometimes-what-are-your-suggestions.113212)
- Roblox's own creator docs say curation, charts and social sharing can speed up a game's consideration by RFY. So off-platform curation that sends real players is in line with how Roblox ranks games, though those players' engagement is not counted in the ranking stage itself. — [Roblox Creator Docs](https://create.roblox.com/docs/production/promotion/discovery)

### Inferences (design proposals for BloxRadar, not tested)
Curation:
- Staff "Daily pick" and a "Weekly digest" of new games that pass simple quality checks (updated recently, not a near-copy of a top game, low game pass count). Lowest safety risk because staff write all text.
- "Rising" charts based on retention-like signals (player counts that hold steady over days) rather than raw spikes, so the site does not just repeat the viral top game.
- Curator lists in the Steam style, limited to verified adult or 13+ accounts, with lists made from a fixed set of tags and short text from a moderated or preset vocabulary.
- "Games like X" built from shared tags, genre and similar game pass structure.
- Mood and genre filters ("short sessions", "play with friends", "no pay-to-win", "calm"), drawn from data BloxRadar already has.

Social and playful:
- "Random game" button that draws only from games that passed quality checks and the viewer's maturity filter.
- "Scout" record: show which users bookmarked a game before it passed a player-count threshold. Keep it a badge or a public "early spotter" history, not points, odds or rewards. See safety section.
- Game of the week voting by tag (no free text), which is easy to moderate.
- Creator-submitted "new release" queue reviewed by staff, which helps small creators without user-generated text.

### Gaps
- No evidence on how well curator systems improve discovery (Steam curator impact was not measured in found sources).
- Letterboxd list mechanics and Backloggd discovery usage were not documented in the results.
- No found examples of "early spotter" leaderboards in gaming specifically; the idea comes from the brief, not from a cited precedent.

## Safety and legal limits for a third-party discovery site used by children

### Takeaway
A site that kids will visit must plan for COPPA (US, amended rule in force since 22 April 2026) and the UK Children's Code (high-privacy defaults, profiling off by default, no nudges). The safest design keeps under-13 visitors anonymous, with no accounts, reviews or chat, and puts any user-generated content and social features behind age-gated 13+ or 18+ accounts. Roblox trademark rules ban on-platform uses of "Roblox" and "Blox" in names; whether that covers an off-platform brand like "BloxRadar" was not settled by the sources found and needs a direct read of Roblox's Name and Logo guidelines.

### Cited Findings
COPPA (US):
- The FTC's COPPA amendments were published 22 April 2025, took effect June 2025 (sources say 21 or 23 June), and operators had to comply by 22 April 2026. — [White & Case](https://www.whitecase.com/insight-alert/unpacking-ftcs-coppa-amendments-what-you-need-know); [Ashurst Perkins Coie](https://www.ashurstperkinscoie.com/en/insights/ftc-finally-publishes-amended-coppa-rule-compliance-deadlines-set/); [Hunton](https://www.hunton.com/privacy-and-cybersecurity-law-blog/tag/coppa)
- Changes include biometric identifiers in the definition of personal information and a separate verifiable parental consent for disclosing children's data to third parties for targeted advertising and other purposes. — [Mayer Brown](https://www.mayerbrown.com/en/insights/publications/2025/04/ftc-announces-significant-amendments-to-coppa)
- The FTC issued a policy statement that it will not bring COPPA actions against general or mixed-audience sites that collect personal information only to determine a user's age, if strict safeguards are followed. — [Hunton](https://www.hunton.com/privacy-and-cybersecurity-law-blog/tag/coppa)

UK Children's Code (ICO):
- 15 standards with the child's best interests as the main consideration. Settings must be high privacy by default; geolocation off by default; profiling off by default unless justified as in the child's best interests and with safeguards against harmful content; no nudge techniques that push children to give more data or weaken privacy (some summaries add encouraging longer use). — [ICO Code PDF](https://ico.org.uk/media/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/age-appropriate-design-a-code-of-practice-for-online-services-2-1.pdf); [Brodies](https://brodies.com/insights/ip-technology-and-data/what-do-you-need-to-know-about-the-icos-age-appropriate-design-code/)
- The ICO has warned social media and video platforms they could face enforcement over children's privacy. — [Clym](https://www.clym.io/blog/ico-warns-social-media-and-video-platforms-about-childrens-privacy-practices)

Roblox rules:
- Roblox's June 2025 terms update widened the ban on using "Roblox", "Blox" and similar names to usernames, display names and community names on the platform. The Terms incorporate the Community Standards, DMCA policies and the Roblox Name and Logo Community Usage Guidelines. — [ConductAtlas diff of Roblox Terms](https://conductatlas.com/diff/roblox/roblox-terms-of-use/1933/1857/) (secondary; the official Name and Logo guidelines were not read)
- Off-platform links inside Roblox: only YouTube, Facebook, Discord, Twitter (X) and Twitch are allowed, and only through PolicyService or the official Social Links fields on a profile or experience page; links in chat are banned; sending users to an allowed site in order to reach a non-allowed one also breaks the rules. — [Snopes quoting Roblox policy, 2023](https://www.snopes.com/news/2023/01/10/roblox-self-harm-dares-game-facebook/) (older); [Roblox Rules of Conduct](https://en.help.roblox.com/hc/en-us/articles/203313410-Roblox-Rules-of-Conduct)
- Under-13 users cannot see or post these links, per a fan wiki summary of an older Terms update (not verified against current policy). — [Roblox Fandom Wiki](https://roblox.fandom.com/wiki/Roblox_Terms_of_Use)
- Example fan-site disclaimer: Bloxodes says it is independent, not affiliated with or endorsed by Roblox Corporation, and that Roblox names and logos are trademarks used for information only. — [Bloxodes ToS](https://bloxodes.com/terms-of-service)
- Roblox has restricted, for younger accounts, games that reward watching a continuous content feed without natural stopping points (Aug 2026). — [MassivelyOP](https://massivelyop.com/2026/08/29/roblox-clamps-down-on-gen-ai-brainrot-scrolling-games-after-steal-an-egg-goes-viral/)

### Inferences
- "BloxRadar" contains "Blox". The cited ban covers on-platform names (usernames, display names, community names). If BloxRadar ever runs a Roblox group, account or experience under that name, it may be refused. Off-platform use is not settled by these sources. This is a real risk to check before launch, not a guess about the outcome.
- BloxRadar cannot put its own URL in Roblox experience descriptions or chat; it is not on the allowed list. Creators who want to promote their BloxRadar page would have to go through YouTube, X, Discord etc. So "share this game's BloxRadar page" works off Roblox, not inside it.
- Child-safe default design that fits both COPPA and the ICO code (proposal): no account needed to browse; no tracking-based personalisation for unknown-age visitors; no free-text reviews, comments or DMs for anyone not age-checked; preset tags and emoji reactions instead of text; no infinite feeds or streak pressure; no third-party ad trackers on pages likely visited by kids.
- Prediction or "scout" features: anything where users stake points, currency or items on a game becoming a hit, with a chance-based payout, resembles betting and should be avoided with minors. A non-competitive record ("you bookmarked this on 3 March, it now has 40k players") gives the same fun without stakes. This is a design judgement; no specific law on prediction games for minors was retrieved.
- User reviews are the highest-risk feature: grooming contact attempts, links to scam or "free Robux" sites, harassment of creators, and review bombing. If added, limit them to 18+ verified accounts, block links, and moderate before publishing.

### Gaps
- Roblox's official Terms of Use text on API use, scraping and automated access was not retrieved. BloxRadar uses public APIs; the exact allowed use and rate limits need a direct read of the Terms and the Open Cloud docs.
- Official Roblox Name and Logo Community Usage Guidelines were not read; whether a third-party site may use "Blox" in its name, or Roblox logos, is unresolved.
- No research found on gambling-like mechanics law for minors specific to prediction leaderboards (e.g. UK Gambling Commission guidance on free-to-play prediction games).
- EU Digital Services Act and Australia's Online Safety Act duties for a small site were not researched.
- UK Online Safety Act user-to-user service duties (which would apply if BloxRadar allows user reviews or comments) were not researched.

## What does a parent want from a discovery site?

### Takeaway
No parent survey on game discovery preferences was found. Roblox's own systems show what information exists and what parents are already told to check: maturity level, content descriptors, spending pressure, social features (chat, hangouts), and whether a game is blocked for young accounts. A discovery site can show these plainly and add monetisation intensity, which Roblox does not show.

### Cited Findings
- Roblox has four content maturity levels: Minimal, Mild, Moderate, Restricted. Under-9 users can only reach Minimal and Mild by default. Sources differ on Restricted: ESRB says 17+ with ID verification, Webwise says 18+ age-checked. — [ESRB](https://www.esrb.org/news/what-parents-need-to-know-about-roblox); [Webwise](https://www.webwise.ie/parents/explainers/explained-what-is-roblox/)
- Late 2025 age-based accounts: by default, accounts for younger users exclude games with sensitive issues, social hangouts or free-form drawing; Roblox assigns maturity labels for these accounts. — [Nasdaq press release](https://www.nasdaq.com/press-release/roblox-introduces-new-age-based-accounts-and-expanded-parental-controls-users-under)
- Parent controls cover spending limits and blocking, screen-time limits, friends list management and blocking specific games; guides note some games push Robux spending to progress faster. — [Kidslox guide](https://kidslox.com/blog/roblox-parental-controls/) (third-party); [eSafety Commissioner](https://www.esafety.gov.au/key-issues/esafety-guide/roblox)
- Roblox limited messaging for under-13 users in November 2024. — [MediaNama](https://www.medianama.com/2024/11/223-roblox-limits-messaging-for-under-13-users-amid-safety-concerns/)
- A parent guide advises reading reviews, watching gameplay video and trying the game yourself. — [Bark](https://www.bark.us/blog/ask-titania-roblox/)

### Inferences
- A parent-facing "game card" could show, from public API data: maturity label and descriptors; number of game passes and price range in Robux (monetisation intensity); whether there is voice chat or a social hangout tag; update history; age of the game. A plain-language "spending pressure" rating (low/medium/high, from game pass count and price) would be new information parents do not get from Roblox. The threshold values are placeholders.
- A "parent mode" filter (Minimal/Mild only, low spending pressure, no hangout games) is a simple and defensible feature.

### Gaps
- No Common Sense Media, Pew or Ofcom parent survey on what parents want from game ratings or discovery tools was retrieved.
- Common Sense Media's own Roblox game reviews and their rating approach were not checked as a model.
