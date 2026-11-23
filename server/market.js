// Creators: turns the day's catalog rows into lists. The data layer gives one row per item for
// the latest day we hold (catalogSnapshot), with its position in each list we read. Filtering and
// sorting happen here, in memory: a few thousand items, refreshed when the daily job has run.
import { data } from './data/index.js';
import { MARKET } from './config.js';
import { creatorIcons } from './profile.js';

export const GROUPS = [
  ['characters', 'Characters'],
  ['emotes', 'Emotes'],
  ['bundles', 'Animation bundles'],
  ['clothing', 'Clothing'],
  ['accessories', 'Accessories'],
];
const GROUP_KEYS = GROUPS.map(([k]) => k);

// Roblox's first taxonomy name for an item (catalog_items.kind) -> our group, and the id of the
// catalog subcategory src/catalog.js reads for it (those lists are named like sold_7d@64).
const KINDS = {
  Characters: ['characters', 37],
  Emotes: ['emotes', 39],
  'Animation Bundle': ['bundles', 38],
  'T-Shirt': ['clothing', 58],
  Shirt: ['clothing', 59],
  Sweater: ['clothing', 62],
  Jacket: ['clothing', 61],
  Pants: ['clothing', 60],
  Shorts: ['clothing', 63],
  'Dresses & Skirts': ['clothing', 65],
  Shoes: ['clothing', 64],
  Bodysuit: ['clothing', null],
  Hair: ['accessories', 20],
  Heads: ['accessories', 66],
  'Head Accessories': ['accessories', 54],
  'Face Accessories': ['accessories', 21],
  'Neck Accessories': ['accessories', 22],
  'Shoulder Accessories': ['accessories', 23],
  'Front Accessories': ['accessories', 24],
  'Back Accessories': ['accessories', 25],
  'Waist Accessories': ['accessories', 26],
  Gear: ['accessories', 5],
};

const PERIODS = { '1d': 'sold_1d', '7d': 'sold_7d', '30d': 'sold_30d', all: 'sold_all' };
export const SORTS = ['sold', 'favorites', 'newest', 'price-low', 'price-high'];
const ROBLOX_ID = 1;

const robloxUrl = (type, id) => (type === 'Bundle' ? `https://www.roblox.com/bundles/${id}` : `https://www.roblox.com/catalog/${id}`);
const creatorUrl = (type, id) => (type === 'Group' ? `https://www.roblox.com/communities/${id}` : `https://www.roblox.com/users/${id}/profile`);

let snap = { expires: 0, promise: null };

function build(raw) {
  const items = raw.items.map((r) => {
    const [group, sub] = KINDS[r.kind] || ['accessories', null];
    const ranks = r.ranks || {};
    return {
      key: `${r.item_type}${r.item_id}`,
      id: Number(r.item_id),
      type: r.item_type,
      name: r.name,
      kind: r.kind || 'Other',
      group,
      sub,
      creator: { id: Number(r.creator_id), name: r.creator_name, type: r.creator_type, url: creatorUrl(r.creator_type, r.creator_id) },
      thumb: r.thumb_url || null,
      price: r.price === null || r.price === undefined ? null : Number(r.price),
      favorites: r.favorites === null || r.favorites === undefined ? null : Number(r.favorites),
      limited: (r.lowest_resale ?? null) !== null || (r.total_quantity ?? null) !== null,
      resale: r.lowest_resale === null || r.lowest_resale === undefined ? null : Number(r.lowest_resale),
      quantity: r.total_quantity === null || r.total_quantity === undefined ? null : Number(r.total_quantity),
      created: r.created_at ? new Date(r.created_at).toISOString() : null,
      url: robloxUrl(r.item_type, r.item_id),
      ranks,
      search: `${r.name} ${r.creator_name}`.toLowerCase(),
    };
  });
  const byCreator = new Map();
  for (const it of items) {
    if (!byCreator.has(it.creator.id)) byCreator.set(it.creator.id, []);
    byCreator.get(it.creator.id).push(it);
  }
  return { day: raw.day, items, byCreator };
}

// Reloaded every few minutes. The data changes once a day, so this is cheap.
function snapshot() {
  if (snap.expires > Date.now()) return snap.promise;
  const promise = data.catalogSnapshot().then(build);
  snap = { expires: Date.now() + MARKET.snapshotSeconds * 1000, promise };
  promise.catch(() => {
    if (snap.promise === promise) snap = { expires: 0, promise: null };
  });
  return promise;
}

// ---------- Query parsing ----------

const intOf = (v, max) => {
  const n = Number.parseInt(v ?? '', 10);
  return Number.isFinite(n) && n >= 0 ? Math.min(n, max) : null;
};

