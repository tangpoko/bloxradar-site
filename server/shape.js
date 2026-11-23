// Turns raw rows from either data source into the JSON the browser gets.
// Both data sources return rows named like the database columns, so all shaping happens here once.

export const num = (v) => (v === null || v === undefined ? null : Number(v));
export const iso = (d) => (d ? new Date(d).toISOString() : null);

function change(now, prev) {
  if (prev === null || prev === undefined) return { prev: null, change: null, changePct: null };
  const p = Number(prev);
  return {
    prev: p,
    change: now - p,
    changePct: p > 0 ? Math.round(((now - p) / p) * 1000) / 10 : null,
  };
}

export function game(r) {
  const players = num(r.players) ?? 0;
  return {
    id: num(r.universe_id),
    placeId: num(r.root_place_id),
    name: r.name,
    creator: { id: num(r.creator_id), name: r.creator_name, type: r.creator_type },
    genre: r.genre_l1 || null,
    icon: r.icon_url || null,
    players,
    peak: num(r.peak_players),
    peakAt: iso(r.peak_at),
    createdAt: iso(r.created_at),
    ...change(players, r.prev_players),
  };
}

export function gameDetail(r) {
  return {
    ...game(r),
    subgenre: r.genre_l2 || null,
    visits: num(r.visits),
    favorites: num(r.favorites),
    upVotes: num(r.up_votes),
    downVotes: num(r.down_votes),
    maxPlayers: num(r.max_players),
    updatedAt: iso(r.updated_at),
    firstSeen: iso(r.first_seen),
  };
}

// Roblox chart ids are kebab-case ("top-earning"). The database does not store display names,
// so these are copied from the names Roblox showed in October 2026. Unknown ids are spelled out.
const SORT_NAMES = {
  'top-trending': 'Top Trending',
  'up-and-coming': 'Up-and-Coming',
  'top-playing-now': 'Top Playing Now',
  'fun-with-friends': 'Fun with Friends',
  'top-revisited': 'Top Revisited',
  'top-earning': 'Top Earning',
  'top-paid-access': 'Top Paid Access',
  'top-rated': 'Top Rated',
  'most-popular': 'Most Popular',
  'trending-music-experiences': 'Trending Music Experiences',
  'trending-in-rpg': 'Trending in RPG',
  'trending-in-sports-and-racing': 'Trending in Sports & Racing',
  'trending-in-shooter': 'Trending in Shooter',
  'trending-in-action': 'Trending in Action',
  'trending-in-adventure': 'Trending in Adventure',
  'trending-in-entertainment': 'Trending in Entertainment',
  'trending-in-obby-and-platformer': 'Trending in Obby & Platformer',
  'trending-in-party-and-casual': 'Trending in Party & Casual',
  'trending-in-puzzle': 'Trending in Puzzle',
  'trending-in-roleplay-and-avatar-sim': 'Trending in Roleplay & Avatar Sim',
  'trending-in-shopping': 'Trending in Shopping',
  'trending-in-simulation': 'Trending in Simulation',
  'trending-in-strategy': 'Trending in Strategy',
  'trending-in-survival': 'Trending in Survival',
  'more-when-you-subscribe': 'More When You Subscribe',
  'learning-and-explore': 'Learn & Explore',
};
export function sortLabel(id) {
  if (SORT_NAMES[id]) return SORT_NAMES[id];
  return id
    .split(/[-_]/)
    .filter(Boolean)
    .map((w, i) => (w === 'and' ? '&' : i > 0 && w === 'in' ? 'in' : w === 'rpg' ? 'RPG' : w[0].toUpperCase() + w.slice(1)))
    .join(' ');
}

// ---- Trends: words in game names ----

const STOPWORDS = new Set(
  `the and for with you your from our are this that new update upd free all not can get but
   has have was were its his her them they who what when how why out into off just now best
   more most one two too very version beta alpha test official game games roblox play`.split(/\s+/)
);

