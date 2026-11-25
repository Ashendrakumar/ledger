import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import type { Model } from 'mongoose';
import { z } from 'zod';
import { getActiveUserId } from './authGuard.js';
import { EntryModel, GoalModel, LoanModel, LoanPaymentModel } from './models.js';

const monthPattern = /^\d{4}-(0[1-9]|1[0-2])$/;
const datePattern = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const calendarDate = z.string().regex(datePattern).refine((value) => {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}, 'Date must be a real calendar date.');
const paise = z.number().int().safe().min(0);
const clientId = z.string().min(1).max(100).regex(/^[\w-]+$/);
const common = { clientId: clientId.optional() };

const entryFields = z.object({
  ...common,
  kind: z.enum(['actual', 'planned']),
  type: z.enum(['expense', 'income', 'saving']),
  amountPaise: paise,
  category: z.string().trim().min(1).max(80),
  month: z.string().regex(monthPattern),
  date: calendarDate.optional(),
  note: z.string().max(500).optional(),
  loanPaymentId: clientId.optional(),
}).strict();
const entrySchema = entryFields.superRefine((value, ctx) => {
  if (value.kind === 'actual' && !value.date) ctx.addIssue({ code: 'custom', path: ['date'], message: 'Actual entries require a date.' });
  if (value.kind === 'planned' && value.date) ctx.addIssue({ code: 'custom', path: ['date'], message: 'Planned entries cannot have a date.' });
  if (value.date && value.date.slice(0, 7) !== value.month) ctx.addIssue({ code: 'custom', path: ['month'], message: 'Date and month must match.' });
});

const goalFields = z.object({
  ...common,
  name: z.string().trim().min(1).max(80),
  targetPaise: paise.min(1),
  savedPaise: paise,
  targetMonth: z.string().regex(monthPattern),
}).strict();
const goalSchema = goalFields.superRefine((value, ctx) => {
  if (value.savedPaise > value.targetPaise) ctx.addIssue({ code: 'custom', path: ['savedPaise'], message: 'Saved amount cannot exceed the target.' });
});

const loanFields = z.object({
  ...common,
  name: z.string().trim().min(1).max(80),
  principalPaise: paise.min(1),
  annualRatePct: z.number().finite().min(0).max(100),
  tenureMonths: z.number().int().min(1).max(480),
  startMonth: z.string().regex(monthPattern),
  dueDay: z.number().int().min(1).max(31).optional(),
  trackExpenses: z.boolean().optional(),
}).strict();
const loanSchema = loanFields;

const paymentFields = z.object({
  ...common,
  loanId: clientId,
  month: z.string().regex(monthPattern),
  amountPaise: paise,
  kind: z.enum(['actual', 'planned', 'prepayment']),
  date: calendarDate.optional(),
  note: z.string().max(500).optional(),
}).strict();
const paymentSchema = paymentFields.superRefine((value, ctx) => {
  if (value.kind === 'actual' && !value.date) ctx.addIssue({ code: 'custom', path: ['date'], message: 'Actual payments require a date.' });
  if (value.kind === 'planned' && value.date) ctx.addIssue({ code: 'custom', path: ['date'], message: 'Planned payments cannot have a date.' });
  if (value.date && value.date.slice(0, 7) !== value.month) ctx.addIssue({ code: 'custom', path: ['month'], message: 'Date and month must match.' });
});

type ResourceKind = 'entries' | 'goals' | 'loans' | 'loan-payments';
type ResourceBody = z.infer<typeof entrySchema> | z.infer<typeof goalSchema> | z.infer<typeof loanSchema> | z.infer<typeof paymentSchema>;
type ResourceModel = Model<any>;

function asApiRecord(row: Record<string, unknown>) {
  const { _id, __v: _version, ownerId: _owner, deletedAt: _deleted, ...rest } = row;
  const loanFields = rest as { principalPaise?: number; annualRatePct?: number; tenureMonths?: number };
  const emiPaise = Number.isSafeInteger(loanFields.principalPaise) && Number.isFinite(loanFields.annualRatePct) && Number.isInteger(loanFields.tenureMonths)
    ? computeEMI(loanFields.principalPaise!, loanFields.annualRatePct!, loanFields.tenureMonths!)
    : undefined;
  return { ...rest, ...(emiPaise === undefined ? {} : { emiPaise }), id: rest.clientId ?? String(_id), clientId: rest.clientId ?? String(_id) };
}

export function computeEMI(principalPaise: number, annualRatePct: number, tenureMonths: number) {
  if (principalPaise <= 0 || tenureMonths <= 0) return 0;
  const rate = annualRatePct / 12 / 100;
  if (rate <= 0) return Math.round(principalPaise / tenureMonths);
  const factor = Math.pow(1 + rate, tenureMonths) - 1;
  return Math.round((principalPaise * rate * Math.pow(1 + rate, tenureMonths)) / factor);
}

