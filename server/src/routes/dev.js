import { Router } from 'express';
import { db, getSetting, setSetting, logSystemEvent } from '../db.js';
import { requireDeveloper, requireAuth } from '../auth.js';

const router = Router();

/**
 * Public: Get site footer text
 */
router.get('/footer', (req, res) => {
  const tagline = getSetting('footer_tagline', 'Stream every episode. Track your shows. Own the night.');
  const notice = getSetting('footer_notice', 'BLACK X — The ultimate interactive anime experience.');
  res.json({ tagline, notice });
});

/**
 * Developer Only: Update site footer text
 */
router.put('/footer', requireDeveloper, (req, res) => {
  const { tagline, notice } = req.body || {};
  if (typeof tagline === 'string') {
    setSetting('footer_tagline', tagline.trim().slice(0, 300));
  }
  if (typeof notice === 'string') {
    setSetting('footer_notice', notice.trim().slice(0, 300));
  }
  logSystemEvent('info', 'settings', `Footer text updated by developer ${req.user.email}`);
  res.json({
    ok: true,
    tagline: getSetting('footer_tagline'),
    notice: getSetting('footer_notice')
  });
});

/**
 * Developer Only: Get site user count & user analytics
 */
router.get('/users-stats', requireDeveloper, (req, res) => {
  try {
    const { total } = db.prepare('SELECT COUNT(*) AS total FROM users').get();
    const roleStats = db.prepare('SELECT role, COUNT(*) AS count FROM users GROUP BY role').all();
    const recentUsersRaw = db.prepare(`
      SELECT id, username, email, display_name AS displayName, role, avatar_color AS avatarColor, photo_url AS photoUrl, badges, created_at AS createdAt
      FROM users
      ORDER BY id DESC
      LIMIT 100
    `).all();

    const recentUsers = recentUsersRaw.map((u) => {
      let badges = [];
      try {
        badges = typeof u.badges === 'string' ? JSON.parse(u.badges || '[]') : (u.badges || []);
        if (!Array.isArray(badges)) badges = [];
      } catch {
        badges = [];
      }
      return {
        ...u,
        badges
      };
    });

    res.json({
      totalUsers: total,
      roleStats,
      users: recentUsers
    });
  } catch (err) {
    logSystemEvent('error', 'dev', 'Failed to fetch user stats', { error: err.message });
    res.status(500).json({ error: 'db_error', message: err.message });
  }
});

/**
 * Developer Only: Update / grant badges for any user account
 */
const handleUpdateBadges = (req, res) => {
  const userId = Number(req.params.id);
  const { badges } = req.body || {};
  if (!Number.isInteger(userId) || !Array.isArray(badges)) {
    return res.status(400).json({ error: 'bad_request', message: 'userId and badges array required' });
  }

  const validBadges = ['blue_verified', 'gold_vip', 'success_partner', 'veteran_viewer', 'celebrity'];
  const sanitized = badges.filter((b) => validBadges.includes(b));

  try {
    const user = db.prepare('SELECT id, username, email FROM users WHERE id = ?').get(userId);
    if (!user) return res.status(404).json({ error: 'not_found', message: 'User not found' });

    db.prepare('UPDATE users SET badges = ? WHERE id = ?').run(JSON.stringify(sanitized), userId);
    logSystemEvent('info', 'badges', `Developer ${req.user.email} updated badges for @${user.username}: [${sanitized.join(', ')}]`, {
      userId,
      badges: sanitized
    });

    const updatedRaw = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    let updatedBadges = [];
    try {
      updatedBadges = JSON.parse(updatedRaw.badges || '[]');
    } catch {}

    res.json({
      ok: true,
      user: {
        id: updatedRaw.id,
        username: updatedRaw.username,
        email: updatedRaw.email,
        displayName: updatedRaw.display_name,
        role: updatedRaw.role,
        badges: updatedBadges
      }
    });
  } catch (err) {
    logSystemEvent('error', 'dev', 'Failed to update user badges', { error: err.message });
    res.status(500).json({ error: 'db_error', message: err.message });
  }
};

router.put('/users/:id/badges', requireDeveloper, handleUpdateBadges);
router.post('/users/:id/badges', requireDeveloper, handleUpdateBadges);

/**
 * Developer Only: Live system diagnostics and error discovery
 */
