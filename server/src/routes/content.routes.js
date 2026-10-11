/**
 * Content & ratings routes — /api/content
 */
import { Router } from 'express';
import { attachUser } from '../lib/api.js';
import { rateContent, getMyRating, getLibrary, getLibraryItemDetail, logReadingProgress } from '../controllers/content.controller.js';

const router = Router();

router.use(attachUser);

router.post('/rate', rateContent);
router.get('/rating', getMyRating);
router.get('/library', getLibrary);
router.get('/library/:id', getLibraryItemDetail);
router.post('/library/:id/read', logReadingProgress);

export default router;