export function parse(url) {
  const p = url.searchParams;
  const sort = SORTS.includes(p.get('sort')) ? p.get('sort') : 'sold';
  const creator = /^\d{1,19}$/.test(p.get('creator') || '') ? Number(p.get('creator')) : null;
  const q = {
    q: (p.get('q') || '').trim().slice(0, 60).toLowerCase(),
    group: GROUP_KEYS.includes(p.get('group')) ? p.get('group') : '',
    kind: Object.hasOwn(KINDS, p.get('kind')) ? p.get('kind') : '',
    sort,
    period: Object.hasOwn(PERIODS, p.get('period')) ? p.get('period') : '7d',
    hideRoblox: p.get('roblox') === '0',
    csort: p.get('csort') === 'best' ? 'best' : 'items',
    min: intOf(p.get('min'), 1e9),
    max: intOf(p.get('max'), 1e9),
    limited: p.get('limited') === '1',
    creator,
    limit: Math.max(1, Math.min(intOf(p.get('limit'), MARKET.maxLimit) || MARKET.pageSize, MARKET.maxLimit)),
    offset: intOf(p.get('offset'), 100000) || 0,
  };
  return q;
}

export const keyOf = (q) =>
  [q.q, q.group, q.kind, q.sort, q.period, q.hideRoblox ? 0 : 1, q.min ?? '', q.max ?? '', q.limited ? 1 : 0, q.creator ?? '', q.limit, q.offset, q.csort].join('|');

// ---------- Filtering and sorting ----------

function matches(q) {
  return (it) => {
    if (q.creator !== null && it.creator.id !== q.creator) return false;
    if (q.hideRoblox && it.creator.id === ROBLOX_ID) return false;
    if (q.q && !it.search.includes(q.q)) return false;
    if (q.group && it.group !== q.group) return false;
    if (q.kind && it.kind !== q.kind) return false;
    if (q.limited && !it.limited) return false;
    if (q.min !== null || q.max !== null) {
      if (it.price === null) return false;
      if (q.min !== null && it.price < q.min) return false;
      if (q.max !== null && it.price > q.max) return false;
    }
    return true;
  };
}

// Position in the best-selling order for the period. Roblox gives the order, not sales counts.
// Items in the overall top 300 rank by that. Items only in their own subcategory's weekly list come
// after all of those (they sold less than #300 overall), ordered by their subcategory position.
// With a clothing type or similar chosen, the subcategory list is the order, since it is the
// complete top 60 of that type. Only the weekly list is read per subcategory.
function soldRank(it, q) {
  const subKey = it.sub ? `sold_7d@${it.sub}` : null;
  if (q.kind && subKey) {
    const pos = it.ranks[subKey];
    return pos ? { pos, rank: pos, label: `#${pos} in ${it.kind} this week` } : null;
  }
  const list = PERIODS[q.period];
  const over = it.ranks[list];
  if (over) return { pos: over, rank: over, label: `#${over} ${PERIOD_LABEL[q.period]}` };
  const sub = subKey && q.period === '7d' ? it.ranks[subKey] : null;
  if (sub) return { pos: MARKET.overallDepth + sub, rank: sub, label: `#${sub} in ${it.kind} this week` };
  return null;
}
const PERIOD_LABEL = { '1d': 'today', '7d': 'this week', '30d': 'this month', all: 'of all time' };

const COMPARE = {
  favorites: (a, b) => (b.favorites ?? -1) - (a.favorites ?? -1),
  newest: (a, b) => (Date.parse(b.created) || 0) - (Date.parse(a.created) || 0),
  'price-low': (a, b) => (a.price ?? Infinity) - (b.price ?? Infinity),
  'price-high': (a, b) => (b.price ?? -1) - (a.price ?? -1),
};

function ordered(list, q) {
  if (q.sort === 'sold') {
    const withRank = list.map((it) => ({ it, r: soldRank(it, q) }));
    withRank.sort((a, b) => {
      if (a.r && b.r) return a.r.pos - b.r.pos;
      if (a.r) return -1;
      if (b.r) return 1;
      return (b.it.favorites ?? -1) - (a.it.favorites ?? -1);
    });
    return withRank.map(({ it, r }) => ({ it, rank: r }));
  }
  return [...list].sort(COMPARE[q.sort]).map((it) => ({ it, rank: soldRank(it, q) }));
}

// Why an item is on our lists: the most recent best selling list it is in, else one of the others.
function whyListed(it) {
  const r = it.ranks;
  if (r.sold_7d || (it.sub && r[`sold_7d@${it.sub}`])) return 'Top seller this week';
  if (r.sold_30d) return 'Top seller this month';
  if (r.sold_all) return 'Top seller all time';
  if (r.sold_1d) return 'Top seller today';
  if (r.favorited) return 'Most favourited';
  if (r.newest) return 'New';
  return null;
}

const shape = ({ it, rank }) => ({
  id: it.id,
  type: it.type,
  name: it.name,
  kind: it.kind,
  group: it.group,
  creator: it.creator,
  thumb: it.thumb,
  price: it.price,
  favorites: it.favorites,
  limited: it.limited,
  resale: it.resale,
  quantity: it.quantity,
  created: it.created,
  url: it.url,
  rank: rank ? { n: rank.rank, label: rank.label } : null,
  why: whyListed(it),
});

