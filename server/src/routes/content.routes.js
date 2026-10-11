/**
 * Content & ratings routes — /api/content
 */
import { Router } from 'express';
import { attachUser } from '../lib/api.js';
import { rateContent } from '../controllers/content.controller.js';

const router = Router();

router.use(attachUser);

router.post('/rate', rateContent);

export default router;
