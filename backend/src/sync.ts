import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { Types, type Model } from 'mongoose';
import { z } from 'zod';
import { getActiveUserId } from './authGuard.js';
import { EntryModel, GoalModel, LoanModel, LoanPaymentModel, UserModel } from './models.js';
import { computeEMI } from './resources.js';

const models: Array<{ resource: 'entries' | 'goals' | 'loans' | 'loan-payments'; model: Model<any> }> = [
  { resource: 'entries', model: EntryModel },
  { resource: 'goals', model: GoalModel },
  { resource: 'loans', model: LoanModel },
  { resource: 'loan-payments', model: LoanPaymentModel },
] as const;
type ResourceName = (typeof models)[number]['resource'];
const cursorSchema = z.object({ ownerId: z.string(), updatedAt: z.string().datetime(), resource: z.enum(['entries', 'goals', 'loans', 'loan-payments']), clientId: z.string() });
const encodeCursor = (cursor: z.infer<typeof cursorSchema>) => Buffer.from(JSON.stringify(cursor)).toString('base64url');

function parseCursor(value: string | undefined) {
  if (!value) return null;
  try {
    const parsed = cursorSchema.safeParse(JSON.parse(Buffer.from(value, 'base64url').toString('utf8')));
    return parsed.success ? parsed.data : false;
  } catch { return false; }
}

function publicRecord(row: Record<string, unknown>) {
  const { _id, __v: _v, ownerId: _owner, ...record } = row;
  const loan = record as { principalPaise?: number; annualRatePct?: number; tenureMonths?: number };
  const emiPaise = Number.isSafeInteger(loan.principalPaise) && Number.isFinite(loan.annualRatePct) && Number.isInteger(loan.tenureMonths)
    ? computeEMI(loan.principalPaise!, loan.annualRatePct!, loan.tenureMonths!)
    : undefined;
  return { ...record, ...(emiPaise === undefined ? {} : { emiPaise }), id: record.clientId ?? String(_id), clientId: record.clientId ?? String(_id) };
}

