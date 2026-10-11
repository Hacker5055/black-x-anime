/** SQLite-mode smoke — exactly what the live ai.studio deployment does (no DATABASE_URL). */
if (process.env.FORCE_DB_URL) process.env.DATABASE_URL = process.env.FORCE_DB_URL;
else delete process.env.DATABASE_URL;
import express from 'express';
import contentRoutes from './server/src/routes/content.routes.js';
import communityRoutes from './server/src/routes/community.routes.js';
import profileRoutes from './server/src/routes/profile.routes.js';
import gamificationRoutes from './server/src/routes/gamification.routes.js';
import supportRoutes from './server/src/routes/support.routes.js';

const results = [];
const check = (n, c, d) => { results.push(c); console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${c ? '' : '  → ' + d}`); };

const app = express();
app.use(express.json());
app.use((req, _r, next) => { req.user = { id: 20, username: "kuro", displayName: 'Kuro', role: 'admin' }; next(); });
app.use('/api/content', contentRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/gamification', gamificationRoutes);
app.use('/api/creator', gamificationRoutes);
app.use('/api/support', supportRoutes);
const { db } = await import('./server/src/db.js');
for (const t of ['social_ratings','social_follows','social_stats','social_badges','social_user_badges','social_submissions','social_tickets']) {
  try { db.prepare('DELETE FROM ' + t).run(); } catch {}
}
const srv = app.listen(4097);
const call = async (m, p, b) => {
  const r = await fetch('http://localhost:4097' + p, { method: m, headers: { 'content-type': 'application/json' }, body: b ? JSON.stringify(b) : undefined });
  return { status: r.status, body: await r.json() };
};

let r = await call('POST', '/api/content/rate', { slug: 'one-piece', title: 'One Piece', score: 9 });
check('rate 200', r.status === 200 && r.body.message === 'Rating saved successfully.', JSON.stringify(r.body));
r = await call('GET', '/api/content/rating?slug=one-piece');
check('get rating 9', r.status === 200 && r.body.rating?.score === 9, JSON.stringify(r.body));
r = await call('POST', '/api/content/rate', { slug: 'one-piece', title: 'One Piece', score: 7 });
r = await call('GET', '/api/content/rating?slug=one-piece');
check('rating updated to 7', r.body.rating?.score === 7, JSON.stringify(r.body));
r = await call('POST', '/api/content/rate', { slug: 'one-piece', episodeNumber: 3, score: 8 });
r = await call('GET', '/api/content/rating?slug=one-piece&episodeNumber=3');
check('episode rating 8', r.body.rating?.score === 8, JSON.stringify(r.body));
r = await call('POST', '/api/content/rate', { slug: 'x', score: 12 });
check('score 12 → 400', r.status === 400, JSON.stringify(r.body));

r = await call('POST', '/api/community/follow', { targetUsername: 'zero' });
check('follow 200', r.status === 200 && r.body.isFollowing === true, JSON.stringify(r.body));
r = await call('POST', '/api/community/follow', { targetUserId: '20' });
check('follow self → 400', r.status === 400, JSON.stringify(r.body));

r = await call('GET', '/api/gamification/stats');
check('stats shape', r.status === 200 && typeof r.body.data?.currentLevel === 'number' && Array.isArray(r.body.data?.unlockedBadges), JSON.stringify(r.body));
r = await call('POST', '/api/gamification/sync-time', { sessionMinutes: 130, type: 'watch' });
check('sync levelUp', r.status === 200 && r.body.levelUp === true && r.body.newLevel === 2, JSON.stringify(r.body));
r = await call('GET', '/api/gamification/stats');
check('stats watch 130 + badges', r.body.data?.totalWatchTimeMin === 130 && r.body.data?.unlockedBadges?.length >= 1, JSON.stringify(r.body.data));

r = await call('POST', '/api/creator/submit', { videoUrl: 'https://tiktok.com/@u/video/1' });
check('creator 201', r.status === 201 && r.body.status === 'PENDING', JSON.stringify(r.body));
r = await call('POST', '/api/support/ticket', { subject: 'Video not loading', message: 'ep 5' });
check('ticket 201 + id', r.status === 201 && typeof r.body.ticketId === 'string' && r.body.status === 'OPEN', JSON.stringify(r.body));
r = await call('PUT', '/api/profile/customize', { bannerUrl: 'https://x/b.jpg', themePreference: 'cyber-neon' });
check('customize 200', r.status === 200 && r.body.message === 'Profile updated.', JSON.stringify(r.body));

srv.close();
console.log(`\n${results.filter(Boolean).length}/${results.length} sqlite checks passed`);
process.exit(results.every(Boolean) ? 0 : 1);
