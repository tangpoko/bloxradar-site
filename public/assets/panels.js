// Every panel: where its data comes from, its title, and how its rows look.
// The home page shows the first few rows of each. /list/<key> shows the long version.
import { api, esc, int, compact, change, gameCell, spark, timeTag, ago, utcDay, empty, icon, gameUrl, studioUrl, CHARTS } from './common.js';

// How the fair rating works, shown behind an "i" on every page that uses it.
export const FAIR_RATING_TEXT =
  'The share of likes, pulled towards 50% when a game has few votes, so a game with 40 votes at 100% does not rank above one with 400,000 votes at 92%. ' +
  'The more votes a game has, the closer this is to its plain like share. We use the formula SteamDB publishes for Steam games: rating minus (rating minus 50%) times 2 to the power of minus log10(votes + 1). ' +
  'Likes and dislikes are Roblox figures. The adjusted rating is our own.';
const pct = (f) => (f === null || f === undefined ? 'n/a' : `${(f * 100).toFixed(1)}%`);

const rank = (i) => `<span class="rank num">${i}</span>`;
const list = (cls, rows) => `<ol class="rows ${cls}">${rows.join('')}</ol>`;
// Arrow for a move in a chart, with the number of places. No move in the last 24 hours gives a dash.
const moved = (n) =>
  !n
    ? '<span class="chg flat num" title="No move in the last 24 hours">&ndash;</span>'
    : `<span class="chg ${n > 0 ? 'up' : 'down'} num" title="Moved ${n > 0 ? 'up' : 'down'} ${Math.abs(n)} place${Math.abs(n) === 1 ? '' : 's'} in the last 24 hours"><span aria-hidden="true">${n > 0 ? '&#9650;' : '&#9660;'}</span><span class="sr-only">${n > 0 ? 'up' : 'down'}</span> ${Math.abs(n)}</span>`;
const players = (n, small = '') => `<span class="val num">${int(n)}${small ? `<small>${small}</small>` : ''}</span>`;

