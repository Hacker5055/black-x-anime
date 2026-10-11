/**
 * Support ticket routes — /api/support
 */
import { Router } from 'express';
import { attachUser } from '../lib/api.js';
import { createTicket } from '../controllers/support.controller.js';

const router = Router();

router.use(attachUser);

router.post('/ticket', createTicket);

export default router;
