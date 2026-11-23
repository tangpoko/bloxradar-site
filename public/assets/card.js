// /card/<universeId>: a shareable stats card for one game, drawn as an SVG and saved as a PNG.
// Images are fetched and embedded as data, because an SVG drawn onto a canvas cannot load images
// from other sites. Roblox's image host allows this (it sends Access-Control-Allow-Origin: *).
import { initChrome, api, esc, int, compact, localDate, failed } from './common.js';

initChrome();

const id = location.pathname.split('/').filter(Boolean)[1];
const title = document.getElementById('title');
const why = document.getElementById('why');
const body = document.getElementById('body');
document.querySelector('.crumb').innerHTML = `<a href="/">Home</a> / <a href="/game/${esc(id)}">Game page</a>`;

const W = 600;
const H = 860;
const FONT = "Arial, 'Helvetica Neue', Helvetica, sans-serif"; // the PNG cannot load web fonts

async function dataUrl(src) {
  if (!src) return null;
  try {
    const res = await fetch(src, { mode: 'cors', referrerPolicy: 'no-referrer' });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((done) => {
      const r = new FileReader();
      r.onload = () => done(r.result);
      r.onerror = () => done(null);
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

// Splits a name into at most two lines of about `max` characters, with an ellipsis if it is longer.
function lines(text, max) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const out = [''];
  for (const w of words) {
    const cur = out[out.length - 1];
    if (!cur) out[out.length - 1] = w;
    else if ((cur + ' ' + w).length <= max) out[out.length - 1] = `${cur} ${w}`;
    else if (out.length < 2) out.push(w);
    else {
      out[1] = `${out[1].slice(0, max - 1).trimEnd()}…`;
      return out;
    }
  }
  return out.map((l) => (l.length > max ? `${l.slice(0, max - 1)}…` : l));
}

// Daily averages of the last 30 days from hourly (or daily) points.
function lastDays(points, days = 30) {
  const by = new Map();
  for (const p of points) {
    const d = p.t.slice(0, 10);
    const x = by.get(d) || { sum: 0, n: 0 };
    x.sum += p.players;
    x.n += 1;
    by.set(d, x);
  }
  return [...by.entries()].sort().slice(-days).map(([, x]) => x.sum / x.n);
}

function linePath(values, x, y, w, h) {
  if (values.length < 2) return '';
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  return values.map((v, i) => `${i ? 'L' : 'M'}${(x + (i / (values.length - 1)) * w).toFixed(1)},${(y + h - ((v - min) / span) * h).toFixed(1)}`).join('');
}

function svg(g, imgs, trend) {
  const best = g.positions.length ? [...g.positions].sort((a, b) => a.bestPosition - b.bestPosition)[0] : null;
  // The name sits to the right of the icon, under the thumbnail. One or two lines.
  const name = lines(g.name, 24);
  const nameY = name.length === 1 ? 414 : 402;
  const statY = 494;
  const stat = (x, y, label, value, sub = '') =>
    `<g><rect x="${x}" y="${y}" width="264" height="92" rx="14" fill="#171c33"/>
      <text x="${x + 18}" y="${y + 30}" font-size="15" fill="#9aa3c0">${esc(label)}</text>
      <text x="${x + 18}" y="${y + 66}" font-size="30" font-weight="700" fill="#ffffff">${esc(value)}</text>
      ${sub ? `<text x="${x + 246}" y="${y + 66}" font-size="14" fill="#9aa3c0" text-anchor="end">${esc(sub)}</text>` : ''}</g>`;
  const rating = g.fairRating === null ? 'n/a' : `${(g.fairRating * 100).toFixed(1)}%`;
  const saved = g.favorites7 && g.favorites7.gain >= 0 ? `+${compact(g.favorites7.gain)}` : 'n/a';
  const lineY = statY + 214;
  const path = linePath(trend, 34, lineY + 18, 532, 48);
  const trendLabel = trend.length >= 2 ? `Players, last ${trend.length} days` : 'Players: history starts when we begin reading a game';
  const thumb = imgs.thumb
    ? `<image href="${imgs.thumb}" x="24" y="64" width="552" height="310.5" preserveAspectRatio="xMidYMid slice" clip-path="url(#thumbClip)"/>`
    : `<rect x="24" y="64" width="552" height="310.5" rx="18" fill="#171c33"/>`;
  const iconImg = imgs.icon
    ? `<image href="${imgs.icon}" x="44" y="330" width="104" height="104" clip-path="url(#iconClip)"/>`
    : `<rect x="44" y="330" width="104" height="104" rx="24" fill="#232a4a"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="${FONT}" role="img" aria-label="Stats card for ${esc(g.name)}">
  <defs>
    <linearGradient id="edge" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7c5cff"/><stop offset="0.55" stop-color="#1ea0ff"/><stop offset="1" stop-color="#c4f03c"/></linearGradient>
    <clipPath id="thumbClip"><rect x="24" y="64" width="552" height="310.5" rx="18"/></clipPath>
    <clipPath id="iconClip"><rect x="44" y="330" width="104" height="104" rx="24"/></clipPath>
  </defs>
  <rect x="0" y="0" width="${W}" height="${H}" rx="34" fill="url(#edge)"/>
  <rect x="6" y="6" width="${W - 12}" height="${H - 12}" rx="29" fill="#0d1020"/>
  <text x="32" y="44" font-size="16" font-weight="700" fill="#c4f03c" letter-spacing="1.5">${esc((g.genre || 'Roblox game').toUpperCase())}</text>
  <g transform="translate(${W - 150}, 26)">
    <circle cx="11" cy="11" r="10" fill="none" stroke="#ffffff" stroke-width="2"/>
    <path d="M11 11 L11 1 A10 10 0 0 1 19.66 6 Z" fill="#ffffff"/>
    <circle cx="11" cy="11" r="3.5" fill="#ffffff"/>
    <text x="30" y="17" font-size="17" font-weight="700" fill="#ffffff">BloxRadar</text>
  </g>
  ${thumb}
  <rect x="40" y="326" width="112" height="112" rx="28" fill="#0d1020"/>
  ${iconImg}
  ${name.map((l, i) => `<text x="168" y="${nameY + i * 34}" font-size="28" font-weight="700" fill="#ffffff">${esc(l)}</text>`).join('')}
  <text x="168" y="${nameY + (name.length - 1) * 34 + 30}" font-size="16" fill="#9aa3c0">by ${esc(g.creator.name)}</text>
  ${stat(24, statY, 'Playing now', int(g.players))}
  ${stat(312, statY, 'All-time peak', int(g.peak), g.peakAt ? localDate(g.peakAt) : '')}
  ${stat(24, statY + 104, 'Rating', rating, g.upVotes !== null ? `${compact((g.upVotes ?? 0) + (g.downVotes ?? 0))} votes` : '')}
  ${stat(312, statY + 104, 'Saved this week', saved)}
  <text x="32" y="${lineY + 14}" font-size="14" fill="#9aa3c0">${esc(trendLabel)}</text>
  ${path ? `<path d="${path}" fill="none" stroke="#c4f03c" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>` : ''}
  <line x1="24" y1="${H - 64}" x2="${W - 24}" y2="${H - 64}" stroke="#232a4a"/>
  <text x="32" y="${H - 38}" font-size="15" fill="#d8dcf0">${best ? `Best chart place: ${best.bestPosition} in ${esc(lines(best.chart, 34)[0])}` : 'Not in a Roblox chart yet'}</text>
  <text x="32" y="${H - 16}" font-size="12" fill="#6f7898">Tracked since ${esc(localDate(g.firstSeen))}. The rating is our adjusted figure.</text>
  <text x="${W - 32}" y="${H - 16}" font-size="14" font-weight="700" fill="#ffffff" text-anchor="end">bloxradar.net</text>
</svg>`;
}

async function savePng(markup, name) {
  const url = URL.createObjectURL(new Blob([markup], { type: 'image/svg+xml' }));
  try {
    const img = new Image();
    await new Promise((ok, bad) => {
      img.onload = ok;
      img.onerror = bad;
      img.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = W * 2;
    canvas.height = H * 2;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, W * 2, H * 2);
    const blob = await new Promise((done) => canvas.toBlob(done, 'image/png'));
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function main() {
  if (!/^\d+$/.test(id || '')) {
    body.innerHTML = '<p class="note err">That is not a game address.</p>';
    return;
  }
  body.innerHTML = '<div class="skel card-skel"></div>';
  try {
    const [g, h] = await Promise.all([api(`/api/game/${id}`), api(`/api/game/${id}/history?range=30d`)]);
    title.textContent = g.name;
    document.title = `${g.name}: stats card. BloxRadar`;
    why.textContent = 'Save the card as an image to post on X, YouTube or Discord. The numbers are from the latest reading.';
    why.hidden = false;
    const [thumb, iconData] = await Promise.all([dataUrl(g.thumb), dataUrl(g.icon)]);
    const markup = svg(g, { thumb, icon: iconData }, lastDays(h.points));
    const link = `${location.origin}/game/${g.id}`;
    body.innerHTML = `<div class="card-wrap">
        <div class="card-art">${markup}</div>
        <div class="card-side">
          <button class="btn primary" type="button" id="save">Save as image</button>
          <button class="btn" type="button" id="copy">Copy page link</button>
          <p class="help" id="card-msg" aria-live="polite"></p>
          <p class="help">The image is ${W * 2} by ${H * 2} pixels. ${thumb ? '' : 'The thumbnail could not be loaded, so the card has a plain block instead.'}</p>
        </div>
      </div>`;
    const msg = document.getElementById('card-msg');
    document.getElementById('save').addEventListener('click', () =>
      savePng(markup, `bloxradar-${g.id}.png`).catch(() => {
        msg.textContent = 'Your browser could not save the image. Take a screenshot of the card instead.';
      })
    );
    document.getElementById('copy').addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(link);
        msg.textContent = 'Link copied.';
      } catch {
        msg.textContent = link;
      }
    });
  } catch (err) {
    body.innerHTML = failed(err);
  }
}
main();