export const PANELS = {
  breakouts: {
    title: 'Breaking out',
    url: (limit) => `/api/breakouts?limit=${limit}`,
    filter: 'client', // filtered in the browser from the loaded rows
    render: (d, start = 0) =>
      d.items.length
        ? list(
            'break',
            d.items.map(
              (g, i) => `<li class="row">${rank(start + i + 1)}${gameCell(g)}${spark(g.spark)}${players(g.players, `usual ${int(g.baseline)}`)}<span class="mult num" title="${g.ratio} times the usual level">${g.ratio}x</span></li>`
            )
          )
        : empty('Nothing is far above its usual level right now.'),
  },

  'new-highs': {
    title: 'New all-time highs',
    url: (limit) => `/api/new-highs?limit=${limit}`,
    filter: 'client', // filtered in the browser from the loaded rows
    render: (d, start = 0) =>
      d.items.length
        ? list(
            'highs',
            d.items.map(
              (g, i) => `<li class="row">${rank(start + i + 1)}${gameCell(g)}${players(g.players, `peak ${timeTag(g.peakAt)}`)}${change(g.changePct, g.change)}</li>`
            )
          )
        : empty('No game has set a new all-time high in the last few hours.'),
  },

  rising: {
    title: 'Rising stars',
    why: (d) =>
      `Games with ${int(d.rules.minPlayers)} to ${int(d.rules.maxPlayers)} players now, whose average over the last 24 hours is at least ${d.rules.minRatio} times their average over the same 24 hours ${d.rules.windowDays} days earlier.`,
    url: (limit) => `/api/rising?limit=${limit}`,
    filter: 'client',
    render: (d, start = 0) =>
      d.items.length
        ? list(
            'break',
            d.items.map(
              (g, i) =>
                `<li class="row">${rank(start + i + 1)}${gameCell(g)}${spark(g.spark)}${players(g.players, `was ${int(g.thenAvg)} on average`)}<span class="mult num" title="${g.ratio} times the earlier average">${g.ratio}x</span></li>`
            )
          )
        : empty('No small game is growing that fast right now.'),
  },

  'records-today': {
    title: 'Records today',
    why: (d) =>
      `Games that set their highest player count since we started reading them in the last 24 hours. Games we have read for less than ${d.rules.minTrackedDays} days are left out, because every new game sets a record at first.`,
    url: (limit) => `/api/records-today?limit=${limit}`,
    filter: 'client',
    render: (d, start = 0) =>
      d.items.length
        ? list(
            'highs',
            d.items.map(
              (g, i) => `<li class="row">${rank(start + i + 1)}${gameCell(g)}${players(g.peak, `record ${timeTag(g.peakAt)}`)}${change(g.changePct, g.change)}</li>`
            )
          )
        : empty('No game has set a record in the last 24 hours.'),
  },

  saving: {
    title: 'Most saved this week',
    why: () =>
      'Games ranked by how many favorites they gained in the last 7 days. A favorite is the star on a Roblox game page. Players who save a game plan to come back to it. Favorites are a Roblox figure, read once a day.',
    url: (limit) => `/api/saving?days=7&limit=${limit}`,
    filter: 'client',
    render: (d, start = 0) =>
      d.items.length
        ? list(
            'top',
            d.items.map(
              (g, i) =>
                `<li class="row">${rank(start + i + 1)}${gameCell(g)}<span class="val num" title="Favorites gained since ${esc(utcDay(g.favSince))}">+${int(g.favGain)}<small>since ${esc(utcDay(g.favSince))}</small></span>${change(g.changePct, g.change)}</li>`
            )
          )
        : empty('We need at least a week of daily readings before this list fills in.'),
  },

  rated: {
    title: 'Best rated',
    why: (d) => `Games with at least ${int(d.rules.minVotes)} votes and ${int(d.rules.minPlayers)} players now, by our adjusted like rating.`,
    info: FAIR_RATING_TEXT,
    url: (limit) => `/api/rated?limit=${limit}`,
    filter: 'client',
    render: (d, start = 0) =>
      d.items.length
        ? list(
            'top',
            d.items.map(
              (g, i) =>
                `<li class="row">${rank(start + i + 1)}${gameCell(g, { sub: `${esc(g.creator.name)}. ${int(g.players)} playing` })}<span class="val num" title="Adjusted rating">${pct(g.fairRating)}<small>${pct(g.rating)} of ${compact(g.upVotes + g.downVotes)} votes</small></span></li>`
            )
          )
        : empty('No game has enough votes yet.'),
  },


  top: {
    title: 'Most played',
    url: (limit, offset = 0, filters = '') => `/api/top?limit=${limit}&offset=${offset}${filters}`,
    paged: true,
    filter: 'server',
    render: (d, start = 0) =>
      d.items.length
        ? list('top', d.items.map((g, i) => `<li class="row">${rank(start + i + 1)}${gameCell(g)}${players(g.players)}${change(g.changePct, g.change)}</li>`))
        : empty('No games are being tracked yet.'),
  },

  'new-games': {
    title: 'New games',
    url: (limit) => `/api/new-games?limit=${limit}`,
    filter: 'client', // filtered in the browser from the loaded rows
    render: (d, start = 0) =>
      d.items.length
        ? list(
            'newg',
            d.items.map(
              (g, i) =>
                `<li class="row">${rank(start + i + 1)}${gameCell(g, { sub: `${esc(g.creator.name)}. Made ${esc(ago(g.createdAt))}` })}${players(g.players)}${change(g.changePct, g.change)}</li>`
            )
          )
        : empty('No tracked game was made in the last 30 days.'),
  },

  genres: {
    title: 'Genres',
    url: (limit) => `/api/genres?limit=${limit}`,
    render: (d) => {
      if (!d.items.length) return empty('No genre data yet.');
      const top = d.items[0].share || 1;
      return list(
        'bars',
        d.items.map(
          (x) =>
            `<li class="row"><span class="bar-label"><span class="name">${esc(x.genre)} <span class="muted num">${int(x.players)}</span></span><span class="bar" style="width:${Math.max(0.5, (x.share / top) * 100).toFixed(1)}%"></span></span><span class="val num">${x.share.toFixed(1)}%</span>${change(x.changePct, x.change)}</li>`
        )
      );
    },
  },

  trends: trendPanel('players'),
  'trends-growing': trendPanel('growing'),
  'trends-new': trendPanel('new'),

  studios: {
    title: 'Top studios',
    url: (limit) => `/api/creators?type=studio&limit=${limit}`,
    render: (d, start = 0) => creatorRows(d, start, 'No studios tracked yet.'),
  },

  solo: {
    title: 'Top solo developers',
    url: (limit) => `/api/creators?type=solo&limit=${limit}`,
    render: (d, start = 0) => creatorRows(d, start, 'No solo developers tracked yet.'),
  },

  'creators-growing': {
    title: 'Fastest growing studios and developers',
    url: (limit) => `/api/creators?sort=growing&limit=${limit}`,
    render: (d, start = 0) => creatorRows(d, start, 'No studio or developer is growing right now.', true),
  },

  ...Object.fromEntries(CHARTS.map(([id, label, title]) => [id, chartPanel(id, label, title)])),
};

