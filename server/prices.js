// Price benchmarks for game passes: what games in each genre usually charge for each kind of pass.
// Pass names are sorted into kinds by keywords. A name matching none is "other" and not compared.
import { PRICES } from './config.js';

// [key, label, pattern]. The first match wins, so VIP before multipliers ("VIP 2x Cash" is a VIP pass).
export const PASS_TYPES = [
  ['vip', 'VIP', /\bvip\b/i],
  ['multiplier', '2x or more of something', /(\b\d+(\.\d+)?\s?x\b|\bx\s?\d+\b|\bdouble\b|\btriple\b)/i],
  ['luck', 'Luck', /\blu(ck|cky)\b/i],
  ['speed', 'Speed', /\b(speed|fast|faster|walkspeed)\b/i],
  ['auto', 'Auto (farm, click, collect)', /\bauto/i],
  ['space', 'Extra slots or storage', /\b(slots?|storage|inventory|backpack|capacity|equips?)\b/i],
  ['admin', 'Admin commands', /\b(admin|commands?)\b/i],
  ['radio', 'Radio or music', /\b(radio|boombox|music)\b/i],
  ['starter', 'Starter pack', /\b(starter|beginner)\b/i],
  ['skip', 'Skip', /\bskip/i],
];
const LABELS = Object.fromEntries(PASS_TYPES.map(([k, l]) => [k, l]));
export const typeLabel = (k) => LABELS[k] || 'Other';

export function passType(name) {
  for (const [key, , re] of PASS_TYPES) if (re.test(name || '')) return key;
  return null;
}

// Value at fraction p of a sorted list, interpolated.
function quantile(sorted, p) {
  if (!sorted.length) return null;
  const i = (sorted.length - 1) * p;
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  return Math.round(sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo));
}

// rows: [{ universe_id, name, price, genre_l1 }] (every pass on sale). Each game counts once per
// kind, at its cheapest pass of that kind, so a game with five 2x passes does not count five times.
// Returns Map(genre -> Map(type -> { median, low, high, games })) with genre '' for all genres.
// low and high are the 25th and 75th percentiles, the middle half of games.
export function benchmarks(rows) {
  const per = new Map(); // `${genre}|${type}` -> Map(universe_id -> cheapest price)
  for (const r of rows) {
    const type = passType(r.name);
    if (!type) continue;
    // '' is "all genres". A game with no genre only counts there.
    for (const genre of new Set(['', r.genre_l1 || ''])) {
      const key = `${genre}|${type}`;
      if (!per.has(key)) per.set(key, new Map());
      const m = per.get(key);
      const id = String(r.universe_id);
      const price = Number(r.price);
      if (!m.has(id) || price < m.get(id)) m.set(id, price);
    }
  }
  const out = new Map();
  for (const [key, m] of per) {
    const [genre, type] = key.split('|');
    const prices = [...m.values()].sort((a, b) => a - b);
    if (!out.has(genre)) out.set(genre, new Map());
    out.get(genre).set(type, { median: quantile(prices, 0.5), low: quantile(prices, 0.25), high: quantile(prices, 0.75), games: prices.length });
  }
  return out;
}

// The figure to compare a pass against: the genre's own when enough games sell that kind of pass,
// otherwise the figure for all genres. Returns { ...figure, scope: 'genre' | 'all' } or null.
export function benchmarkFor(bm, genre, type) {
  const own = genre ? bm.get(genre)?.get(type) : null;
  if (own && own.games >= PRICES.minGames) return { ...own, scope: 'genre' };
  const all = bm.get('')?.get(type);
  return all && all.games >= PRICES.minGames ? { ...all, scope: 'all' } : null;
}