// One page of items for the filters in q, plus the kinds present in the chosen group.
export async function items(q) {
  const s = await snapshot();
  const inScope = s.items.filter(matches({ ...q, kind: '' }));
  const kindCounts = new Map();
  for (const it of inScope) kindCounts.set(it.kind, (kindCounts.get(it.kind) || 0) + 1);
  const list = inScope.filter((it) => !q.kind || it.kind === q.kind);
  const all = ordered(list, q);
  return {
    day: s.day,
    total: all.length,
    offset: q.offset,
    kinds: [...kindCounts].sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count })),
    // True when the weekly order was used although another period was asked for (a type is chosen).
    periodNote: q.sort === 'sold' && q.kind && q.period !== '7d' ? 'With a type chosen the order is this week only.' : null,
    items: all.slice(q.offset, q.offset + q.limit).map(shape),
  };
}

const HOME_COUNT = 10;

// Creators ranked by how many of their items are in the overall weekly top 300.
function topCreators(s, hideRoblox, n, by = 'items') {
  const byCreator = new Map();
  for (const it of s.items) {
    const pos = it.ranks.sold_7d;
    if (!pos || (hideRoblox && it.creator.id === ROBLOX_ID)) continue;
    const c = byCreator.get(it.creator.id) || { creator: it.creator, count: 0, best: pos, thumbs: [] };
    c.count++;
    c.best = Math.min(c.best, pos);
    if (it.thumb && c.thumbs.length < 4) c.thumbs.push(it.thumb);
    byCreator.set(it.creator.id, c);
  }
  return [...byCreator.values()]
    .sort(by === 'best' ? (a, b) => a.best - b.best || b.count - a.count : (a, b) => b.count - a.count || a.best - b.best)
    .slice(0, n)
    .map((c) => {
      const all = s.byCreator.get(c.creator.id) || [];
      return {
        ...c.creator,
        inTop: c.count,
        best: c.best,
        items: all.length,
        favorites: all.reduce((n, it) => n + (it.favorites || 0), 0),
      };
    });
}

// Adds each creator's own icon (group icon or avatar headshot). Missing icons stay null.
async function withIcons(list) {
  const icons = await creatorIcons(list);
  return list.map((c) => ({ ...c, icon: icons.get(c.id) || null }));
}

export async function creators(q) {
  const s = await snapshot();
  return { day: s.day, creators: await withIcons(topCreators(s, q.hideRoblox, 100, q.csort)) };
}

// The front page: several top tens, and the creators with the most items in the weekly top 300.
export async function home(q) {
  const s = await snapshot();
  const base = { hideRoblox: q.hideRoblox, min: null, max: null, group: '', kind: '', creator: null, limited: false, period: '7d' };
  const top = (over) => {
    const qq = { ...base, sort: 'sold', ...over };
    return ordered(s.items.filter(matches(qq)), qq).slice(0, HOME_COUNT).map(shape);
  };
  const sections = [
    { id: 'sold', title: 'Best selling this week', link: '/creators/browse?sort=sold&period=7d', items: top({}) },
    ...GROUPS.map(([g, label]) => ({
      id: g,
      title: `Best selling ${label.toLowerCase()}`,
      link: `/creators/browse?group=${g}&sort=sold&period=7d`,
      items: top({ group: g }),
    })),
    { id: 'favorites', title: 'Most favourited', link: '/creators/browse?sort=favorites', items: top({ sort: 'favorites' }) },
    { id: 'newest', title: 'Newest', link: '/creators/browse?sort=newest', items: top({ sort: 'newest' }) },
    { id: 'limited', title: 'Limiteds', link: '/creators/browse?limited=1&sort=favorites', items: top({ sort: 'favorites', limited: true }) },
  ].filter((x) => x.items.length);

  const creators = await withIcons(topCreators(s, q.hideRoblox, HOME_COUNT));
  return { day: s.day, count: s.items.length, sections, creators };
}

// Basic facts for a creator page. null when we hold no item by them.
export async function creator(id) {
  const s = await snapshot();
  const list = s.byCreator.get(id);
  if (!list) return null;
  const c = list[0].creator;
  const weekly = list.filter((it) => it.ranks.sold_7d || (it.sub && it.ranks[`sold_7d@${it.sub}`]));
  const kinds = new Map();
  for (const it of list) kinds.set(it.kind, (kinds.get(it.kind) || 0) + 1);
  return {
    day: s.day,
    creator: c,
    isRoblox: c.id === ROBLOX_ID,
    count: list.length,
    inWeeklyLists: weekly.length,
    bestWeekly: list.reduce((m, it) => (it.ranks.sold_7d && it.ranks.sold_7d < m ? it.ranks.sold_7d : m), Infinity),
    favorites: list.reduce((n, it) => n + (it.favorites || 0), 0),
    limiteds: list.filter((it) => it.limited).length,
    kinds: [...kinds].sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count })),
  };
}
