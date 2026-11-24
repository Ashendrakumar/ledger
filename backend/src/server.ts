import Fastify from 'fastify';
import cors from '@fastify/cors';
import mongoose from 'mongoose';
import { createHash, randomUUID } from 'node:crypto';
import { z } from 'zod';
import { config } from './config.js';
import { AuditEventModel, AuthChallengeModel, AuthRateLimitModel, EntryModel, GoalModel, LoanModel, LoanPaymentModel, RefreshSessionModel, UserModel } from './models.js';
import { revokeRefreshToken, rotateRefreshToken, sendEmailCode, verifyAccessToken, verifyEmailCode } from './auth.js';
import { registerResourceRoutes } from './resources.js';
import { registerSyncRoutes } from './sync.js';

const allowedOrigins = new Set(config.WEB_ORIGIN.split(',').map((x) => x.trim()).filter(Boolean));
const app = Fastify({
  trustProxy: config.TRUST_PROXY,
  genReqId: (request) => request.headers['x-request-id']?.toString().slice(0, 100) || randomUUID(),
  logger: { redact: ['req.headers.authorization', 'req.body.code', 'req.body.refreshToken'] },
  bodyLimit: 32 * 1024,
});
await app.register(cors, {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.has(origin)) return callback(null, true);
    return callback(new Error('Origin is not allowed'), false);
  },
  credentials: false,
});

app.addHook('onSend', async (request, reply) => {
  reply.header('x-request-id', request.id);
  reply.header('x-content-type-options', 'nosniff');
  reply.header('x-frame-options', 'DENY');
  reply.header('referrer-policy', 'no-referrer');
  reply.header('permissions-policy', 'camera=(), microphone=(), geolocation=()');
  reply.header('cache-control', 'no-store');
});

const emailBody = z.object({ email: z.string().trim().email().max(254) });
const verifyBody = emailBody.extend({ code: z.string().regex(/^\d{6}$/) });
const refreshBody = z.object({ refreshToken: z.string().min(40).max(200) });

