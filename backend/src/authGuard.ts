import type { FastifyReply, FastifyRequest } from 'fastify';
import { verifyAccessToken } from './auth.js';
import { UserModel } from './models.js';

export async function getActiveUserId(request: FastifyRequest, reply: FastifyReply): Promise<string | null> {
  const header = request.headers.authorization;
  const userId = header?.startsWith('Bearer ') ? verifyAccessToken(header.slice(7)) : null;
  if (!userId) {
    await reply.code(401).send({ error: { code: 'UNAUTHORIZED', message: 'Sign in to continue.' } });
    return null;
  }
  const user = await UserModel.findOne({ _id: userId, status: 'active' }).select('_id').lean();
  if (!user) {
    await reply.code(401).send({ error: { code: 'UNAUTHORIZED', message: 'Sign in to continue.' } });
    return null;
  }
  return userId;
}
