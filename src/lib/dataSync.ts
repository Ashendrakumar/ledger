import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Entry, Goal, Loan, LoanPayment } from '@/types';
import { authenticatedRequest, ApiError } from './api';
import { useEntries } from '@/store/entries';
import { useGoals } from '@/store/goals';
import { useLoans } from '@/store/loans';

type Resource = 'entries' | 'goals' | 'loans' | 'loan-payments';
type DomainRecord = Entry | Goal | Loan | LoanPayment;
type Snapshot = { entries: Entry[]; goals: Goal[]; loans: Loan[]; payments: LoanPayment[] };
type Change = {
  opId: string;
  resource: Resource;
  id: string;
  deleted: boolean;
  queuedAt: string;
  data?: Record<string, unknown>;
};
type RemoteRecord = Record<string, unknown> & { id?: string; clientId?: string; updatedAt?: string; deletedAt?: string };
type CollectionPage<T> = { data: T[]; nextCursor: string | null };
type BootstrapResponse = {
  resources: {
    entries: CollectionPage<RemoteRecord>;
    goals: CollectionPage<RemoteRecord>;
    loans: CollectionPage<RemoteRecord>;
    'loan-payments': CollectionPage<RemoteRecord>;
  };
};

const ownerKey = 'ledger.domain-owner';
const outboxKey = (userId: string) => `ledger.sync-outbox.${userId}`;
const cacheKey = (userId: string) => `ledger.domain-cache.${userId}`;
const cursorKey = (userId: string) => `ledger.sync-cursor.${userId}`;
const bootstrapKey = (userId: string) => `ledger.sync-bootstrapped.${userId}`;
const emptySnapshot = (): Snapshot => ({ entries: [], goals: [], loans: [], payments: [] });

let generation = 0;
let activeUserId: string | null = null;
const accountControllers = new Map<string, AbortController>();
let suppressStoreEvents = false;
let cycleInFlight: Promise<void> | null = null;
let cycleInFlightUserId: string | null = null;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let activeCleanup: (() => void) | null = null;
let retryCount = 0;

function makeOpId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function currentSnapshot(): Snapshot {
  return {
    entries: useEntries.getState().entries,
    goals: useGoals.getState().goals,
    loans: useLoans.getState().loans,
    payments: useLoans.getState().payments,
  };
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
    if (store.persist.hasHydrated()) {
      resolve();
      return;
    }
    const unsubscribe = store.persist.onFinishHydration(() => {
      unsubscribe();
      resolve();
    });
  })));
}

async function activateAccount(userId: string): Promise<boolean> {
  const previousUserId = await AsyncStorage.getItem(ownerKey);
  if (previousUserId === userId) return false;
  const current = currentSnapshot();
  if (previousUserId) await AsyncStorage.setItem(cacheKey(previousUserId), JSON.stringify(current));
  const stored = previousUserId ? await AsyncStorage.getItem(cacheKey(userId)) : null;
  const next = stored ? JSON.parse(stored) as Snapshot : previousUserId ? emptySnapshot() : current;
  applySnapshot(next);
  await persistSnapshot(next);
  await AsyncStorage.setItem(ownerKey, userId);
  // Only the first authenticated account adopts the pre-existing local-only ledger.
  return previousUserId === null;
}

function payloadFor(resource: Resource, record: DomainRecord): Record<string, unknown> {
  const { id, ...fields } = record;
  if (resource === 'loans') {
    const { emiPaise: _derivedEmi, ...loanFields } = fields as Loan;
    return { ...loanFields, clientId: id };
  }
  return { ...fields, clientId: id };
}

async function readOutbox(userId: string): Promise<Change[]> {
  const raw = await AsyncStorage.getItem(outboxKey(userId));
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed as Change[] : [];
  } catch {
    return [];
  }
}

let outboxWrite = Promise.resolve();
async function enqueue(userId: string, resource: Resource, record: DomainRecord, deleted = false) {
  const id = record.id;
  const data = deleted ? undefined : payloadFor(resource, record);
  const next: Change = { opId: makeOpId(), resource, id, deleted, queuedAt: new Date().toISOString(), ...(data ? { data } : {}) };
  outboxWrite = outboxWrite.catch(() => {}).then(async () => {
    const changes = await readOutbox(userId);
    const remaining = changes.filter((change) => !(change.resource === resource && change.id === id));
    remaining.push(next);
    await AsyncStorage.setItem(outboxKey(userId), JSON.stringify(remaining));
  });
  await outboxWrite;
}

