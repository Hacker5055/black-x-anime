/**
 * Gamification & rewards routes.
 * Mounted at /api/gamification (stats, sync-time) AND /api/creator (submit),
 * matching the spec where all three live in gamification.routes.js.
 */
import { Router } from 'express';
import { attachUser } from '../lib/api.js';
import { getStats, syncTime, submitCreator } from '../controllers/gamification.controller.js';

const router = Router();

router.use(attachUser);

router.get('/stats', getStats);
router.post('/sync-time', syncTime);
router.post('/submit', submitCreator);

export default router;