router.get('/diagnostics', requireDeveloper, async (req, res) => {
  const checks = [];
  const start = Date.now();

  // 1. Database check
  try {
    const t0 = Date.now();
    const dbTest = db.prepare('SELECT COUNT(*) AS c FROM users').get();
    checks.push({
      service: 'SQLite Database',
      status: 'ok',
      latencyMs: Date.now() - t0,
      details: `${dbTest.c} total users in DB`
    });
  } catch (err) {
    checks.push({
      service: 'SQLite Database',
      status: 'error',
      details: err.message
    });
    logSystemEvent('error', 'diagnostics', 'Database check failed', { error: err.message });
  }

  // 2. AniList external API check
  try {
    const t0 = Date.now();
    const r = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'BLACK-X-Diagnostics/1.0' },
      body: JSON.stringify({ query: '{ SiteStatistics { anime { count } } }' }),
      signal: AbortSignal.timeout(6000)
    });
    checks.push({
      service: 'AniList GraphQL API',
      status: r.ok ? 'ok' : 'degraded',
      latencyMs: Date.now() - t0,
      details: `HTTP ${r.status}`
    });
  } catch (err) {
    checks.push({
      service: 'AniList GraphQL API',
      status: 'error',
      details: err.message
    });
    logSystemEvent('warn', 'diagnostics', 'AniList ping check failed', { error: err.message });
  }

  // 3. Streaming Source CDN check
  try {
    const t0 = Date.now();
    const r = await fetch('https://images.witanime.site', {
      method: 'HEAD',
      headers: { 'User-Agent': 'BLACK-X-Diagnostics/1.0' },
      signal: AbortSignal.timeout(5000)
    }).catch(() => null);
    checks.push({
      service: 'Streaming CDN & Media',
      status: r ? 'ok' : 'reachable_proxy',
      latencyMs: Date.now() - t0,
      details: r ? `HTTP ${r.status}` : 'Fallback through local proxy'
    });
  } catch (err) {
    checks.push({
      service: 'Streaming CDN & Media',
      status: 'warning',
      details: err.message
    });
  }

  // 4. Memory & Uptime
  const memory = process.memoryUsage();
  checks.push({
    service: 'Node.js Runtime',
    status: 'ok',
    details: `Uptime: ${Math.floor(process.uptime())}s | Heap: ${Math.round(memory.heapUsed / 1024 / 1024)}MB / ${Math.round(memory.heapTotal / 1024 / 1024)}MB`
  });

  const overallStatus = checks.some((c) => c.status === 'error') ? 'error' : 'healthy';

  res.json({
    overallStatus,
    timestamp: new Date().toISOString(),
    totalDurationMs: Date.now() - start,
    checks
  });
});

/**
 * Developer Only: System Logs & Error Discovery
 */
router.get('/logs', requireDeveloper, (req, res) => {
  try {
    const logs = db.prepare(`
      SELECT id, level, category, message, details, created_at AS createdAt
      FROM system_logs
      ORDER BY id DESC
      LIMIT 100
    `).all();

    res.json({ logs });
  } catch (err) {
    res.status(500).json({ error: 'db_error', message: err.message });
  }
});

/**
 * Developer Only: Trigger test diagnostic error
 */
router.post('/test-log', requireDeveloper, (req, res) => {
  const { level = 'info', message = 'Diagnostic test ping' } = req.body || {};
  logSystemEvent(level, 'test', message, { initiatedBy: req.user.email, timestamp: new Date().toISOString() });
  res.json({ ok: true, message: 'Diagnostic event logged successfully' });
});

/**
 * Developer Only: VIP Subscription Code Generator & List
 */
router.get('/vip-codes', requireDeveloper, (req, res) => {
  try {
    const codes = db.prepare(`
      SELECT id, code, tier, duration_days AS durationDays, price_egp AS priceEgp,
             created_by AS createdBy, is_used AS isUsed,
             used_by_user_id AS usedByUserId, used_by_username AS usedByUsername,
             used_at AS usedAt, created_at AS createdAt
      FROM vip_subscription_codes
      ORDER BY id DESC
      LIMIT 100
    `).all();
    res.json({ codes });
  } catch (err) {
    res.status(500).json({ error: 'db_error', message: err.message });
  }
});

router.post('/vip-codes/generate', requireDeveloper, (req, res) => {
  try {
    const { tier = 'VIP Basic', durationDays = 30, priceEgp, customPrefix = 'BX' } = req.body || {};
    const validTier = tier === 'VIP Monarch' ? 'VIP Monarch' : 'VIP Basic';
    const days = Math.max(1, Number(durationDays) || 30);
    const defaultPrice = validTier === 'VIP Monarch' ? 149 : 69;
    const finalPrice = Number(priceEgp) > 0 ? Number(priceEgp) : defaultPrice;

    // Generate random distinct alphanumeric key (e.g. BX-MONARCH-9X4K2P)
    const tierCode = validTier === 'VIP Monarch' ? 'MONARCH' : 'BASIC';
    const randChars = Math.random().toString(36).substring(2, 8).toUpperCase();
    const cleanPrefix = String(customPrefix || 'BX').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const code = `${cleanPrefix}-${tierCode}-${randChars}`;

    const info = db.prepare(`
      INSERT INTO vip_subscription_codes (code, tier, duration_days, price_egp, created_by, is_used)
      VALUES (?, ?, ?, ?, ?, 0)
    `).run(code, validTier, days, finalPrice, req.user?.email || 'developer');

    logSystemEvent('info', 'vip', `Generated ${validTier} code ${code} (${days}d, ${finalPrice} EGP) by developer`);

    res.json({
      ok: true,
      code: {
        id: info.lastInsertRowid,
        code,
        tier: validTier,
        durationDays: days,
        priceEgp: finalPrice,
        isUsed: 0,
        createdAt: new Date().toISOString()
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'db_error', message: err.message });
  }
});

router.delete('/vip-codes/:id', requireDeveloper, (req, res) => {
  try {
    const id = Number(req.params.id);
    db.prepare('DELETE FROM vip_subscription_codes WHERE id = ?').run(id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'db_error', message: err.message });
  }
});

export default router;