export function words(name) {
  const cleaned = String(name)
    .replace(/\[[^\]]*\]|\([^)]*\)|\{[^}]*\}|【[^】]*】|「[^」]*」/g, ' ') // [UPD], (x2), 【NEW】
    .replace(/['’]/g, '')
    .toLowerCase();
  const out = new Set();
  for (const w of cleaned.split(/[^\p{L}\p{N}]+/u)) {
    if (w.length < 3 || /^\d+$/.test(w) || STOPWORDS.has(w)) continue;
    out.add(w);
  }
  return [...out];
}

// sort: 'players' (most players), 'growing' (biggest change against yesterday, among words with
// at least growingMinPlayers yesterday) or 'new' (most games made since newSince).
export function trends(rows, { minGames, examples, sort = 'players', growingMinPlayers = 0, newMinGames = 1, newSince = null }, limit) {
  const byWord = new Map();
  for (const r of rows) {
    const g = game(r);
    for (const w of words(g.name)) {
      let t = byWord.get(w);
      if (!t) byWord.set(w, (t = { word: w, players: 0, prev: 0, hasPrev: false, games: [], newGames: 0 }));
      if (newSince && g.createdAt && new Date(g.createdAt) >= newSince) t.newGames += 1;
      t.players += g.players;
      if (g.prev !== null) {
        t.prev += g.prev;
        t.hasPrev = true;
      }
      t.games.push(g);
    }
  }
  let list = [...byWord.values()]
    .filter((t) => t.games.length >= minGames)
    .map((t) => ({ ...t, ...change(t.players, t.hasPrev ? t.prev : null) }));
  if (sort === 'growing') {
    list = list.filter((t) => t.hasPrev && t.prev >= growingMinPlayers && t.changePct !== null).sort((a, b) => b.changePct - a.changePct);
  } else if (sort === 'new') {
    list = list.filter((t) => t.newGames >= newMinGames).sort((a, b) => b.newGames - a.newGames || b.players - a.players);
  } else {
    list.sort((a, b) => b.players - a.players);
  }
  return list
    .slice(0, limit)
    .map((t) => ({
      word: t.word,
      players: t.players,
      gameCount: t.games.length,
      newGames: t.newGames,
      prev: t.prev,
      change: t.change,
      changePct: t.changePct,
      examples: t.games
        .sort((a, b) => b.players - a.players)
        .slice(0, examples)
        .map((g) => ({ id: g.id, name: g.name, icon: g.icon, players: g.players })),
    }));
}

// ---- Rating ----

// Like rating pulled towards 50% when a game has few votes, so 40 votes at 100% does not rank above
// 400,000 at 92%. SteamDB's public formula: rating - (rating - 0.5) * 2^(-log10(votes + 1)).
// Same formula as FAIR in server/data/mysql.js. Returns a fraction, or null with no votes.
export function fairRating(up, down) {
  const u = Number(up) || 0;
  const n = u + (Number(down) || 0);
  if (!n) return null;
  const r = u / n;
  return r - (r - 0.5) * 2 ** -Math.log10(n + 1);
}

// Likes, dislikes and both ratings, as fractions rounded to 4 places.
export function votes(r) {
  const up = num(r.up_votes);
  const down = num(r.down_votes);
  const total = (up ?? 0) + (down ?? 0);
  const fair = fairRating(up, down);
  return {
    upVotes: up,
    downVotes: down,
    rating: total ? Math.round((up / total) * 10000) / 10000 : null,
    fairRating: fair === null ? null : Math.round(fair * 10000) / 10000,
  };
}

// ---- Codes in a description ----

// Codes written in a game's description. A guess from the text, never checked against the game.
// Patterns it reads, from 300 top games on 2026-10-30:
//   "Use code W7C28D for ...", "code 'THX600K'"       one word right after "code"
//   "CODES: RELEASE, NEWGAME, CATS"                   a list after a colon, until a normal word
//   "Codes:" then one code at the start of each line  until a blank line
// It skips "New code at 10K likes", "join for codes" and the like, because the word after "code"
// does not look like a code. A word looks like one when it is quoted, has a digit, is in capitals,
// or has a capital inside it.
const NOT_CODES = new Set(
  `code codes new update updates like likes favorite favorites favourite redeem expired active working
   roblox discord group join free vip the and for game games use enter type more soon here below above now`.split(/\s+/)
);
function codeWord(raw) {
  const quoted = /^["'“‘].*["'”’]$/.test(raw);
  const w = raw.replace(/^["'“‘(]+|["'”’),.!:;]+$/g, '');
  if (!/^[A-Za-z0-9_]{4,24}$/.test(w) || NOT_CODES.has(w.toLowerCase())) return null;
  if (/^\d+$/.test(w) || /^\d+(\.\d+)?[kmb]$/i.test(w)) return null; // plain numbers, "10k"
  return quoted || /\d/.test(w) || /^[A-Z_]+$/.test(w) || /[a-z][A-Z]/.test(w) ? w : null;
}
export function codesFrom(text) {
  if (!text) return [];
  const found = [];
  const add = (w) => {
    if (w && !found.includes(w)) found.push(w);
  };
  let listLines = false; // inside a "Codes:" block with one code per line
  for (const raw of String(text).split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || /expired|old codes|not working/i.test(line)) {
      listLines = false;
      continue;
    }
    // "🎁 CODES 🎁" or "--- NEW CODES ---": a heading on its own, with the codes on the next lines.
    if (/^((new|active|working|current)\s+)?codes?$/i.test(line.replace(/[^A-Za-z ]+/g, ' ').trim())) {
      listLines = true;
      continue;
    }
    const m = /\bcodes?\b\s*([:\-–]?)\s*(.*)$/i.exec(line);
    if (m) {
      const rest = m[2].split(/[\s,]+/).filter(Boolean);
      if (m[1]) {
        // "CODES: A, B, C". An empty rest means the codes follow on the next lines.
        for (const t of rest) {
          const w = codeWord(t);
          if (!w) break;
          add(w);
        }
        listLines = rest.length === 0;
      } else {
        add(rest.length ? codeWord(rest[0]) : null);
        listLines = false;
      }
    } else if (listLines) {
      const first = line.replace(/^[^A-Za-z0-9"'“‘]+/, '').split(/[\s,:\-–]+/)[0];
      const w = codeWord(first || '');
      if (w) add(w);
      else listLines = false;
    }
    if (found.length >= 12) break;
  }
  return found;
}

// ---- Charts ----

// Long histories are averaged per hour, or per day if that is still too many points, so long
// ranges stay light. Each bucket keeps its highest reading as max.
export function history(rows, maxPoints = 1500) {
  const pts = rows.map((r) => ({ t: iso(r.t), players: num(r.players), max: num(r.max ?? r.players) }));
  if (pts.length <= maxPoints) return pts;
  const bucket = (len, pad) => {
    const out = new Map();
    for (const p of pts) {
      const key = p.t.slice(0, len);
      let d = out.get(key);
      if (!d) out.set(key, (d = { t: `${key}${pad}`, sum: 0, n: 0, max: 0 }));
      d.sum += p.players;
      d.n += 1;
      d.max = Math.max(d.max, p.max);
    }
    return [...out.values()].map((d) => ({ t: d.t, players: Math.round(d.sum / d.n), max: d.max }));
  };
  const hours = bucket(13, ':00:00.000Z');
  return hours.length <= maxPoints ? hours : bucket(10, 'T00:00:00.000Z');
}

export function sparkMap(rows) {
  const m = new Map();
  for (const r of rows) {
    const id = num(r.universe_id);
    if (!m.has(id)) m.set(id, []);
    m.get(id).push(num(r.avg_players));
  }
  return m;
}