function orderChange(a: Change, b: Change) {
  if (a.deleted !== b.deleted) return a.deleted ? -1 : 1;
  const order: Resource[] = a.deleted
    ? ['entries', 'loan-payments', 'loans', 'goals']
    : ['loans', 'goals', 'loan-payments', 'entries'];
  return order.indexOf(a.resource) - order.indexOf(b.resource);
}

function withoutServerFields(record: RemoteRecord, resource: Resource): DomainRecord {
  const { id: remoteId, clientId, createdAt: _created, updatedAt: _updated, deletedAt: _deleted, ownerId: _owner, __v: _version, ...fields } = record;
  const id = String(remoteId ?? clientId ?? '');
  if (resource === 'entries') return { ...fields, id } as unknown as Entry;
  if (resource === 'goals') return { ...fields, id } as unknown as Goal;
  if (resource === 'loans') return { ...fields, id } as unknown as Loan;
  return { ...fields, id } as unknown as LoanPayment;
}

async function applyOneRemote(resource: Resource, record: RemoteRecord, deleted = false) {
  const id = String(record.id ?? record.clientId ?? '');
  if (!id) return;
  const snapshot = currentSnapshot();
  if (resource === 'entries') snapshot.entries = deleted ? snapshot.entries.filter((x) => x.id !== id) : replaceById(snapshot.entries, withoutServerFields(record, resource) as Entry);
  if (resource === 'goals') snapshot.goals = deleted ? snapshot.goals.filter((x) => x.id !== id) : replaceById(snapshot.goals, withoutServerFields(record, resource) as Goal);
  if (resource === 'loans') snapshot.loans = deleted ? snapshot.loans.filter((x) => x.id !== id) : replaceById(snapshot.loans, withoutServerFields(record, resource) as Loan);
  if (resource === 'loan-payments') snapshot.payments = deleted ? snapshot.payments.filter((x) => x.id !== id) : replaceById(snapshot.payments, withoutServerFields(record, resource) as LoanPayment);
  applySnapshot(snapshot);
  await persistSnapshot(snapshot);
}

function replaceById<T extends { id: string }>(rows: T[], value: T): T[] {
  const index = rows.findIndex((row) => row.id === value.id);
  if (index < 0) return [...rows, value];
  const next = [...rows];
  next[index] = value;
  return next;
}

async function acknowledgeChange(userId: string, change: Change) {
  const changes = await readOutbox(userId);
  const remaining = changes.filter((item) => item.opId !== change.opId);
  await AsyncStorage.setItem(outboxKey(userId), JSON.stringify(remaining));
}

function syncRequest<T>(userId: string, path: string, options: RequestInit = {}) {
  return authenticatedRequest<T>(path, { ...options, signal: accountControllers.get(userId)?.signal });
}

async function syncChange(userId: string, change: Change) {
  const base = `/${change.resource}/${encodeURIComponent(change.id)}`;
  if (change.deleted) {
    try {
      await syncRequest<void>(userId, base, { method: 'DELETE' });
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 404) throw error;
    }
    return;
  }
  try {
    await syncRequest(userId, `/${change.resource}`, { method: 'POST', body: JSON.stringify(change.data) });
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 409 || error.code !== 'CLIENT_ID_CONFLICT') throw error;
    const response = await syncRequest<{ data: RemoteRecord }>(userId, base);
    const remote = response.data;
    const remoteUpdatedAt = remote.updatedAt;
    if (!remoteUpdatedAt || new Date(remoteUpdatedAt).getTime() > new Date(change.queuedAt).getTime()) {
      await applyOneRemote(change.resource, remote);
      return;
    }
    const { clientId: _clientId, ...fields } = change.data ?? {};
    await syncRequest(userId, base, {
      method: 'PATCH',
      headers: { 'If-Match': new Date(remoteUpdatedAt).toISOString() },
      body: JSON.stringify(fields),
    });
  }
}

