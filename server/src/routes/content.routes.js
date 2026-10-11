/**
 * Content & ratings routes — /api/content
 */
import { Router } from 'express';
import { attachUser } from '../lib/api.js';
import { rateContent, getMyRating } from '../controllers/content.controller.js';

const router = Router();

router.use(attachUser);

router.post('/rate', rateContent);
router.get('/rating', getMyRating);

export default router;