// One Roblox chart. Rows are in chart order, with the move in the last 24 hours.
function chartPanel(id, label, title) {
  return {
    title,
    url: (limit) => `/api/chart?id=${id}&limit=${limit}`,
    filter: 'client', // filtered in the browser from the loaded rows
    render: (d) =>
      d.items.length
        ? list(
            'earning',
            d.items.map(
              (g) =>
                `<li class="row"><span class="rank num" title="Chart position">${g.position}</span>${gameCell(g)}${players(g.players)}${moved(g.moved)}</li>`
            )
          )
        : empty(`The ${label} chart has not been read yet.`),
  };
}

// Words in game names, sorted by players, by growth, or by how many new games use them.
function trendPanel(sort) {
  const titles = { players: 'Words in game names', growing: 'Fastest growing words', new: 'Words in new games' };
  return {
    title: titles[sort],
    url: (limit) => `/api/trends?sort=${sort}&limit=${limit}`,
    render: (d, start = 0) =>
      d.items.length
        ? list(
            'words',
            d.items.map((t, i) => {
              const count = sort === 'new' ? `${t.newGames} new ${t.newGames === 1 ? 'game' : 'games'}` : `in ${t.gameCount} games`;
              return `<li class="row">${rank(start + i + 1)}<span class="bar-label"><span class="word">${esc(t.word)}</span><span class="word-sub">${count}. Top: <a href="${gameUrl(t.examples[0].id)}">${esc(t.examples[0].name)}</a></span></span><span class="examples">${t.examples
                .map((g) => `<a href="${gameUrl(g.id)}" title="${esc(g.name)}">${icon(g.icon, 'sm')}</a>`)
                .join('')}</span>${players(t.players)}${change(t.changePct, t.change)}</li>`;
            })
          )
        : empty(sort === 'growing' ? 'No word is growing right now.' : 'Not enough games to find shared words yet.'),
  };
}

function creatorRows(d, start, none, showType = false) {
  if (!d.items.length) return empty(none);
  return list(
    'creators',
    d.items.map((c, i) => {
      const g = c.topGame;
      const sub = `${showType ? (c.type === 'Group' ? 'Studio. ' : 'Solo. ') : ''}${c.games} ${c.games === 1 ? 'game' : 'games'}${g ? `. Biggest: ${esc(g.name)}` : ''}`;
      const cell = `<a class="game" href="${studioUrl(c.type, c.id)}">${icon(g ? g.icon : null)}<span class="t"><span class="name">${esc(c.name)}</span><span class="by">${sub}</span></span></a>`;
      return `<li class="row">${rank(start + i + 1)}${cell}${players(c.players)}${change(c.changePct, c.change)}</li>`;
    })
  );
}

// filters is an extra query string ('&genre=...') for panels filtered by the server.
export async function loadPanel(key, limit, offset = 0, filters = '') {
  const p = PANELS[key];
  return api(p.url(limit, offset, filters));
}
