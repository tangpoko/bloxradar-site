// /studio/g/<groupId> and /studio/u/<userId>: one studio or solo developer, with every live game.
import { initChrome, api, esc, int, compact, change, gameCell } from './common.js';

initChrome();

const [, , kind, id] = location.pathname.split('/');
const title = document.getElementById('title');
const lede = document.getElementById('lede');
const body = document.getElementById('body');
const statsEl = document.getElementById('stats');
const head = document.querySelector('.studio-head');

const stat = (label, value) => `<div class="sstat"><span class="num">${value}</span><span>${label}</span></div>`;

// Icon, members or followers, Verified and description, read from Roblox after the page is shown.
async function profile() {
  let p = null;
  try {
    p = (await api(`/api/studio/${kind}/${id}/profile`)).profile;
  } catch {
    return;
  }
  if (!p) return;
  const icon = p.icon ? `<img class="sicon" src="${esc(p.icon)}" alt="" width="160" height="160" referrerpolicy="no-referrer">` : '';
  const count = p.count === null ? '' : `<span class="spill num">${compact(p.count)} ${p.countLabel}</span>`;
  const badge = p.verified ? '<span class="spill">Verified</span>' : '';
  if (!icon && !count && !badge && !p.description) return;
  document.getElementById('profile').innerHTML = `<div class="sprof">${icon}<div class="sbody"><div class="spills">${count}${badge}</div>${
    p.description ? `<p class="sdesc">${esc(p.description)}</p>` : ''
  }</div></div>`;
}

async function load() {
  let d;
  try {
    d = await api(`/api/studio/${kind}/${id}`);
  } catch (err) {
    title.textContent = 'Studio not found';
    lede.textContent = err.status === 404 ? 'We are not tracking any game by this studio right now.' : 'Could not load this. Try again in a minute.';
    return;
  }
  const s = d.studio;
  document.title = `${s.name}. BloxRadar`;
  document.getElementById('crumb').innerHTML = `<a href="/">Home</a> / <a href="/list/${s.type === 'Group' ? 'studios' : 'solo'}">${s.type === 'Group' ? 'Studios' : 'Solo developers'}</a>`;
  title.textContent = s.name;
  lede.hidden = true;
  const open = document.createElement('a');
  open.className = 'btn sbtn';
  open.href = s.url;
  open.target = '_blank';
  open.rel = 'noopener';
  open.textContent = 'Open on Roblox';
  head.append(open);
  statsEl.innerHTML = `<div class="sstats">${stat('players now', int(s.players))}${
    s.changePct === null ? '' : stat('change in a day', change(s.changePct, s.change))
  }${stat(s.games === 1 ? 'game' : 'games', int(s.games))}</div>`;
  profile();
  body.innerHTML = `<ol class="rows studio-rows">${d.games
    .map(
      (g, i) =>
        `<li class="row"><span class="rank num">${i + 1}</span>${gameCell(g, { sub: g.genre ? esc(g.genre) : '' })}<span class="val num">${int(g.players)}</span>${change(g.changePct, g.change)}</li>`
    )
    .join('')}</ol>`;
}

load();