async function flushOutbox(userId: string) {
  const changes = (await readOutbox(userId)).sort(orderChange);
  for (const change of changes) {
    await syncChange(userId, change);
    await acknowledgeChange(userId, change);
  }
}

async function fetchBootstrap(userId: string) {
  const cursors: Record<Resource, string | null> = { entries: null, goals: null, loans: null, 'loan-payments': null };
  const completed = new Set<Resource>();
  const records: Record<Resource, RemoteRecord[]> = { entries: [], goals: [], loans: [], 'loan-payments': [] };
  while (completed.size < 4) {
    const params = new URLSearchParams({ limit: '100' });
    const cursorParams: Record<Resource, string> = {
      entries: 'entriesCursor', goals: 'goalsCursor', loans: 'loansCursor', 'loan-payments': 'loanPaymentsCursor',
    };
    for (const resource of Object.keys(cursorParams) as Resource[]) {
      if (cursors[resource]) params.set(cursorParams[resource], cursors[resource]!);
    }
    const response = await syncRequest<BootstrapResponse>(userId, `/sync/bootstrap?${params.toString()}`);
    for (const resource of Object.keys(cursorParams) as Resource[]) {
      if (completed.has(resource)) continue;
      const page = response.resources[resource];
      records[resource].push(...page.data);
      cursors[resource] = page.nextCursor;
      if (!page.nextCursor) completed.add(resource);
    }
  }
  return records;
}

function localRecords(snapshot: Snapshot): Record<Resource, DomainRecord[]> {
  return { entries: snapshot.entries, goals: snapshot.goals, loans: snapshot.loans, 'loan-payments': snapshot.payments };
}

async function applyBootstrap(userId: string, records: Record<Resource, RemoteRecord[]>) {
  const pending = await readOutbox(userId);
  const snapshot = currentSnapshot();
  const localByResource = localRecords(snapshot);
  for (const resource of Object.keys(records) as Resource[]) {
    const currentById = new Map(localByResource[resource].map((record) => [record.id, record]));
    const pendingForResource = pending.filter((item) => item.resource === resource);
    const pendingIds = new Set(pendingForResource.map((item) => item.id));
    const next = new Map<string, DomainRecord>();
    for (const record of records[resource]) {
      const value = withoutServerFields(record, resource);
      if (!pendingIds.has(value.id)) next.set(value.id, value);
    }
    for (const item of pendingForResource) {
      if (item.deleted) next.delete(item.id);
      else {
        const current = currentById.get(item.id);
        if (current) next.set(item.id, current);
      }
    }
    const values = [...next.values()];
    if (resource === 'entries') snapshot.entries = values as Entry[];
    if (resource === 'goals') snapshot.goals = values as Goal[];
    if (resource === 'loans') snapshot.loans = values as Loan[];
    if (resource === 'loan-payments') snapshot.payments = values as LoanPayment[];
  }
  applySnapshot(snapshot);
  await persistSnapshot(snapshot);
}

async function applyDelta(userId: string) {
  let cursor = await AsyncStorage.getItem(cursorKey(userId));
  let hasMore = true;
  while (hasMore) {
    const params = new URLSearchParams({ limit: '100' });
    if (cursor) params.set('cursor', cursor);
    const response = await syncRequest<{ changes: { resource: Resource; deleted: boolean; data: RemoteRecord }[]; nextCursor: string; hasMore: boolean }>(userId, `/sync/changes?${params.toString()}`);
    const pending = await readOutbox(userId);
    const pendingKeys = new Set(pending.map((item) => `${item.resource}:${item.id}`));
    for (const change of response.changes) {
      const id = String(change.data.id ?? change.data.clientId ?? '');
      if (!pendingKeys.has(`${change.resource}:${id}`)) await applyOneRemote(change.resource, change.data, change.deleted);
    }
    await persistSnapshot(currentSnapshot());
    cursor = response.nextCursor;
    if (cursor) await AsyncStorage.setItem(cursorKey(userId), cursor);
    hasMore = response.hasMore;
  }
}

function scheduleRetry(userId: string) {
  if (retryTimer || activeUserId !== userId || accountControllers.get(userId)?.signal.aborted) return;
  const delay = Math.min(60_000, 1_000 * 2 ** Math.min(retryCount, 6));
  retryCount += 1;
  retryTimer = setTimeout(() => {
    retryTimer = null;
    if (activeUserId === userId) void runSyncCycle(userId);
  }, delay);
}

