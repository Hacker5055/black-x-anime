/**
 * Support tickets controller — POST /api/support/ticket
 */
import { getPrisma } from '../lib/prisma.js';
import { getUserId, fail, prismaError, ensurePrismaUser, isDbUnavailable, dbIsBroken } from '../lib/api.js';
import { social, ensureSocialTables } from '../lib/socialDb.js';

/** POST /api/support/ticket — body { subject, message } */
export async function createTicket(req, res) {
  try {
    const userId = getUserId(req);
    if (!userId) return fail(res, 401, 'Authentication required.');

    const { subject, message } = req.body || {};
    if (!subject || typeof subject !== 'string' || !subject.trim()) {
      return fail(res, 400, 'subject is required.');
    }
    if (!message || typeof message !== 'string' || !message.trim()) {
      return fail(res, 400, 'message is required.');
    }

        var socialFallback = () => {
      ensureSocialTables();
      const ticketId = social.createTicket(String(userId), subject.trim(), message.trim());
      return res.status(201).json({
        success: true,
        ticketId,
        status: 'OPEN',
        message: 'Support ticket created.'
      });
    };
    if (!process.env.DATABASE_URL || dbIsBroken()) return socialFallback();

    const prisma = getPrisma();
    const uid = String(userId);

    const user = await ensurePrismaUser(prisma, req.user);
    if (!user) return fail(res, 404, 'User not found.');

    const ticket = await prisma.supportTicket.create({
      data: {
        user_id: uid,
        subject: subject.trim(),
        message: message.trim(),
        status: 'OPEN'
      }
    });

    return res.status(201).json({
      success: true,
      ticketId: ticket.id,
      status: 'OPEN',
      message: 'Support ticket created.'
    });
  } catch (err) {
      if (isDbUnavailable(err) && typeof socialFallback === 'function') return socialFallback();
    return prismaError(res, err, { notFound: 'User not found.' });
  }
}

/** GET /api/support/my-tickets */
export async function getMyTickets(req, res) {
  try {
    const userId = getUserId(req);
    if (!userId) return fail(res, 401, 'Authentication required.');
    ensureSocialTables();
    const tickets = social.getTickets(String(userId), false);
    return res.json({ success: true, tickets });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'failed_to_fetch_tickets' });
  }
}

/** GET /api/support/admin/tickets — for developer/admin */
export async function getAdminTickets(req, res) {
  try {
    const userId = getUserId(req);
    const isDev = req.user?.role === 'developer' || req.user?.email?.toLowerCase() === 'mz0970mmz@gmail.com' || req.user?.isDeveloper;
    if (!userId || !isDev) return fail(res, 403, 'Developer/Admin access required.');
    ensureSocialTables();
    const tickets = social.getTickets(String(userId), true);
    return res.json({ success: true, tickets });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'failed_admin_tickets' });
  }
}

/** POST /api/support/admin/tickets/:id/reply */
export async function replyAdminTicket(req, res) {
  try {
    const userId = getUserId(req);
    const isDev = req.user?.role === 'developer' || req.user?.email?.toLowerCase() === 'mz0970mmz@gmail.com' || req.user?.isDeveloper;
    if (!userId || !isDev) return fail(res, 403, 'Developer/Admin access required.');
    const { id } = req.params;
    const { reply, status = 'RESOLVED' } = req.body || {};
    if (!reply || !reply.trim()) return fail(res, 400, 'Reply message is required.');
    
    ensureSocialTables();
    const updated = social.replyTicket(id, reply.trim(), status);
    return res.json({ success: true, message: 'Reply sent and ticket updated', ticket: updated });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'failed_admin_reply' });
  }
}
