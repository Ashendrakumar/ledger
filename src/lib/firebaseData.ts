import { deleteUser as deleteFirebaseUser } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import type { User as FirebaseUser } from 'firebase/auth';
import type { Entry, Goal, Loan, LoanPayment } from '@/types';
import { auth, db } from './firebase';

export type Resource = 'entries' | 'goals' | 'loans' | 'loan-payments';
export type DomainRecord = Entry | Goal | Loan | LoanPayment;

const firestoreCollection: Record<Resource, string> = {
  entries: 'entries',
  goals: 'goals',
  loans: 'loans',
  'loan-payments': 'loanPayments',
};

export function profileRef(uid: string) {
  return doc(db, 'users', uid);
}

export function recordsRef(uid: string, resource: Resource) {
  return collection(db, 'users', uid, firestoreCollection[resource]);
}

export function recordRef(uid: string, resource: Resource, id: string) {
  return doc(recordsRef(uid, resource), id);
}

export async function loadSetupComplete(user: FirebaseUser, fallback = false): Promise<boolean> {
  const profile = await getDoc(profileRef(user.uid));
  if (!profile.exists()) {
    await setDoc(profileRef(user.uid), {
      uid: user.uid,
      ...(user.displayName ? { displayName: user.displayName.slice(0, 80) } : {}),
      setupComplete: fallback,
    });
    return fallback;
  }
  return profile.data().setupComplete === true;
}

export async function markSetupComplete(uid: string, displayName?: string | null) {
  await setDoc(profileRef(uid), {
    uid,
    ...(displayName ? { displayName: displayName.slice(0, 80) } : {}),
    setupComplete: true,
  }, { merge: true });
}

export async function saveRecord(uid: string, resource: Resource, record: DomainRecord) {
  const { id, ...data } = record;
  await setDoc(recordRef(uid, resource, id), data);
}

export async function removeRecord(uid: string, resource: Resource, id: string) {
  await deleteDoc(recordRef(uid, resource, id));
}

export async function fetchAccountData(uid: string) {
  const [profile, entries, goals, loans, payments] = await Promise.all([
    getDoc(profileRef(uid)),
    getDocs(recordsRef(uid, 'entries')),
    getDocs(recordsRef(uid, 'goals')),
    getDocs(recordsRef(uid, 'loans')),
    getDocs(recordsRef(uid, 'loan-payments')),
  ]);
  return {
    profile: profile.exists() ? profile.data() : null,
    entries: entries.docs.map((item) => ({ ...item.data(), id: item.id })) as Entry[],
    goals: goals.docs.map((item) => ({ ...item.data(), id: item.id })) as Goal[],
    loans: loans.docs.map((item) => ({ ...item.data(), id: item.id })) as Loan[],
    payments: payments.docs.map((item) => ({ ...item.data(), id: item.id })) as LoanPayment[],
  };
}

export async function deleteAccountData(uid: string) {
  await Promise.all((Object.keys(firestoreCollection) as Resource[]).map(async (resource) => {
    const snapshot = await getDocs(recordsRef(uid, resource));
    for (let offset = 0; offset < snapshot.docs.length; offset += 450) {
      const batch = writeBatch(db);
      for (const item of snapshot.docs.slice(offset, offset + 450)) batch.delete(item.ref);
      await batch.commit();
    }
  }));
  await deleteDoc(profileRef(uid));
  const current = auth.currentUser;
  if (current?.uid === uid) await deleteFirebaseUser(current);
}