function runSyncCycle(userId: string): Promise<void> {
  if (cycleInFlight) {
    if (cycleInFlightUserId === userId) return cycleInFlight;
    return cycleInFlight.catch(() => {}).then(() => runSyncCycle(userId));
  }
  if (activeUserId !== userId) return Promise.resolve();
  cycleInFlightUserId = userId;
  cycleInFlight = (async () => {
    try {
      await flushOutbox(userId);
      const didBootstrap = await AsyncStorage.getItem(bootstrapKey(userId));
      if (!didBootstrap) {
        const records = await fetchBootstrap(userId);
        await applyBootstrap(userId, records);
        await AsyncStorage.setItem(bootstrapKey(userId), '1');
      }
      await applyDelta(userId);
      retryCount = 0;
    } catch {
      // Preserve local edits and their outbox entries. Retry with capped backoff.
      scheduleRetry(userId);
    }
  })().finally(() => { cycleInFlight = null; cycleInFlightUserId = null; });
  return cycleInFlight;
}

function observeStore<S, T extends { id: string }>(resource: Resource, select: (state: S) => T[], subscribe: (listener: (state: S, previous: S) => void) => () => void) {
  return subscribe((state, previous) => {
    if (suppressStoreEvents || !activeUserId) return;
    const current = select(state);
    const previousRows = select(previous);
    const oldById = new Map(previousRows.map((item) => [item.id, item]));
    const currentById = new Map(current.map((item) => [item.id, item]));
    for (const item of current) {
      if (JSON.stringify(oldById.get(item.id)) !== JSON.stringify(item)) {
        const ownerId = activeUserId;
        if (ownerId) void enqueue(ownerId, resource, item as unknown as DomainRecord).then(() => runSyncCycle(ownerId));
      }
    }
    for (const item of previousRows) {
      if (!currentById.has(item.id)) {
        const ownerId = activeUserId;
        if (ownerId) void enqueue(ownerId, resource, item as unknown as DomainRecord, true).then(() => runSyncCycle(ownerId));
      }
    }
  });
}

export async function startDataSync(userId: string): Promise<() => void> {
  activeCleanup?.();
  activeCleanup = null;
  const myGeneration = ++generation;
  if (retryTimer) clearTimeout(retryTimer);
  retryTimer = null;
  activeUserId = null;
  await waitForStoreHydration();
  if (generation !== myGeneration) return () => {};
  const shouldMigrate = await activateAccount(userId);
  if (generation !== myGeneration) return () => {};
  activeUserId = userId;
  const controller = new AbortController();
  accountControllers.set(userId, controller);
  const unsubscribers = [
    observeStore('entries', (state) => state.entries, useEntries.subscribe),
    observeStore('goals', (state) => state.goals, useGoals.subscribe),
    observeStore('loans', (state) => state.loans, useLoans.subscribe),
    observeStore('loan-payments', (state) => state.payments, useLoans.subscribe),
  ];
  if (shouldMigrate) {
    void (async () => {
      const snapshot = currentSnapshot();
      for (const [resource, items] of Object.entries(localRecords(snapshot)) as [Resource, DomainRecord[]][]) {
        if (generation !== myGeneration) return;
        for (const item of items) await enqueue(userId, resource, item);
      }
      if (generation === myGeneration) await runSyncCycle(userId);
    })().catch(() => scheduleRetry(userId));
  } else {
    void runSyncCycle(userId);
  }
  const timer = setInterval(() => {
    if (activeUserId === userId) void runSyncCycle(userId);
  }, 60_000);
  const cleanup = () => {
    if (generation !== myGeneration) return;
    ++generation;
    activeUserId = null;
    controller.abort();
    if (cycleInFlightUserId !== userId) accountControllers.delete(userId);
    clearInterval(timer);
    for (const unsubscribe of unsubscribers) unsubscribe();
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

export async function clearAccountDataCache(userId: string) {
  await AsyncStorage.multiRemove([outboxKey(userId), cacheKey(userId), cursorKey(userId), bootstrapKey(userId)]);
  if (await AsyncStorage.getItem(ownerKey) === userId) await AsyncStorage.removeItem(ownerKey);
}
