import { Schema, model, type InferSchemaType } from 'mongoose';

const userSchema = new Schema({
  email: { type: String, required: true, unique: true, index: true },
  emailVerifiedAt: { type: Date, required: true },
  displayName: { type: String, maxlength: 80 },
  setupCompletedAt: Date,
  status: { type: String, enum: ['active', 'deletion_pending', 'deleted'], default: 'active', required: true },
}, { timestamps: true });

const challengeSchema = new Schema({
  email: { type: String, required: true, index: true },
  codeHash: { type: String, required: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
  attempts: { type: Number, default: 0, required: true },
  consumedAt: Date,
  createdAt: { type: Date, default: Date.now, required: true },
});
challengeSchema.index({ email: 1, createdAt: -1 });

const sessionSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  tokenHash: { type: String, required: true, unique: true },
  familyId: { type: String, required: true, index: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
  revokedAt: Date,
  replacedByHash: String,
}, { timestamps: true });

const ownedBase = {
  ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  clientId: { type: String, required: true },
  deletedAt: Date,
};
const entrySchema = new Schema({
  ...ownedBase,
  kind: { type: String, enum: ['actual', 'planned'], required: true },
  type: { type: String, enum: ['expense', 'income', 'saving'], required: true },
  amountPaise: { type: Number, required: true, min: 0 },
  category: { type: String, required: true, maxlength: 80 },
  month: { type: String, required: true },
  date: String,
  note: { type: String, maxlength: 500 },
  loanPaymentId: String,
}, { timestamps: true, versionKey: false });
entrySchema.index({ ownerId: 1, clientId: 1 }, { unique: true });
entrySchema.index({ ownerId: 1, month: 1, kind: 1, type: 1, deletedAt: 1 });
entrySchema.index({ ownerId: 1, updatedAt: 1 });

const goalSchema = new Schema({
  ...ownedBase,
  name: { type: String, required: true, maxlength: 80 },
  targetPaise: { type: Number, required: true, min: 1 },
  savedPaise: { type: Number, required: true, min: 0 },
  targetMonth: { type: String, required: true },
}, { timestamps: true, versionKey: false });
goalSchema.index({ ownerId: 1, clientId: 1 }, { unique: true });
goalSchema.index({ ownerId: 1, updatedAt: 1 });

const loanSchema = new Schema({
  ...ownedBase,
  name: { type: String, required: true, maxlength: 80 },
  principalPaise: { type: Number, required: true, min: 1 },
  annualRatePct: { type: Number, required: true, min: 0, max: 100 },
  tenureMonths: { type: Number, required: true, min: 1, max: 480 },
  startMonth: { type: String, required: true },
  dueDay: { type: Number, min: 1, max: 31, default: 5 },
  trackExpenses: { type: Boolean, default: false },
}, { timestamps: true, versionKey: false });
loanSchema.index({ ownerId: 1, clientId: 1 }, { unique: true });
loanSchema.index({ ownerId: 1, updatedAt: 1 });

const loanPaymentSchema = new Schema({
  ...ownedBase,
  loanId: { type: String, required: true },
  month: { type: String, required: true },
  amountPaise: { type: Number, required: true, min: 0 },
  kind: { type: String, enum: ['actual', 'planned', 'prepayment'], required: true },
  date: String,
  note: { type: String, maxlength: 500 },
}, { timestamps: true, versionKey: false });
loanPaymentSchema.index({ ownerId: 1, clientId: 1 }, { unique: true });
loanPaymentSchema.index({ ownerId: 1, loanId: 1, month: 1, kind: 1, deletedAt: 1 });
loanPaymentSchema.index({ ownerId: 1, updatedAt: 1 });

const authRateLimitSchema = new Schema({
  key: { type: String, required: true },
  windowStart: { type: Date, required: true },
  count: { type: Number, required: true, default: 0 },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
}, { versionKey: false });
authRateLimitSchema.index({ key: 1, windowStart: 1 }, { unique: true });

const auditEventSchema = new Schema({
  actorId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  action: { type: String, required: true, maxlength: 80 },
  requestId: { type: String, required: true, maxlength: 100 },
  occurredAt: { type: Date, required: true, default: Date.now, index: true },
}, { versionKey: false });
auditEventSchema.index({ actorId: 1, occurredAt: -1 });

export type UserRecord = InferSchemaType<typeof userSchema>;
export const UserModel = model('User', userSchema);
export const AuthChallengeModel = model('AuthChallenge', challengeSchema);
export const RefreshSessionModel = model('RefreshSession', sessionSchema);
export const EntryModel = model('Entry', entrySchema);
export const GoalModel = model('Goal', goalSchema);
export const LoanModel = model('Loan', loanSchema);
export const LoanPaymentModel = model('LoanPayment', loanPaymentSchema);
export const AuthRateLimitModel = model('AuthRateLimit', authRateLimitSchema);
export const AuditEventModel = model('AuditEvent', auditEventSchema);
