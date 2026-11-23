import { initChrome, fill, api, int, change, gameCell, empty, esc, icon, studioUrl } from './common.js';

initChrome();

const q = (new URLSearchParams(location.search).get('q') || '').trim();
const body = document.getElementById('body');
const title = document.getElementById('title');

if (q.length < 2) {
  body.innerHTML = empty('Type at least 2 letters in the search box.');
} else {
  title.textContent = `Search: ${q}`;
  document.title = `${q}. BloxRadar search`;
  fill(body, async () => {
    const d = await api(`/api/search?q=${encodeURIComponent(q)}&limit=50`);
    const makers = d.creators.filter((c) => c.topGame);
    if (!d.items.length && !makers.length) return empty(`Nothing found for "${q}". We track games with 50 or more players.`);
    const games = d.items.length
      ? `<ol class="rows">${d.items
          .map(
            (g, i) =>
              `<li class="row"><span class="rank num">${i + 1}</span>${gameCell(g)}<span class="val num">${int(g.players)}</span>${change(g.changePct, g.change)}</li>`
          )
          .join('')}</ol>`
      : '';
    const studios = makers.length
      ? `<h2 class="sub-head">Studios and solo developers</h2><ol class="rows">${makers
          .map(
            (c, i) =>
              `<li class="row"><span class="rank num">${i + 1}</span><a class="game" href="${studioUrl(c.type, c.id)}">${icon(c.topGame.icon)}<span class="t"><span class="name">${esc(c.name)}</span><span class="by">${c.type === 'Group' ? 'Studio' : 'Solo developer'}. ${int(c.games)} ${c.games === 1 ? 'game' : 'games'}. Biggest: ${esc(c.topGame.name)}</span></span></a><span class="val num">${int(c.players)}</span>${change(c.changePct, c.change)}</li>`
          )
          .join('')}</ol>`
      : '';
    return games + studios;
  });
}