app.setErrorHandler((error, request, reply) => {
  request.log.error({ err: error }, 'request failed');
  if (error instanceof Error && error.message === 'Origin is not allowed') return reply.code(403).send({ error: { code: 'ORIGIN_NOT_ALLOWED', message: 'Request origin is not allowed.' } });
  if (error instanceof z.ZodError) return reply.code(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Request data is invalid.' } });
  return reply.code(500).send({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong.' } });
});

app.get('/api/v1/health', async (_request, reply) => {
  let database = 'unavailable';
  if (mongoose.connection.readyState === 1) {
    try {
      await mongoose.connection.db?.command({ ping: 1 });
      database = 'ready';
    } catch {
      database = 'unavailable';
    }
  }
  return reply.code(database === 'ready' ? 200 : 503).send({ status: database === 'ready' ? 'ok' : 'degraded', database });
});

app.post('/api/v1/auth/email/send', async (request, reply) => {
  const { email } = emailBody.parse(request.body);
  const windowStart = new Date(Math.floor(Date.now() / 3_600_000) * 3_600_000);
  const emailKey = createHash('sha256').update(email.trim().toLowerCase()).digest('hex');
  const ipKey = createHash('sha256').update(request.ip).digest('hex');
  const emailLimit = await AuthRateLimitModel.findOneAndUpdate(
    { key: `email:${emailKey}`, windowStart },
    { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date(windowStart.getTime() + 24 * 3_600_000) } },
    { upsert: true, new: true },
  );
  const ipLimit = await AuthRateLimitModel.findOneAndUpdate(
    { key: `ip:${ipKey}`, windowStart },
    { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date(windowStart.getTime() + 24 * 3_600_000) } },
    { upsert: true, new: true },
  );
  if (emailLimit.count > 5 || ipLimit.count > 20) return reply.code(429).send({ error: { code: 'RATE_LIMITED', message: 'Too many requests. Try again later.' } });
  await sendEmailCode(email);
  return reply.send({ ok: true, message: 'If the address can receive mail, a sign-in code will arrive shortly.' });
});

app.post('/api/v1/auth/email/verify', async (request, reply) => {
  const { email, code } = verifyBody.parse(request.body);
  const result = await verifyEmailCode(email, code);
  if (!result) return reply.code(401).send({ error: { code: 'INVALID_OR_EXPIRED_CODE', message: 'The code is invalid or expired.' } });
  await AuditEventModel.create({ actorId: result.user.id, action: 'auth.email_verified', requestId: request.id });
  return reply.send(result);
});

app.post('/api/v1/auth/refresh', async (request, reply) => {
  const { refreshToken } = refreshBody.parse(request.body);
  const result = await rotateRefreshToken(refreshToken);
  if (!result) return reply.code(401).send({ error: { code: 'INVALID_REFRESH_TOKEN', message: 'Sign in again to continue.' } });
  return reply.send(result);
});

app.post('/api/v1/auth/logout', async (request, reply) => {
  const header = request.headers.authorization;
  const actorId = header?.startsWith('Bearer ') ? verifyAccessToken(header.slice(7)) : null;
  if (!actorId) return reply.code(401).send({ error: { code: 'UNAUTHORIZED', message: 'Sign in to continue.' } });
  const actor = await UserModel.findById(actorId).select('_id status');
  if (!actor || actor.status !== 'active') return reply.code(401).send({ error: { code: 'UNAUTHORIZED', message: 'Sign in to continue.' } });
  const { refreshToken } = refreshBody.parse(request.body);
  await revokeRefreshToken(refreshToken);
  await AuditEventModel.create({ actorId, action: 'auth.logout', requestId: request.id });
  return reply.code(204).send();
});

app.get('/api/v1/me', async (request, reply) => {
  const header = request.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : '';
  const userId = verifyAccessToken(token);
  if (!userId) return reply.code(401).send({ error: { code: 'UNAUTHORIZED', message: 'Sign in to continue.' } });
  const user = await UserModel.findById(userId).select('email displayName status');
  if (!user || user.status !== 'active') return reply.code(401).send({ error: { code: 'UNAUTHORIZED', message: 'Sign in to continue.' } });
  return reply.send({ user: { id: user.id, email: user.email, name: user.displayName ?? undefined } });
});

app.get('/api/v1/me/export', async (request, reply) => {
  const header = request.headers.authorization;
  const userId = header?.startsWith('Bearer ') ? verifyAccessToken(header.slice(7)) : null;
  if (!userId) return reply.code(401).send({ error: { code: 'UNAUTHORIZED', message: 'Sign in to continue.' } });
  const user = await UserModel.findById(userId).select('email displayName setupCompletedAt createdAt updatedAt status').lean();
  if (!user || user.status !== 'active') return reply.code(401).send({ error: { code: 'UNAUTHORIZED', message: 'Sign in to continue.' } });
  const ownerId = new mongoose.Types.ObjectId(userId);
  const [entries, goals, loans, loanPayments] = await Promise.all([
    EntryModel.find({ ownerId }).select('-_id -ownerId').lean(),
    GoalModel.find({ ownerId }).select('-_id -ownerId').lean(),
    LoanModel.find({ ownerId }).select('-_id -ownerId').lean(),
    LoanPaymentModel.find({ ownerId }).select('-_id -ownerId').lean(),
  ]);
  await AuditEventModel.create({ actorId: ownerId, action: 'account.exported', requestId: request.id });
  reply.header('content-disposition', 'attachment; filename="ledger-export.json"');
  return reply.send({
    exportedAt: new Date().toISOString(),
    user: { id: String(user._id), email: user.email, name: user.displayName ?? undefined, setupCompleted: Boolean(user.setupCompletedAt), createdAt: user.createdAt },
    resources: { entries, goals, loans, loanPayments },
  });
});

app.delete('/api/v1/me', async (request, reply) => {
  const header = request.headers.authorization;
  const userId = header?.startsWith('Bearer ') ? verifyAccessToken(header.slice(7)) : null;
  if (!userId) return reply.code(401).send({ error: { code: 'UNAUTHORIZED', message: 'Sign in to continue.' } });
  const user = await UserModel.findById(userId).select('email status');
  if (!user) return reply.code(204).send();
  if (user.status === 'active') {
    const claimed = await UserModel.updateOne({ _id: userId, status: 'active' }, { $set: { status: 'deletion_pending' } });
    if (!claimed.modifiedCount) return reply.code(409).send({ error: { code: 'ACCOUNT_STATE_CHANGED', message: 'Account state changed. Retry the deletion request.' } });
  } else if (user.status !== 'deletion_pending') {
    return reply.code(401).send({ error: { code: 'UNAUTHORIZED', message: 'Sign in to continue.' } });
  }

  const ownerId = new mongoose.Types.ObjectId(userId);
  const emailKey = createHash('sha256').update(user.email.trim().toLowerCase()).digest('hex');
  await Promise.all([
    EntryModel.deleteMany({ ownerId }), GoalModel.deleteMany({ ownerId }), LoanModel.deleteMany({ ownerId }),
    LoanPaymentModel.deleteMany({ ownerId }), RefreshSessionModel.deleteMany({ userId: ownerId }),
    AuthChallengeModel.deleteMany({ email: user.email }),
    AuthRateLimitModel.deleteMany({ key: `email:${emailKey}` }),
  ]);
  await AuditEventModel.create({ actorId: ownerId, action: 'account.deleted', requestId: request.id });
  await UserModel.deleteOne({ _id: ownerId, status: 'deletion_pending' });
  return reply.code(204).send();
});

registerResourceRoutes(app);
registerSyncRoutes(app);

const start = async () => {
  await mongoose.connect(config.MONGODB_URI);
  await Promise.all([
    AuthChallengeModel.createIndexes(), AuthRateLimitModel.createIndexes(), RefreshSessionModel.createIndexes(), AuditEventModel.createIndexes(),
    UserModel.createIndexes(), EntryModel.createIndexes(), GoalModel.createIndexes(), LoanModel.createIndexes(), LoanPaymentModel.createIndexes(),
  ]);
  await app.listen({ host: config.HOST, port: config.PORT });
};

for (const signal of ['SIGINT', 'SIGTERM'] as const) process.on(signal, async () => {
  await app.close();
  await mongoose.disconnect();
  process.exit(0);
});

start().catch((error: unknown) => {
  app.log.error(error);
  process.exit(1);
});
