import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Entry, Goal, Loan, LoanPayment } from '@/types';
import { deleteAccountData as deleteFirebaseAccountData, fetchAccountData, recordsRef, removeRecord, saveRecord, type DomainRecord, type Resource } from './firebaseData';
import { getDocs, onSnapshot } from 'firebase/firestore';
import { useEntries } from '@/store/entries';
import { useGoals } from '@/store/goals';
import { useLoans } from '@/store/loans';

type Snapshot = { entries: Entry[]; goals: Goal[]; loans: Loan[]; payments: LoanPayment[] };
type Change = { opId: string; resource: Resource; id: string; deleted: boolean; data?: DomainRecord };

const ownerKey = 'ledger.domain-owner';
const outboxKey = (uid: string) => `ledger.firestore-outbox.${uid}`;
const cacheKey = (uid: string) => `ledger.domain-cache.${uid}`;
const bootstrappedKey = (uid: string) => `ledger.firestore-bootstrapped.${uid}`;
const claimLocalKey = 'ledger.firestore-claim-local-once';
const emptySnapshot = (): Snapshot => ({ entries: [], goals: [], loans: [], payments: [] });

let generation = 0;
let activeUserId: string | null = null;
let suppressStoreEvents = false;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let activeCleanup: (() => void) | null = null;
let retryCount = 0;

function currentSnapshot(): Snapshot {
  return {
    entries: useEntries.getState().entries,
    goals: useGoals.getState().goals,
    loans: useLoans.getState().loans,
    payments: useLoans.getState().payments,
  };
}

function recordsFor(snapshot: Snapshot): Record<Resource, DomainRecord[]> {
  return { entries: snapshot.entries, goals: snapshot.goals, loans: snapshot.loans, 'loan-payments': snapshot.payments };
}

function applySnapshot(snapshot: Snapshot) {
  suppressStoreEvents = true;
  try {
    useEntries.setState({ entries: snapshot.entries });
    useGoals.setState({ goals: snapshot.goals });
    useLoans.setState({ loans: snapshot.loans, payments: snapshot.payments });
  } finally {
    suppressStoreEvents = false;
  }
}

async function persistSnapshot(snapshot: Snapshot) {
  await AsyncStorage.multiSet([
    ['ledger.entries', JSON.stringify({ state: { entries: snapshot.entries }, version: 1 })],
    ['ledger.goals', JSON.stringify({ state: { goals: snapshot.goals }, version: 1 })],
    ['ledger.loans', JSON.stringify({ state: { loans: snapshot.loans, payments: snapshot.payments }, version: 2 })],
  ]);
}

async function waitForStoreHydration() {
  const stores = [useEntries, useGoals, useLoans];
  await Promise.all(stores.map((store) => new Promise<void>((resolve) => {
    if (store.persist.hasHydrated()) return resolve();
    const unsubscribe = store.persist.onFinishHydration(() => { unsubscribe(); resolve(); });
  })));
}

async function activateAccount(uid: string) {
  const previousUid = await AsyncStorage.getItem(ownerKey);
  if (previousUid === uid) return;
  const current = currentSnapshot();
  if (previousUid) await AsyncStorage.setItem(cacheKey(previousUid), JSON.stringify(current));
  const stored = await AsyncStorage.getItem(cacheKey(uid));
  const claimLocal = await AsyncStorage.getItem(claimLocalKey) === uid;
  const next = stored ? JSON.parse(stored) as Snapshot : previousUid && !claimLocal ? emptySnapshot() : current;
  applySnapshot(next);
  await persistSnapshot(next);
  await AsyncStorage.setItem(ownerKey, uid);
}

async function readOutbox(uid: string): Promise<Change[]> {
  const raw = await AsyncStorage.getItem(outboxKey(uid));
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed as Change[] : [];
  } catch {
    return [];
  }
}

