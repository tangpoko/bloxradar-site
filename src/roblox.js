// Thin wrappers around the public Roblox web APIs. None of them need an API key,
// but they reject browser requests, so this only runs on the server.
import { randomUUID } from 'node:crypto';

const GAMES_BATCH = 50; // measured: /v1/games returns 400 above 50 IDs
const ICONS_BATCH = 50;

// Measured on games.roblox.com: after a rest it allows about 11 requests, then answers 429
// until roughly 30 seconds have passed. Sending one request every 3 seconds stays at
// 10 per 30 seconds. 2,500 games is 50 requests, about 2.5 minutes, well inside a 10 minute run.
const GAMES_GAP_MS = 3000;
const ICONS_GAP_MS = 1000;
const RATE_LIMIT_WAIT_MS = 30000;
const MAX_TRIES = 7;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJson(url) {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(url, { headers: { accept: 'application/json' } });
    if (res.ok) return res.json();
    // 429 is rate limiting, 5xx is Roblox having a bad moment. Both are worth retrying.
    const retryable = res.status === 429 || res.status >= 500;
    if (!retryable || attempt >= MAX_TRIES) {
      const err = new Error(`${res.status} from ${url.slice(0, 120)}`);
      err.status = res.status;
      throw err;
    }
    const wait = res.status === 429 ? RATE_LIMIT_WAIT_MS : 2000 * attempt;
    await sleep(wait + Math.random() * 3000);
  }
}

