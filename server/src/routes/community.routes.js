/**
 * Community & social routes — /api/community
 */
import { Router } from 'express';
import { attachUser } from '../lib/api.js';
import { followUser, listPosts } from '../controllers/community.controller.js';

const router = Router();

router.use(attachUser);

router.post('/follow', followUser);
router.get('/posts', listPosts);

export default router;