let outboxWrite = Promise.resolve();
async function enqueue(uid: string, resource: Resource, record: DomainRecord, deleted = false) {
  const id = record.id;
  const change: Change = { opId: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`, resource, id, deleted, ...(deleted ? {} : { data: record }) };
  outboxWrite = outboxWrite.catch(() => {}).then(async () => {
    const pending = await readOutbox(uid);
    const remaining = pending.filter((item) => !(item.resource === resource && item.id === id));
    remaining.push(change);
    await AsyncStorage.setItem(outboxKey(uid), JSON.stringify(remaining));
  });
  await outboxWrite;
}

async function flushOutbox(uid: string) {
  for (const change of await readOutbox(uid)) {
    if (activeUserId !== uid) return;
    if (change.deleted) await removeRecord(uid, change.resource, change.id);
    else if (change.data) await saveRecord(uid, change.resource, change.data);
    const remaining = (await readOutbox(uid)).filter((item) => item.opId !== change.opId);
    await AsyncStorage.setItem(outboxKey(uid), JSON.stringify(remaining));
  }
}

function scheduleRetry(uid: string) {
  if (retryTimer || activeUserId !== uid) return;
  const delay = Math.min(60_000, 1_000 * 2 ** Math.min(retryCount, 6));
  retryCount += 1;
  retryTimer = setTimeout(() => {
    retryTimer = null;
    void flushOutbox(uid).then(() => { retryCount = 0; }).catch(() => scheduleRetry(uid));
  }, delay);
}

async function seedOrLoadCloudData(uid: string, shouldSeedLocal: boolean) {
  const cloud = await fetchAccountData(uid);
  const cloudCount = cloud.entries.length + cloud.goals.length + cloud.loans.length + cloud.payments.length;
  if (cloudCount === 0 && shouldSeedLocal) {
    for (const [resource, records] of Object.entries(recordsFor(currentSnapshot())) as [Resource, DomainRecord[]][]) {
      for (const record of records) await saveRecord(uid, resource, record);
    }
    await AsyncStorage.setItem(bootstrappedKey(uid), '1');
    await AsyncStorage.removeItem(claimLocalKey);
    return;
  }
  if (cloudCount > 0) {
    applySnapshot({ entries: cloud.entries, goals: cloud.goals, loans: cloud.loans, payments: cloud.payments });
    await persistSnapshot(currentSnapshot());
  }
  await AsyncStorage.setItem(bootstrappedKey(uid), '1');
  await AsyncStorage.removeItem(claimLocalKey);
}

function observeStore<T extends { id: string }, State>(
  resource: Resource,
  select: (state: State) => T[],
  subscribe: (listener: (state: State, previous: State) => void) => () => void,
) {
  return subscribe((state, previous) => {
    if (suppressStoreEvents || !activeUserId) return;
    const current = select(state);
    const oldRows = select(previous);
    const oldById = new Map(oldRows.map((item) => [item.id, item]));
    const currentById = new Map(current.map((item) => [item.id, item]));
    for (const item of current) {
      if (JSON.stringify(oldById.get(item.id)) !== JSON.stringify(item)) {
        const uid = activeUserId;
        void enqueue(uid, resource, item as unknown as DomainRecord).then(() => flushOutbox(uid)).catch(() => scheduleRetry(uid));
      }
    }
    for (const item of oldRows) {
      if (!currentById.has(item.id)) {
        const uid = activeUserId;
        void enqueue(uid, resource, item as unknown as DomainRecord, true).then(() => flushOutbox(uid)).catch(() => scheduleRetry(uid));
      }
    }
  });
}

export async function startDataSync(uid: string): Promise<() => void> {
  activeCleanup?.();
  activeCleanup = null;
  const myGeneration = ++generation;
  if (retryTimer) clearTimeout(retryTimer);
  retryTimer = null;
  activeUserId = null;
  await waitForStoreHydration();
  if (generation !== myGeneration) return () => {};
  const currentOwner = await AsyncStorage.getItem(ownerKey);
  // Only migrate a local ledger when the user had this account already, or
  // when the auth store marked a matching legacy email during sign-in.
  // Fresh installations must not upload the app's sample ledger as real data.
  const shouldSeedLocal = currentOwner === uid || await AsyncStorage.getItem(claimLocalKey) === uid;
  await activateAccount(uid);
  if (generation !== myGeneration) return () => {};
  activeUserId = uid;

  try {
    if (await AsyncStorage.getItem(bootstrappedKey(uid)) !== '1') await seedOrLoadCloudData(uid, shouldSeedLocal);
    await flushOutbox(uid);
    retryCount = 0;
  } catch {
    scheduleRetry(uid);
  }

  const applyRemote = async (resource: Resource, docs: { id: string; data: () => Record<string, unknown> }[]) => {
    if (generation !== myGeneration || activeUserId !== uid) return;
    const cloudRecords = docs.map((snapshot) => ({ ...snapshot.data(), id: snapshot.id })) as DomainRecord[];
    const current = currentSnapshot();
    const pending = await readOutbox(uid);
    const pendingForResource = new Set(pending.filter((item) => item.resource === resource).map((item) => item.id));
    const localRecords = recordsFor(current)[resource];
    const merged = new Map(cloudRecords.map((record) => [record.id, record]));
    for (const change of pending.filter((item) => item.resource === resource)) {
      if (change.deleted) merged.delete(change.id);
      else if (change.data) merged.set(change.id, change.data);
    }
    // Retain any local records with queued writes until Firestore acknowledges them.
    for (const local of localRecords) if (pendingForResource.has(local.id)) merged.set(local.id, local);
    const next = [...merged.values()];
    if (resource === 'entries') current.entries = next as Entry[];
    if (resource === 'goals') current.goals = next as Goal[];
    if (resource === 'loans') current.loans = next as Loan[];
    if (resource === 'loan-payments') current.payments = next as LoanPayment[];
    applySnapshot(current);
    await persistSnapshot(current);
  };

  const unsubs = (['entries', 'goals', 'loans', 'loan-payments'] as Resource[]).map((resource) =>
    onSnapshot(recordsRef(uid, resource), (snapshot) => {
      void applyRemote(resource, snapshot.docs).catch(() => {});
    }, () => scheduleRetry(uid)),
  );
  const localSubs = [
    observeStore('entries', (state: { entries: Entry[] }) => state.entries, useEntries.subscribe),
    observeStore('goals', (state: { goals: Goal[] }) => state.goals, useGoals.subscribe),
    observeStore('loans', (state: { loans: Loan[] }) => state.loans, useLoans.subscribe),
    observeStore('loan-payments', (state: { payments: LoanPayment[] }) => state.payments, useLoans.subscribe),
  ];

  const cleanup = () => {
    if (generation !== myGeneration) return;
    ++generation;
    activeUserId = null;
    unsubs.forEach((unsubscribe) => unsubscribe());
    localSubs.forEach((unsubscribe) => unsubscribe());
    if (retryTimer) clearTimeout(retryTimer);
    retryTimer = null;
    if (activeCleanup === cleanup) activeCleanup = null;
  };
  activeCleanup = cleanup;
  return cleanup;
}

export function stopDataSync() {
  activeCleanup?.();
}

export async function clearAccountDataCache(uid: string) {
  await AsyncStorage.multiRemove([outboxKey(uid), cacheKey(uid), bootstrappedKey(uid)]);
  if (await AsyncStorage.getItem(ownerKey) === uid) await AsyncStorage.removeItem(ownerKey);
}

export async function exportAccountData(uid: string) {
  return fetchAccountData(uid);
}

export async function deleteAccountData(uid: string) {
  await deleteFirebaseAccountData(uid);
}