function chunk(list, size) {
  const out = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

// Requests batches one at a time with a gap between them. A batch that still fails after
// all retries is reported in `failed` instead of throwing, so one bad batch can't lose a whole run.
async function paced(batches, gapMs, fn) {
  const ok = [];
  const failed = [];
  for (let i = 0; i < batches.length; i++) {
    if (i > 0) await sleep(gapMs);
    try {
      ok.push(await fn(batches[i]));
    } catch (err) {
      failed.push({ ids: batches[i], error: String(err.message || err) });
    }
  }
  return { ok, failed };
}

// Every chart on the Roblox home/Charts page: Top Earning, Up-and-Coming, Trending in X...
// Returns [{ sortId, name, games: [{ universeId, playerCount, totalUpVotes, ... }] }].
// Sponsored entries are dropped so they don't count as chart positions.
export async function fetchSorts() {
  const sessionId = randomUUID();
  const base = `https://apis.roblox.com/explore-api/v1/get-sorts?sessionId=${sessionId}&device=computer&country=all`;
  const sorts = [];
  let token = '';
  for (let page = 0; page < 20; page++) {
    const url = token ? `${base}&sortsPageToken=${encodeURIComponent(token)}` : base;
    const body = await getJson(url);
    for (const s of body.sorts ?? []) {
      const games = (s.games ?? []).filter((g) => !g.isSponsored);
      if (games.length) sorts.push({ sortId: s.sortId, name: s.sortDisplayName, games });
    }
    token = body.nextSortsPageToken;
    if (!token) break;
  }
  return sorts;
}

// Keyword search. Each page holds 40 games with their live player count, so one request finds
// 40 games without touching games.roblox.com. Measured: 60 pages in a row at a 1 s gap, no 429.
// Returns Map(universeId -> { name, players }) for up to `pages` pages of results.
// Roblox gives nothing for an empty query, and the order is by relevance, not by players.
const SEARCH_GAP_MS = 1000;
export async function searchGames(query, pages) {
  const sessionId = randomUUID();
  const found = new Map();
  let token = '';
  for (let page = 0; page < pages; page++) {
    if (page > 0) await sleep(SEARCH_GAP_MS);
    const body = await getJson(
      `https://apis.roblox.com/search-api/omni-search?searchQuery=${encodeURIComponent(query)}` +
        `&pageToken=${encodeURIComponent(token)}&sessionId=${sessionId}&pageType=all`
    );
    for (const group of body.searchResults ?? []) {
      for (const c of group.contents ?? []) {
        if (c.contentType === 'Game' && !c.isSponsored) found.set(c.universeId, { name: c.name, players: c.playerCount ?? 0 });
      }
    }
    token = body.nextPageToken;
    if (!token) break;
  }
  return found;
}

// Full details (live player count, visits, genre, creator) for any number of universe IDs.
// Returns { games, failedIds }. IDs in failedIds were not read this run, which is different
// from Roblox answering without them (deleted or private games).
export async function fetchGames(universeIds) {
  const { ok, failed } = await paced(chunk(universeIds, GAMES_BATCH), GAMES_GAP_MS, (ids) =>
    getJson(`https://games.roblox.com/v1/games?universeIds=${ids.join(',')}`)
  );
  return {
    games: ok.flatMap((p) => p.data ?? []),
    failedIds: failed.flatMap((f) => f.ids),
    errors: failed.map((f) => f.error),
  };
}

// Likes and dislikes. Same host and rate limit as /v1/games, so it uses the same pacing.
// Returns Map(universeId -> { up, down }).
export async function fetchVotes(universeIds) {
  const { ok } = await paced(chunk(universeIds, GAMES_BATCH), GAMES_GAP_MS, (ids) =>
    getJson(`https://games.roblox.com/v1/games/votes?universeIds=${ids.join(',')}`)
  );
  const votes = new Map();
  for (const p of ok) for (const v of p.data ?? []) votes.set(v.id, { up: v.upVotes, down: v.downVotes });
  return votes;
}

// Events a game announced through Roblox's events feature that end after `from`, so it includes
// events running now and upcoming ones. Without fromUtc Roblox lists every event since 2024, oldest
// first. Returns [{ id, title, category, start, end }].
export async function fetchEvents(universeId, from) {
  const base = `https://apis.roblox.com/virtual-events/v1/universes/${universeId}/virtual-events?limit=100&fromUtc=${encodeURIComponent(from.toISOString())}`;
  const { items } = await allPages(base, (c) => `${base}&cursor=${encodeURIComponent(c)}`, (b) => b.data, (b) => b.nextPageCursor, 2);
  return items
    .filter((e) => e.eventVisibility !== 'private' && e.eventTime?.startUtc)
    .map((e) => ({
      id: e.id,
      title: e.displayTitle || e.title || '',
      category: [...(e.eventCategories ?? [])].sort((a, b) => a.rank - b.rank)[0]?.category ?? null,
      start: e.eventTime.startUtc,
      end: e.eventTime.endUtc ?? null,
    }));
}

// Image IDs of each game's thumbnails, in display order. Comparing the list day to day shows
// when a developer changes thumbnails. Returns Map(universeId -> [imageId, ...]).
// urls, if given, gets each game's thumbnail image addresses in the same order, for its game page.
export async function fetchThumbnailIds(universeIds, urls = null) {
  const { ok } = await paced(chunk(universeIds, ICONS_BATCH), ICONS_GAP_MS, (ids) =>
    getJson(
      `https://thumbnails.roblox.com/v1/games/multiget/thumbnails?universeIds=${ids.join(',')}&countPerUniverse=10&size=768x432&format=Webp`
    )
  );
  const thumbs = new Map();
  for (const p of ok) {
    for (const u of p.data ?? []) {
      if (u.error) continue;
      thumbs.set(u.universeId, (u.thumbnails ?? []).map((t) => t.targetId));
      const done = (u.thumbnails ?? []).filter((t) => t.state === 'Completed' && t.imageUrl).map((t) => t.imageUrl);
      if (urls && done.length) urls.set(u.universeId, done);
    }
  }
  return thumbs;
}

// The badges, game pass and developer product hosts let 30 quick requests through without
// a 429 (measured), so a short gap is enough there.
const LIGHT_GAP_MS = 300;
const BADGE_PAGES = 5;
// Some top games have 500 to 750 developer products, listed oldest first, so a low page
// limit would hide every new product. 20 pages is 2,000 products.
const PRODUCT_PAGES = 20;

// Follows a cursor through up to maxPages pages. `truncated` is true when a next page
// still existed at the limit, so callers know the list may be incomplete.
async function allPages(firstUrl, nextUrl, items, nextToken, maxPages) {
  const out = [];
  let url = firstUrl;
  for (let page = 0; page < maxPages && url; page++) {
    if (page > 0) await sleep(LIGHT_GAP_MS);
    const body = await getJson(url);
    out.push(...(items(body) ?? []));
    const token = nextToken(body);
    url = token ? nextUrl(token) : null;
  }
  return { items: out, truncated: !!url };
}

// Returns [{ id, name, pastDay, winRate, total }]. winRate is a fraction (0.059 = 5.9%)
// even though Roblox names the field winRatePercentage.
export async function fetchBadges(universeId) {
  const base = `https://badges.roblox.com/v1/universes/${universeId}/badges?limit=100&sortOrder=Asc`;
  const { items: badges } = await allPages(
    base, (c) => `${base}&cursor=${encodeURIComponent(c)}`, (b) => b.data, (b) => b.nextPageCursor, BADGE_PAGES
  );
  return badges
    .filter((b) => b.enabled !== false && b.statistics)
    .map((b) => ({
      id: b.id,
      name: b.displayName || b.name,
      pastDay: b.statistics.pastDayAwardedCount ?? 0,
      winRate: b.statistics.winRatePercentage ?? 0,
      total: b.statistics.awardedCount ?? 0,
    }));
}

// Game passes and developer products together.
// Returns { products: [{ kind, id, name, price, forSale, created, updated }], truncated: { pass, devproduct } }.
// Roblox sends price null exactly when an item is off sale (measured on 657 products).
export async function fetchProducts(universeId) {
  const passBase = `https://apis.roblox.com/game-passes/v1/universes/${universeId}/game-passes?passView=Full&pageSize=100`;
  const passes = await allPages(
    passBase, (t) => `${passBase}&pageToken=${encodeURIComponent(t)}`, (b) => b.gamePasses, (b) => b.nextPageToken, PRODUCT_PAGES
  );
  await sleep(LIGHT_GAP_MS);
  const dpBase = `https://apis.roblox.com/developer-products/v2/universes/${universeId}/developerproducts?limit=100`;
  const devProducts = await allPages(
    dpBase, (c) => `${dpBase}&cursor=${encodeURIComponent(c)}`, (b) => b.developerProducts, (b) => b.nextPageCursor, PRODUCT_PAGES
  );
  const products = [
    ...passes.items.map((p) => ({
      kind: 'pass', id: p.id, name: p.displayName || p.name, price: p.price ?? null,
      forSale: !!p.isForSale, created: p.created, updated: p.updated,
    })),
    ...devProducts.items.map((d) => ({
      kind: 'devproduct', id: d.DeveloperProductId, name: d.DisplayName || d.Name, price: d.PriceInRobux ?? null,
      forSale: !!d.IsForSale, created: d.Created, updated: d.Updated,
    })),
  ];
  return { products, truncated: { pass: passes.truncated, devproduct: devProducts.truncated } };
}

// Returns { icons: Map(universeId -> icon URL) for icons that are ready, checked: IDs whose
// batch got an answer }. IDs from failed batches are left out of `checked` so they get retried.
export async function fetchIcons(universeIds) {
  const { ok } = await paced(chunk(universeIds, ICONS_BATCH), ICONS_GAP_MS, async (ids) => ({
    ids,
    body: await getJson(
      `https://thumbnails.roblox.com/v1/games/icons?universeIds=${ids.join(',')}&size=150x150&format=Webp&isCircular=false`
    ),
  }));
  const icons = new Map();
  const checked = [];
  for (const { ids, body } of ok) {
    checked.push(...ids);
    for (const t of body.data ?? []) if (t.state === 'Completed') icons.set(t.targetId, t.imageUrl);
  }
  return { icons, checked };
}

// One page (30 items) of the marketplace catalog. Measured: catalog.roblox.com answers 429 after
// about 9 requests one second apart, so callers wait CATALOG_GAP_MS between pages.
// sort: 1 most favorited, 2 best selling, 3 newest. sortAggregation (best selling only): 1 past day,
// 3 past week, 4 past month, 5 all time. minPrice 1 leaves out free items, which otherwise fill the
// best-selling lists. Returns { items, next }; pass `next` back as `cursor` for the following page.
export const CATALOG_GAP_MS = 3000;
export async function fetchCatalogPage({ sort, sortAggregation, minPrice, category, subcategory, cursor }) {
  const q = new URLSearchParams({ Category: String(category ?? 1), SortType: String(sort), Limit: '30' });
  if (subcategory) q.set('Subcategory', String(subcategory));
  if (sortAggregation) q.set('SortAggregation', String(sortAggregation));
  if (minPrice) q.set('MinPrice', String(minPrice));
  if (cursor) q.set('cursor', cursor);
  const body = await getJson(`https://catalog.roblox.com/v1/search/items/details?${q}`);
  const items = (body.data ?? []).map((i) => ({
    type: i.itemType === 'Bundle' ? 'Bundle' : 'Asset',
    id: i.id,
    name: i.name,
    creatorId: i.creatorTargetId,
    creatorName: i.creatorName,
    creatorType: i.creatorType === 'Group' ? 'Group' : 'User',
    kind: i.taxonomy?.[0]?.taxonomyName ?? null,
    createdAt: i.itemCreatedUtc ?? null,
    price: i.price ?? null,
    favorites: i.favoriteCount ?? null,
    lowestResale: i.lowestResalePrice || null,
    totalQuantity: i.totalQuantity || null,
  }));
  return { items, next: body.nextPageCursor || null };
}

// Thumbnail addresses for catalog items, 100 per request. `items` is [{ type, id }].
// Returns Map("Asset|123" -> url) for thumbnails that are ready. Assets last 180 days, bundles
// only 30 (the address contains the expiry), so callers refresh them every few weeks.
export async function fetchCatalogThumbs(items) {
  const found = new Map();
  for (const type of ['Asset', 'Bundle']) {
    const ids = items.filter((i) => i.type === type).map((i) => i.id);
    const url = type === 'Asset' ? 'https://thumbnails.roblox.com/v1/assets?assetIds=' : 'https://thumbnails.roblox.com/v1/bundles/thumbnails?bundleIds=';
    const { ok } = await paced(chunk(ids, 100), ICONS_GAP_MS, (batch) => getJson(`${url}${batch.join(',')}&size=150x150&format=Png`));
    for (const body of ok) {
      for (const t of body.data ?? []) if (t.state === 'Completed' && t.imageUrl) found.set(`${type}|${t.targetId}`, t.imageUrl);
    }
  }
  return found;
}
