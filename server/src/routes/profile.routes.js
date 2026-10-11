/**
 * Profile & customization routes — /api/profile
 */
import { Router } from 'express';
import { attachUser } from '../lib/api.js';
import { customizeProfile, getProfile } from '../controllers/profile.controller.js';

const router = Router();

router.use(attachUser);

router.put('/customize', customizeProfile);
router.get('/profile', getProfile);

export default router;
