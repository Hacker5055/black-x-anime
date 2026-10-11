/**
 * Community & social routes — /api/community
 */
import { Router } from 'express';
import { attachUser } from '../lib/api.js';
import { followUser, unfollowUser, getFollowStatus, getNetwork, listPosts } from '../controllers/community.controller.js';

const router = Router();

router.use(attachUser);

router.post('/follow', followUser);
router.post('/unfollow', unfollowUser);
router.get('/follow-status', getFollowStatus);
router.get('/network/:username', getNetwork);
router.get('/posts', listPosts);

export default router;
