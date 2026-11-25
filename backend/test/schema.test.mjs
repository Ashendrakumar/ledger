import assert from 'node:assert/strict';
import { test } from 'node:test';
import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';
import {
  EntryModel,
  GoalModel,
  LoanModel,
  LoanPaymentModel,
} from '../dist/models.js';

const ownerId = new Types.ObjectId();

test('financial models accept valid client-owned records', async () => {
  await new EntryModel({
    ownerId, clientId: 'entry-1', kind: 'actual', type: 'expense', amountPaise: 1000,
    category: 'Food', month: '2026-11', date: '2026-11-24',
  }).validate();
  await new GoalModel({
    ownerId, clientId: 'goal-1', name: 'Emergency fund', targetPaise: 100_000,
    savedPaise: 10_000, targetMonth: '2027-12',
  }).validate();
  await new LoanModel({
    ownerId, clientId: 'loan-1', name: 'Home loan', principalPaise: 10_000_000,
    annualRatePct: 8.5, tenureMonths: 240, startMonth: '2026-12', dueDay: 5,
  }).validate();
  await new LoanPaymentModel({
    ownerId, clientId: 'payment-1', loanId: 'loan-1', month: '2026-12',
    amountPaise: 85_000, kind: 'actual', date: '2026-12-05',
  }).validate();
});

test('financial model enums, amounts, and ownership fields are validated', async () => {
  await assert.rejects(new EntryModel({
    ownerId, clientId: 'entry-bad', kind: 'unknown', type: 'expense', amountPaise: -1,
    category: 'Food', month: '2026-11',
  }).validate());
  await assert.rejects(new GoalModel({
    clientId: 'goal-bad', name: 'Invalid goal', targetPaise: 0, savedPaise: 0, targetMonth: '2027-01',
  }).validate());
  await assert.rejects(new LoanModel({
    ownerId, clientId: 'loan-bad', name: 'Invalid loan', principalPaise: 1000,
    annualRatePct: 8, tenureMonths: 0, startMonth: '2026-12',
  }).validate());
  await assert.rejects(new LoanPaymentModel({
    ownerId, clientId: 'payment-bad', loanId: 'loan-1', month: '2026-12',
    amountPaise: -1, kind: 'unknown',
  }).validate());
});

test('access JWT verification accepts only correctly signed unexpired tokens with a subject', async () => {
  process.env.NODE_ENV = 'test';
  process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/ledger-test';
  process.env.JWT_ACCESS_SECRET = 'unit-test-access-secret-long-enough-32';
  process.env.OTP_PEPPER = 'unit-test-otp-pepper-long-enough-32!!';
  const { verifyAccessToken } = await import('../dist/auth.js');
  const valid = jwt.sign({ sub: ownerId.toString() }, process.env.JWT_ACCESS_SECRET, { expiresIn: '5m' });
  const wrongKey = jwt.sign({ sub: ownerId.toString() }, 'a-different-test-secret-long-enough');
  const expired = jwt.sign({ sub: ownerId.toString() }, process.env.JWT_ACCESS_SECRET, { expiresIn: -1 });
  const missingSubject = jwt.sign({ role: 'user' }, process.env.JWT_ACCESS_SECRET);

  assert.equal(verifyAccessToken(valid), ownerId.toString());
  assert.equal(verifyAccessToken(wrongKey), null);
  assert.equal(verifyAccessToken(expired), null);
  assert.equal(verifyAccessToken(missingSubject), null);
  assert.equal(verifyAccessToken('not-a-jwt'), null);
});
