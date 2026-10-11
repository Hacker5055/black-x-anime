/**
 * Support tickets controller — POST /api/support/ticket
 */
import { getPrisma } from '../lib/prisma.js';
import { getUserId, fail, prismaError, ensurePrismaUser } from '../lib/api.js';
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

    if (!process.env.DATABASE_URL) {
      ensureSocialTables();
      const ticketId = social.createTicket(String(userId), subject.trim(), message.trim());
      return res.status(201).json({
        success: true,
        ticketId,
        status: 'OPEN',
        message: 'Support ticket created.'
      });
    }

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
    return prismaError(res, err, { notFound: 'User not found.' });
  }
}
