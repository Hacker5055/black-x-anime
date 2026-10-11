/** Prisma-mode full smoke — the 27 spec-shape checks (regression). */
import express from 'express';
import contentRoutes from './server/src/routes/content.routes.js';
import communityRoutes from './server/src/routes/community.routes.js';
import communityFeedRoutes from './server/src/routes/community.js';
import profileRoutes from './server/src/routes/profile.routes.js';
import gamificationRoutes from './server/src/routes/gamification.routes.js';
import supportRoutes from './server/src/routes/support.routes.js';

const RUN_ID = 'u_smoke_' + Date.now();
const results = [];
const check = (n, c, d) => { results.push(c); console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${c ? '' : '  → ' + d}`); };

const app = express();
app.use(express.json());
app.use((req, _r, next) => { req.user = { id: RUN_ID, username: 'smokefinal', displayName: 'Smoke Final', avatarColor: '#8b5cf6', role: 'admin' }; next(); });
app.use('/api/content', contentRoutes);
app.use('/api/community', communityFeedRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/gamification', gamificationRoutes);
app.use('/api/creator', gamificationRoutes);
app.use('/api/support', supportRoutes);
const srv = app.listen(4099);
const call = async (m, p, b) => {
  const r = await fetch('http://localhost:4099' + p, { method: m, headers: { 'content-type': 'application/json' }, body: b ? JSON.stringify(b) : undefined });
  const text = await r.text();
  let body;
  try { body = JSON.parse(text); } catch { body = { raw: text.slice(0, 160) }; }
  return { status: r.status, body };
};

let r = await call('POST', '/api/content/rate', { slug: 'smoke-final-' + Date.now(), title: 'SF', score: 8 });
check('rate 200 + message', r.status === 200 && r.body.message === 'Rating saved successfully.', JSON.stringify(r.body));
r = await call('POST', '/api/content/rate', { slug: 'x', score: 12 });
check('rate 400', r.status === 400, JSON.stringify(r.body));
r = await call('GET', '/api/content/rating?slug=smoke-none');
check('get rating null', r.body.rating === null, JSON.stringify(r.body));

r = await call('POST', '/api/community/follow', { targetUsername: 'kuro' });
check('follow 200', r.status === 200 && r.body.isFollowing === true, JSON.stringify(r.body));
r = await call('POST', '/api/community/follow', { targetUsername: 'nobody_' + Date.now() });
check('follow unknown → auto-provision 200', r.status === 200 && r.body.isFollowing === true, JSON.stringify(r.body));

r = await call('PUT', '/api/profile/customize', { bannerUrl: 'https://cdn.example.com/b.png', themePreference: 'cyber-neon' });
check('customize 200', r.status === 200 && r.body.message === 'Profile updated.', JSON.stringify(r.body));
r = await call('PUT', '/api/profile/customize', { themePreference: '   ' });
check('customize 400', r.status === 400, JSON.stringify(r.body));

r = await call('GET', '/api/gamification/stats');
check('stats shape', r.status === 200 && typeof r.body?.data?.currentLevel === 'number' && typeof r.body?.data?.progressPercentage === 'number' && Array.isArray(r.body?.data?.unlockedBadges), JSON.stringify(r.body));
r = await call('POST', '/api/gamification/sync-time', { sessionMinutes: 130, type: 'watch' });
check('sync levelUp', r.status === 200 && r.body.levelUp === true && r.body.newLevel === 2, JSON.stringify(r.body));
r = await call('GET', '/api/gamification/stats');
check('stats after sync', r.body?.data?.totalWatchTimeMin === 130 && r.body?.data?.unlockedBadges?.length >= 1, JSON.stringify(r.body?.data));

r = await call('POST', '/api/gamification/sync-time', { sessionMinutes: 25, type: 'read' });
check('read stats', r.body.success === true && r.body.levelUp === false && typeof r.body.newLevel === 'number', JSON.stringify(r.body));
r = await call('GET', '/api/gamification/stats');
check('read accumulated', r.body?.data?.totalReadTimeMin === 25, JSON.stringify(r.body?.data));
r = await call('POST', '/api/gamification/sync-time', { sessionMinutes: 5, type: 'bogus' });
check('bad type 400', r.status === 400, JSON.stringify(r.body));

r = await call('GET', '/api/gamification/creator/summary?username=kuro');
check('creator summary', r.status === 200 && typeof r.body?.data?.totalSubmissions === 'number', JSON.stringify(r.body).slice(0, 120));

r = await call('POST', '/api/creator/submit', { videoUrl: 'https://tiktok.com/@u/video/1' });
check('submit 201', r.status === 201 && r.body.status === 'PENDING', JSON.stringify(r.body));
r = await call('POST', '/api/creator/submit', { videoUrl: 'notaurl' });
check('submit 400', r.status === 400, JSON.stringify(r.body));

r = await call('POST', '/api/support/ticket', { subject: 'Video not loading', message: 'ep 5' });
check('ticket 201 + id', r.status === 201 && typeof r.body.ticketId === 'string' && r.body.status === 'OPEN', JSON.stringify(r.body));
r = await call('POST', '/api/support/ticket', { subject: 'x', message: '' });
check('ticket 400', r.status === 400, JSON.stringify(r.body));

r = await call('GET', '/api/profile/profile');
check('profile shape', r.status === 200 && r.body?.data?.username === 'smokefinal' && r.body.data.themePreference === 'cyber-neon', JSON.stringify(r.body).slice(0, 160));
r = await call('GET', '/api/profile/profile?username=kuro');
check('public profile', r.status === 200 && r.body?.data?.username === 'kuro', JSON.stringify(r.body).slice(0, 100));

r = await call('GET', '/api/gamification/badges');
check('badges list', r.status === 200 && r.body?.data?.length === 6 && 'requirementType' in r.body?.data?.[0], JSON.stringify(r.body?.data?.[0]));

r = await call('GET', '/api/community/posts');
check('feed dual', r.status === 200 && Array.isArray(r.body.posts) && r.body.success === true && r.body.ok === true, JSON.stringify({ s: r.status, keys: Object.keys(r.body) }));

srv.close();
console.log(`\n${results.filter(Boolean).length}/${results.length} checks passed`);
process.exit(results.every(Boolean) ? 0 : 1);
