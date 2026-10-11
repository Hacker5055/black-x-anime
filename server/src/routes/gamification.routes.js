/**
 * Gamification & rewards routes.
 * Mounted at /api/gamification (stats, sync-time) AND /api/creator (submit),
 * matching the spec where all three live in gamification.routes.js.
 */
import { Router } from 'express';
import { attachUser } from '../lib/api.js';
import { getStats, syncTime, submitCreator, getCreatorSummary } from '../controllers/gamification.controller.js';

const router = Router();

router.use(attachUser);

router.get('/stats', getStats);
router.post('/sync-time', syncTime);
router.post('/submit', submitCreator);
router.get('/creator/summary', getCreatorSummary);

// Static badge catalogue (same in every store — the seeded set).
const BADGES = [
  { name: 'First Steps', iconUrl: '/assets/badge1.png', requirementType: 'WATCH_MINUTES', requirementThreshold: 10 },
  { name: 'Marathon Watcher', iconUrl: '/assets/badge2.png', requirementType: 'WATCH_MINUTES', requirementThreshold: 120 },
  { name: 'Community Star', iconUrl: '/assets/badge3.png', requirementType: 'POSTS', requirementThreshold: 50 },
  { name: 'Theory Master', iconUrl: '/assets/badge4.png', requirementType: 'THEORIES', requirementThreshold: 25 },
  { name: 'Prediction Pro', iconUrl: '/assets/badge5.png', requirementType: 'PREDICTIONS', requirementThreshold: 10 },
  { name: 'Legendary Oracle', iconUrl: '/assets/badge6.png', requirementType: 'PREDICTIONS', requirementThreshold: 100 }
];
router.get('/badges', (req, res) => {
  res.status(200).json({ success: true, data: BADGES });
});

export default router;
