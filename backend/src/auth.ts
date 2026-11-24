import { createHash, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import jwt, { type JwtPayload } from 'jsonwebtoken';
import { Types } from 'mongoose';
import { config } from './config.js';
import { AuthChallengeModel, RefreshSessionModel, UserModel } from './models.js';

const digest = (value: string) => createHash('sha256').update(value).digest('hex');
const otpDigest = (email: string, code: string) => digest(`${email}:${code}:${config.OTP_PEPPER}`);
const same = (a: string, b: string) => {
  const aa = Buffer.from(a); const bb = Buffer.from(b);
  return aa.length === bb.length && timingSafeEqual(aa, bb);
};
const normalizeEmail = (email: string) => email.trim().toLowerCase();

export async function sendEmailCode(emailInput: string) {
  const email = normalizeEmail(emailInput);
  const recent = await AuthChallengeModel.findOne({ email, createdAt: { $gt: new Date(Date.now() - config.OTP_RESEND_SECONDS * 1000) } });
  if (recent) return { debugCode: undefined };

  const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
  await AuthChallengeModel.updateMany({ email, consumedAt: null }, { $set: { consumedAt: new Date() } });
  await AuthChallengeModel.create({ email, codeHash: otpDigest(email, code), expiresAt: new Date(Date.now() + config.OTP_TTL_MINUTES * 60_000), attempts: 0 });

  // This transport is intentionally development-only; replace with a mail provider before production.
  if (config.NODE_ENV === 'production') throw new Error('Email provider is not implemented');
  console.info(`[dev-mail] sign-in code for ${email}: ${code}`);
  return { debugCode: config.NODE_ENV === 'test' ? code : undefined };
}

async function issueTokens(userId: Types.ObjectId, familyId = randomBytes(16).toString('hex')) {
  const accessToken = jwt.sign({ sub: userId.toString() }, config.JWT_ACCESS_SECRET, { expiresIn: config.ACCESS_TOKEN_TTL as `${number}${'s' | 'm' | 'h' | 'd'}` });
  const refreshToken = randomBytes(48).toString('base64url');
  const tokenHash = digest(refreshToken);
  await RefreshSessionModel.create({ userId, tokenHash, familyId, expiresAt: new Date(Date.now() + config.REFRESH_TOKEN_DAYS * 86_400_000) });
  return { accessToken, refreshToken, tokenType: 'Bearer', expiresIn: config.ACCESS_TOKEN_TTL };
}

export async function verifyEmailCode(emailInput: string, code: string) {
  const email = normalizeEmail(emailInput);
  const challenge = await AuthChallengeModel.findOne({ email, consumedAt: null }).sort({ createdAt: -1 });
  if (!challenge || challenge.expiresAt.getTime() <= Date.now() || challenge.attempts >= config.OTP_MAX_ATTEMPTS) return null;
  const valid = same(challenge.codeHash, otpDigest(email, code));
  if (!valid) {
    challenge.attempts += 1;
    await challenge.save();
    return null;
  }
  challenge.consumedAt = new Date();
  await challenge.save();
  const user = await UserModel.findOneAndUpdate(
    { email },
    { $setOnInsert: { email, emailVerifiedAt: new Date(), status: 'active' } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  return { user: { id: user.id, email: user.email, name: user.displayName ?? undefined, setupCompleted: Boolean(user.setupCompletedAt) }, tokens: await issueTokens(user._id) };
}

export async function rotateRefreshToken(rawToken: string) {
  const hash = digest(rawToken);
  const session = await RefreshSessionModel.findOne({ tokenHash: hash });
  if (!session) return null;
  if (session.revokedAt || session.expiresAt.getTime() <= Date.now()) {
    if (session.revokedAt) await RefreshSessionModel.updateMany({ familyId: session.familyId }, { $set: { revokedAt: new Date() } });
    return null;
  }
  const user = await UserModel.findById(session.userId);
  if (!user || user.status !== 'active') return null;
  const claimed = await RefreshSessionModel.findOneAndUpdate(
    { _id: session._id, revokedAt: null, expiresAt: { $gt: new Date() } },
    { $set: { revokedAt: new Date() } }, { new: true },
  );
  if (!claimed) return null;
  const tokens = await issueTokens(session.userId, session.familyId);
  await RefreshSessionModel.updateOne({ _id: session._id }, { $set: { replacedByHash: digest(tokens.refreshToken) } });
  return { user: { id: user.id, email: user.email, name: user.displayName ?? undefined, setupCompleted: Boolean(user.setupCompletedAt) }, tokens };
}

export async function revokeRefreshToken(rawToken: string) {
  await RefreshSessionModel.updateOne({ tokenHash: digest(rawToken), revokedAt: null }, { $set: { revokedAt: new Date() } });
}

export function verifyAccessToken(rawToken: string): string | null {
  try {
    const payload = jwt.verify(rawToken, config.JWT_ACCESS_SECRET) as JwtPayload;
    return typeof payload.sub === 'string' ? payload.sub : null;
  } catch { return null; }
}
