// Public profile of a creator (icon, description, members or followers), read from Roblox when a
// creator page is opened and kept in memory for a day. A failed read gives null and the page simply
// shows no profile. Server side only, one try per request.
const TTL_MS = 24 * 3600000;
const FAIL_MS = 5 * 60000;
const MAX = 500;
const cache = new Map();

async function get(url) {
  const res = await fetch(url, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(5000) });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}
const tryGet = (url) => get(url).catch(() => null);

async function read(type, id) {
  if (type === 'Group') {
    const [g, icons] = await Promise.all([
      tryGet(`https://groups.roblox.com/v1/groups/${id}`),
      tryGet(`https://thumbnails.roblox.com/v1/groups/icons?groupIds=${id}&size=420x420&format=Png`),
    ]);
    if (!g) return null;
    return {
      description: (g.description || '').trim().slice(0, 1200),
      count: Number.isFinite(g.memberCount) ? g.memberCount : null,
      countLabel: 'members',
      verified: !!g.hasVerifiedBadge,
      icon: icons?.data?.[0]?.state === 'Completed' ? icons.data[0].imageUrl : null,
    };
  }
  const [u, thumbs, followers] = await Promise.all([
    tryGet(`https://users.roblox.com/v1/users/${id}`),
    tryGet(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${id}&size=420x420&format=Png`),
    tryGet(`https://friends.roblox.com/v1/users/${id}/followers/count`),
  ]);
  if (!u) return null;
  return {
    description: (u.description || '').trim().slice(0, 1200),
    count: followers && Number.isFinite(followers.count) ? followers.count : null,
    countLabel: 'followers',
    verified: !!u.hasVerifiedBadge,
    icon: thumbs?.data?.[0]?.state === 'Completed' ? thumbs.data[0].imageUrl : null,
  };
}

export async function creatorProfile(type, id) {
  const key = `${type}${id}`;
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.value;
  let value = null;
  try {
    value = await read(type, id);
  } catch {
    value = null;
  }
  if (cache.size >= MAX) cache.delete(cache.keys().next().value);
  cache.set(key, { value, expires: Date.now() + (value ? TTL_MS : FAIL_MS) });
  return value;
}

// Icons for a list of creators, in two batched requests (one for groups, one for users). Cached for
// a day like profiles; ids Roblox did not answer for are tried again after five minutes.
const icons = new Map();

async function readIcons(kind, ids) {
  const url =
    kind === 'Group'
      ? `https://thumbnails.roblox.com/v1/groups/icons?groupIds=${ids.join(',')}&size=150x150&format=Png`
      : `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${ids.join(',')}&size=150x150&format=Png`;
  const res = await tryGet(url);
  const got = new Map((res?.data || []).map((d) => [d.targetId, d.state === 'Completed' ? d.imageUrl : null]));
  for (const id of ids) {
    const value = got.get(id) ?? null;
    if (icons.size >= MAX * 4) icons.delete(icons.keys().next().value);
    icons.set(`${kind}${id}`, { value, expires: Date.now() + (value ? TTL_MS : FAIL_MS) });
  }
}

export async function creatorIcons(list) {
  const need = { Group: [], User: [] };
  for (const c of list) {
    const hit = icons.get(`${c.type}${c.id}`);
    if (!hit || hit.expires <= Date.now()) need[c.type === 'Group' ? 'Group' : 'User'].push(c.id);
  }
  await Promise.all(Object.entries(need).filter(([, ids]) => ids.length).map(([kind, ids]) => readIcons(kind, ids.slice(0, 100))));
  return new Map(list.map((c) => [c.id, icons.get(`${c.type}${c.id}`)?.value || null]));
}
