import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { doc, getDocFromServer, getFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { FirestoreErrorInfo, OperationType } from '../types/chat';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Blueprint volumetric constraints (synchronized with firebase-blueprint.json & firestore.rules)
export const BLUEPRINT_LIMITS = {
  ID_REGEX: /^[a-zA-Z0-9_-]+$/,
  ID_MAX: 128,
  DISPLAY_NAME_MAX: 80,
  PHOTO_URL_MAX: 500,
  BIO_MAX: 160,
  LAST_MESSAGE_MAX: 500,
  MESSAGE_TEXT_MAX: 2000,
  SDP_MAX: 32000,
  CANDIDATE_MAX: 2000,
  SDP_MID_MAX: 64,
} as const;

export function sanitizeString(value: string | null | undefined, maxLength: number, fallback = ''): string {
  const cleaned = (value ?? '').trim();
  if (!cleaned) return fallback;
  return cleaned.slice(0, maxLength);
}

export function isValidDocId(id: string): boolean {
  return id.length >= 1 && id.length <= BLUEPRINT_LIMITS.ID_MAX && BLUEPRINT_LIMITS.ID_REGEX.test(id);
}

export function getSortedPair(uid1: string, uid2: string): [string, string] {
  return uid1 < uid2 ? [uid1, uid2] : [uid2, uid1];
}

export function getDeterministicChatId(uid1: string, uid2: string): string {
  const [a, b] = getSortedPair(uid1, uid2);
  return `${a}_${b}`;
}

export function generateSafeId(prefix: string): string {
  const rand = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID().replace(/-/g, '')
    : `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}_${rand}`.slice(0, BLUEPRINT_LIMITS.ID_MAX);
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid ?? null,
      email: auth.currentUser?.email ?? null,
      emailVerified: auth.currentUser?.emailVerified ?? null,
      isAnonymous: auth.currentUser?.isAnonymous ?? null,
      tenantId: auth.currentUser?.tenantId ?? null,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) ?? [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection(): Promise<void> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration: client is offline.');
    }
  }
}

void testConnection();
