/**
 * Support ticket routes — /api/support
 */
import { Router } from 'express';
import { attachUser } from '../lib/api.js';
import { createTicket, getMyTickets, getAdminTickets, replyAdminTicket } from '../controllers/support.controller.js';

const router = Router();

router.use(attachUser);

router.post('/ticket', createTicket);
router.get('/my-tickets', getMyTickets);
router.get('/admin/tickets', getAdminTickets);
router.post('/admin/tickets/:id/reply', replyAdminTicket);

export default router;