export function registerSyncRoutes(app: FastifyInstance) {
  app.get('/api/v1/sync/bootstrap', async (request, reply) => {
    const ownerId = await getActiveUserId(request, reply);
    if (!ownerId) return;
    const query = z.object({
      limit: z.coerce.number().int().min(1).max(100).default(100),
      entriesCursor: z.string().optional(), goalsCursor: z.string().optional(), loansCursor: z.string().optional(), loanPaymentsCursor: z.string().optional(),
    }).parse(request.query);
    const account = await UserModel.findById(ownerId).select('email displayName status setupCompletedAt createdAt updatedAt').lean();
    if (!account || account.status !== 'active') return reply.code(401).send({ error: { code: 'UNAUTHORIZED', message: 'Sign in to continue.' } });
    const resources: Record<string, unknown> = {};
    for (const { resource, model } of models) {
      const cursorKey = resource === 'loan-payments' ? 'loanPaymentsCursor' : `${resource}Cursor`;
      const after = query[cursorKey as keyof typeof query];
      const rows = await model.find({ ownerId, deletedAt: { $exists: false }, ...(after ? { clientId: { $gt: after } } : {}) }).sort({ clientId: 1 }).limit(query.limit + 1).lean().exec();
      const hasMore = rows.length > query.limit;
      const data = rows.slice(0, query.limit).map((row: Record<string, unknown>) => publicRecord(row));
      resources[resource] = { data, nextCursor: hasMore ? data.at(-1)?.clientId : null };
    }
    return reply.send({ user: { id: String(account._id), email: account.email, name: account.displayName ?? undefined, setupCompleted: Boolean(account.setupCompletedAt) }, resources });
  });

  app.post('/api/v1/onboarding/complete', async (request, reply) => {
    const ownerId = await getActiveUserId(request, reply);
    if (!ownerId) return;
    const bodySchema = z.object({
      entries: z.array(z.object({
        clientId: z.string().min(1).max(100).regex(/^[\w-]+$/),
        kind: z.literal('planned'),
        type: z.enum(['expense', 'income', 'saving']),
        amountPaise: z.number().int().safe().min(0),
        category: z.string().trim().min(1).max(80),
        month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
        note: z.string().max(500).optional(),
      }).strict()).min(1).max(100),
    }).strict();
    const parsed = bodySchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: { code: 'VALIDATION_ERROR', details: parsed.error.issues } });
    const ids = parsed.data.entries.map((entry) => entry.clientId);
    if (new Set(ids).size !== ids.length) return reply.code(400).send({ error: { code: 'DUPLICATE_CLIENT_ID', message: 'Each onboarding entry needs a unique client ID.' } });
    const operations = parsed.data.entries.map((entry) => ({
      updateOne: {
        filter: { ownerId: new Types.ObjectId(ownerId), clientId: entry.clientId },
        update: { $setOnInsert: { ...entry, ownerId: new Types.ObjectId(ownerId) } },
        upsert: true,
      },
    }));
    await EntryModel.bulkWrite(operations as Parameters<typeof EntryModel.bulkWrite>[0], { ordered: true });
    const account = await UserModel.findOneAndUpdate(
      { _id: ownerId, status: 'active' }, { $set: { setupCompletedAt: new Date() } }, { new: true },
    ).select('_id setupCompletedAt');
    if (!account) return reply.code(401).send({ error: { code: 'UNAUTHORIZED', message: 'Sign in to continue.' } });
    return reply.send({ setupCompleted: true, savedEntries: parsed.data.entries.length });
  });

  app.get('/api/v1/sync/changes', async (request, reply) => {
    const ownerId = await getActiveUserId(request, reply);
    if (!ownerId) return;
    const query = z.object({ cursor: z.string().max(500).optional(), limit: z.coerce.number().int().min(1).max(100).default(50) }).parse(request.query);
    const cursor = parseCursor(query.cursor);
    if (cursor === false) return reply.code(400).send({ error: { code: 'INVALID_CURSOR', message: 'Sync cursor is invalid.' } });
    if (cursor && cursor.ownerId !== ownerId) return reply.code(400).send({ error: { code: 'INVALID_CURSOR', message: 'Sync cursor is invalid.' } });
    const candidates: Array<{ resource: ResourceName; row: Record<string, unknown> }> = [];
    const timestamp = cursor ? new Date(cursor.updatedAt) : null;
    for (const item of models) {
      const clauses: Record<string, unknown>[] = [];
      if (!cursor) clauses.push({});
      else {
        clauses.push({ updatedAt: { $gt: timestamp } });
        const resourceOrder = models.findIndex((model) => model.resource === item.resource);
        const cursorOrder = models.findIndex((model) => model.resource === cursor.resource);
        if (resourceOrder > cursorOrder) clauses.push({ updatedAt: timestamp });
        if (resourceOrder === cursorOrder) clauses.push({ updatedAt: timestamp, clientId: { $gt: cursor.clientId } });
      }
      const rows = await item.model.find({ ownerId, $or: clauses }).sort({ updatedAt: 1, clientId: 1 }).limit(query.limit + 1).lean().exec();
      for (const row of rows as Record<string, unknown>[]) candidates.push({ resource: item.resource, row });
    }
    candidates.sort((a, b) => {
      const time = new Date(a.row.updatedAt as string).getTime() - new Date(b.row.updatedAt as string).getTime();
      if (time) return time;
      const resource = models.findIndex((item) => item.resource === a.resource) - models.findIndex((item) => item.resource === b.resource);
      return resource || String(a.row.clientId).localeCompare(String(b.row.clientId));
    });
    const hasMore = candidates.length > query.limit;
    const page = candidates.slice(0, query.limit);
    const changes = page.map(({ resource, row }) => ({ resource, deleted: Boolean(row.deletedAt), data: publicRecord(row) }));
    const last = page.at(-1);
    const nextCursor = hasMore && last ? encodeCursor({
      ownerId, updatedAt: new Date(last.row.updatedAt as string).toISOString(), resource: last.resource, clientId: String(last.row.clientId),
    }) : encodeCursor({
      ownerId, updatedAt: new Date(Date.now() - 1000).toISOString(), resource: 'entries', clientId: '',
    });
    return reply.send({ changes, nextCursor, hasMore });
  });
}
