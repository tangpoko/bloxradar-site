// Hours played per day, and the earnings estimate built on it, for one game page.
//
// Hours played is measured: each hourly average player count is one hour times that many players,
// so a day's hours played is the sum of its 24 hourly averages.
//
// Earnings is an estimate. Roblox publishes no game's earnings, so it is
//   average hours per day x 30 x Robux per hour,
// where Robux per hour starts from EARNINGS.baseRobuxPerHour and is moved up or down by what the
// game has for sale (game passes and developer products), compared with the typical game we track.
import { EARNINGS as E } from './config.js';

const dayKey = (d) => (d instanceof Date ? d.toISOString().slice(0, 10) : String(d).slice(0, 10));

// rows: [{ day, player_hours, hours_read }] by UTC day. today: 'YYYY-MM-DD' of the latest run.
// A day with fewer than minHoursForFullDay hourly readings (today, or the day tracking started)
// is marked partial and shown as read. A complete day with an hour or two missing is scaled up to 24.
export function dailyHours(rows, today) {
  return rows.map((r) => {
    const day = dayKey(r.day);
    const read = Number(r.hours_read);
    const sum = Number(r.player_hours);
    const partial = day >= today || read < E.minHoursForFullDay;
    return { day, hours: Math.round(partial ? sum : (sum * 24) / read), partial };
  });
}

const median = (xs) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

// rows: [{ items, geo_price }], one per game whose catalogue has been read and has something for sale.
export function reference(rows) {
  const usable = rows.filter((r) => Number(r.items) > 0 && Number(r.geo_price) > 0);
  if (usable.length < E.minReferenceGames) {
    return { games: usable.length, items: E.fallbackItems, price: E.fallbackPrice, fallback: true };
  }
  return {
    games: usable.length,
    items: median(usable.map((r) => Number(r.items))),
    price: median(usable.map((r) => Number(r.geo_price))),
    fallback: false,
  };
}

// How much this game's catalogue moves the base rate. catalog: { checked, items, geo_price }.
// geo_price is the geometric mean price of what is for sale, so one 100,000 Robux item does not
// swamp twenty items at 50.
export function catalogFactor(catalog, ref) {
  if (!catalog?.checked) return { factor: 1, basis: 'unchecked' };
  const items = Number(catalog.items) || 0;
  if (!items) return { factor: E.noSalesFactor, basis: 'no-sales', items: 0 };
  const price = Number(catalog.geo_price);
  const raw = (items / ref.items) ** E.itemsWeight * (price / ref.price) ** E.priceWeight;
  const factor = Math.min(E.maxFactor, Math.max(E.minFactor, raw));
  return { factor, basis: 'catalog', items, typicalPrice: Math.round(price) };
}

const round3 = (n) => Math.round(n * 1000) / 1000;

export function earnings(days, catalog, ref) {
  const full = days.filter((d) => !d.partial).slice(-E.averageDays);
  const avgDailyHours = full.length ? Math.round(full.reduce((a, d) => a + d.hours, 0) / full.length) : null;

  // Last 7 complete days against the 7 before them.
  const last7 = full.slice(-7);
  const prev7 = full.slice(-14, -7);
  const avg = (xs) => xs.reduce((a, d) => a + d.hours, 0) / xs.length;
  const weekChangePct =
    last7.length === 7 && prev7.length === 7 && avg(prev7) > 0
      ? Math.round(((avg(last7) - avg(prev7)) / avg(prev7)) * 1000) / 10
      : null;

  if (avgDailyHours === null) return { avgDailyHours, fullDays: 0, weekChangePct, estimate: null };

  const { factor, basis, items, typicalPrice } = catalogFactor(catalog, ref);
  const robuxPerHour = E.baseRobuxPerHour * factor;
  const monthly = avgDailyHours * 30 * robuxPerHour;
  const usd = (r) => Math.round(r * E.devexUsdPerRobux);
  return {
    avgDailyHours,
    fullDays: full.length,
    weekChangePct,
    estimate: {
      robuxPerHour: round3(robuxPerHour),
      factor: round3(factor),
      basis,
      items: items ?? null,
      typicalPrice: typicalPrice ?? null,
      reference: { games: ref.games, items: ref.items, price: Math.round(ref.price), fallback: ref.fallback },
      monthlyRobux: Math.round(monthly),
      lowRobux: Math.round(monthly * E.rangeLow),
      highRobux: Math.round(monthly * E.rangeHigh),
      monthlyUsd: usd(monthly),
      lowUsd: usd(monthly * E.rangeLow),
      highUsd: usd(monthly * E.rangeHigh),
      baseRobuxPerHour: E.baseRobuxPerHour,
      devexUsdPerRobux: E.devexUsdPerRobux,
    },
  };
}