const dateQuery = z.string().datetime({ offset: true }).optional();

export function registerResourceRoutes(app: FastifyInstance) {
  const resources: Array<{ name: ResourceKind; model: ResourceModel; schema: z.ZodTypeAny; fieldsSchema: z.ZodObject<any>; patchSchema: z.ZodTypeAny }> = [
    { name: 'entries', model: EntryModel, schema: entrySchema, fieldsSchema: entryFields, patchSchema: entryFields.omit({ clientId: true }).partial() },
    { name: 'goals', model: GoalModel, schema: goalSchema, fieldsSchema: goalFields, patchSchema: goalFields.omit({ clientId: true }).partial() },
    { name: 'loans', model: LoanModel, schema: loanSchema, fieldsSchema: loanFields, patchSchema: loanFields.omit({ clientId: true }).partial() },
    { name: 'loan-payments', model: LoanPaymentModel, schema: paymentSchema, fieldsSchema: paymentFields, patchSchema: paymentFields.omit({ clientId: true }).partial() },
  ];

  for (const resource of resources) {
    const base = `/api/v1/${resource.name}`;
    app.get(base, async (request, reply) => {
      const ownerId = await getActiveUserId(request, reply);
      if (!ownerId) return;
      const query = z.object({
        month: z.string().regex(monthPattern).optional(),
        kind: z.enum(['actual', 'planned']).optional(),
        type: z.enum(['expense', 'income', 'saving']).optional(),
        loanId: clientId.optional(),
        updatedAfter: dateQuery,
        limit: z.coerce.number().int().min(1).max(100).default(50),
        cursor: clientId.optional(),
      }).parse(request.query);
      const filter: Record<string, unknown> = { ownerId, deletedAt: { $exists: false } };
      if (query.month) filter.month = query.month;
      if (query.kind) filter.kind = query.kind;
      if (query.type) filter.type = query.type;
      if (query.loanId) filter.loanId = query.loanId;
      if (query.updatedAfter) filter.updatedAt = { $gt: new Date(query.updatedAfter) };
      if (query.cursor) filter.clientId = { $gt: query.cursor };
      const rows = await resource.model.find(filter).sort({ clientId: 1 }).limit(query.limit + 1).lean().exec();
      const hasMore = rows.length > query.limit;
      const page = rows.slice(0, query.limit).map((row: Record<string, unknown>) => asApiRecord(row));
      return reply.send({ data: page, nextCursor: hasMore ? page.at(-1)?.clientId : null });
    });

    app.post(base, async (request, reply) => {
      const ownerId = await getActiveUserId(request, reply);
      if (!ownerId) return;
      const parsed = resource.schema.safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ error: { code: 'VALIDATION_ERROR', details: parsed.error.issues } });
      const data = parsed.data as ResourceBody;
      if (resource.name === 'loan-payments') {
        const payment = data as z.infer<typeof paymentSchema>;
        const loan = await LoanModel.exists({ ownerId, clientId: payment.loanId, deletedAt: { $exists: false } });
        if (!loan) return reply.code(400).send({ error: { code: 'INVALID_LOAN', message: 'Loan was not found for this account.' } });
      }
      if (resource.name === 'entries') {
        const entry = data as z.infer<typeof entrySchema>;
        if (entry.loanPaymentId && !(await LoanPaymentModel.exists({ ownerId, clientId: entry.loanPaymentId, deletedAt: { $exists: false } }))) {
          return reply.code(400).send({ error: { code: 'INVALID_LOAN_PAYMENT', message: 'Loan payment was not found for this account.' } });
        }
      }
      const stableId = data.clientId ?? randomUUID();
      const compareFields = Object.keys(data).filter((key) => key !== 'clientId');
      const comparable = (value: Record<string, unknown>) => JSON.stringify(Object.fromEntries(compareFields.filter((key) => key in value).map((key) => [key, value[key]])));
      const existing = await resource.model.findOne({ ownerId, clientId: stableId }).lean().exec() as Record<string, unknown> | null;
      if (existing) {
        if (existing.deletedAt || comparable(existing) !== comparable({ ...data, clientId: stableId })) {
          return reply.code(409).send({ error: { code: 'CLIENT_ID_CONFLICT', message: 'This client ID is already used by a different or deleted record.', clientId: stableId } });
        }
        return reply.code(200).send({ data: asApiRecord(existing), idempotentReplay: true });
      }
      try {
        const doc = await resource.model.create({ ...data, clientId: stableId, ownerId });
        return reply.code(201).send({ data: asApiRecord(doc.toObject()), idempotentReplay: false });
      } catch (error) {
        if ((error as { code?: number }).code !== 11000) throw error;
        const winner = await resource.model.findOne({ ownerId, clientId: stableId }).lean().exec() as Record<string, unknown> | null;
        if (winner && !winner.deletedAt && comparable(winner) === comparable({ ...data, clientId: stableId })) {
          return reply.code(200).send({ data: asApiRecord(winner), idempotentReplay: true });
        }
        return reply.code(409).send({ error: { code: 'CLIENT_ID_CONFLICT', message: 'This client ID is already used by a different record.', clientId: stableId } });
      }
    });

    app.get(`${base}/:id`, async (request, reply) => {
      const ownerId = await getActiveUserId(request, reply);
      if (!ownerId) return;
      const params = z.object({ id: clientId }).parse(request.params);
      const doc = await resource.model.findOne({ ownerId, clientId: params.id, deletedAt: { $exists: false } }).lean().exec();
      if (!doc) return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Record was not found.' } });
      return reply.send({ data: asApiRecord(doc as Record<string, unknown>) });
    });

    app.patch(`${base}/:id`, async (request, reply) => {
      const ownerId = await getActiveUserId(request, reply);
      if (!ownerId) return;
      const params = z.object({ id: clientId }).parse(request.params);
      const existing = await resource.model.findOne({ ownerId, clientId: params.id, deletedAt: { $exists: false } }).lean().exec();
      if (!existing) return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Record was not found.' } });
      const ifMatch = request.headers['if-match'];
      if (ifMatch && ifMatch !== new Date((existing as Record<string, unknown>).updatedAt as string).toISOString()) {
        return reply.code(409).send({ error: { code: 'VERSION_CONFLICT', message: 'The record changed since you last read it.', serverUpdatedAt: (existing as Record<string, unknown>).updatedAt } });
      }
      const patchResult = resource.patchSchema.safeParse(request.body);
      if (!patchResult.success || !patchResult.data || Object.keys(patchResult.data).length === 0) {
        return reply.code(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Provide valid fields to update.', details: patchResult.success ? undefined : patchResult.error.issues } });
      }
      const fieldNames = Object.keys(resource.fieldsSchema.shape);
      const current = Object.fromEntries(fieldNames.filter((key) => key in existing).map((key) => [key, (existing as Record<string, unknown>)[key]]));
      const merged = { ...current, ...patchResult.data, clientId: params.id };
      const validated = resource.schema.safeParse(merged);
      if (!validated.success) return reply.code(400).send({ error: { code: 'VALIDATION_ERROR', details: validated.error.issues } });
      if (resource.name === 'loan-payments') {
        const payment = validated.data as z.infer<typeof paymentSchema>;
        if (!(await LoanModel.exists({ ownerId, clientId: payment.loanId, deletedAt: { $exists: false } }))) return reply.code(400).send({ error: { code: 'INVALID_LOAN' } });
      }
      if (resource.name === 'entries') {
        const entry = validated.data as z.infer<typeof entrySchema>;
        if (entry.loanPaymentId && !(await LoanPaymentModel.exists({ ownerId, clientId: entry.loanPaymentId, deletedAt: { $exists: false } }))) {
          return reply.code(400).send({ error: { code: 'INVALID_LOAN_PAYMENT', message: 'Loan payment was not found for this account.' } });
        }
      }
      const doc = await resource.model.findOneAndUpdate(
        { ownerId, clientId: params.id, deletedAt: { $exists: false }, ...(ifMatch ? { updatedAt: (existing as Record<string, unknown>).updatedAt } : {}) },
        { $set: patchResult.data }, { new: true, runValidators: true },
      ).lean().exec();
      if (!doc) return reply.code(409).send({ error: { code: 'VERSION_CONFLICT', message: 'The record changed while this update was being applied.' } });
      return reply.send({ data: asApiRecord(doc as Record<string, unknown>) });
    });

    app.delete(`${base}/:id`, async (request, reply) => {
      const ownerId = await getActiveUserId(request, reply);
      if (!ownerId) return;
      const params = z.object({ id: clientId }).parse(request.params);
      if (resource.name === 'loans' && await LoanPaymentModel.exists({ ownerId, loanId: params.id, deletedAt: { $exists: false } })) {
        return reply.code(409).send({ error: { code: 'RECORDS_LINKED', message: 'Delete or unlink this loan’s payments before deleting the loan.' } });
      }
      if (resource.name === 'loan-payments' && await EntryModel.exists({ ownerId, loanPaymentId: params.id, deletedAt: { $exists: false } })) {
        return reply.code(409).send({ error: { code: 'RECORDS_LINKED', message: 'Delete or unlink the linked ledger entry before deleting this payment.' } });
      }
      const doc = await resource.model.findOneAndUpdate(
        { ownerId, clientId: params.id, deletedAt: { $exists: false } },
        { $set: { deletedAt: new Date() } }, { new: true },
      ).lean().exec();
      if (!doc) return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Record was not found.' } });
      return reply.code(204).send();
    });
  }
}
