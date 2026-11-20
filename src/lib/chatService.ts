import type { User } from 'firebase/auth';
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import {
  BLUEPRINT_LIMITS,
  db,
  generateSafeId,
  getDeterministicChatId,
  getSortedPair,
  handleFirestoreError,
  sanitizeString,
} from './firebase';
import {
  CallStatus,
  CallType,
  MessageType,
  OperationType,
  UserProfile,
} from '../types/chat';

let pendingSignupDisplayName: string | null = null;

export function setPendingSignupDisplayName(name: string | null): void {
  pendingSignupDisplayName = name ? sanitizeString(name, BLUEPRINT_LIMITS.DISPLAY_NAME_MAX) : null;
}

export function resolveIdentifierToAuthEmail(rawIdentifier: string): {
  authEmail: string;
  isPhone: boolean;
} | null {
  const trimmed = rawIdentifier.trim();
  if (!trimmed) return null;

  // Email format
  if (trimmed.includes('@')) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed) || trimmed.length > 254) return null;
    return { authEmail: trimmed.toLowerCase(), isPhone: false };
  }

  // Phone number format: strip spaces, dashes, parentheses; keep digits (optionally leading +)
  const digitsOnly = trimmed.replace(/[^\d]/g, '');
  if (digitsOnly.length < 6 || digitsOnly.length > 15) return null;
  return { authEmail: `p_${digitsOnly}@phone.alap.app`, isPhone: true };
}

export async function syncUserProfileOnLogin(user: User): Promise<void> {
  const userPath = `users/${user.uid}`;
  const privatePath = `users/${user.uid}/private/info`;
  const userRef = doc(db, 'users', user.uid);
  const privateRef = doc(db, 'users', user.uid, 'private', 'info');

  const resolvedName = sanitizeString(
    user.displayName || pendingSignupDisplayName,
    BLUEPRINT_LIMITS.DISPLAY_NAME_MAX,
    'User'
  );
  pendingSignupDisplayName = null;

  try {
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      await setDoc(userRef, {
        uid: user.uid,
        displayName: resolvedName,
        photoURL: sanitizeString(user.photoURL, BLUEPRINT_LIMITS.PHOTO_URL_MAX, ''),
        bio: '',
        isOnline: true,
        isDiscoverable: true,
        lastSeen: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(userRef, {
        isOnline: true,
        lastSeen: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, userPath);
  }

  if (user.email) {
    try {
      const privSnap = await getDoc(privateRef);
      const email = sanitizeString(user.email, 254);
      if (!privSnap.exists()) {
        await setDoc(privateRef, {
          uid: user.uid,
          email,
          updatedAt: serverTimestamp(),
        });
      } else {
        await updateDoc(privateRef, {
          email,
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, privatePath);
    }
  }
}

export async function updateUserPresence(uid: string, isOnline: boolean): Promise<void> {
  const path = `users/${uid}`;
  try {
    await updateDoc(doc(db, 'users', uid), {
      isOnline,
      lastSeen: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    // Ignore benign offline errors during page unload, throw permission errors
    if (error instanceof Error && error.message.toLowerCase().includes('permission')) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  }
}

export async function updateUserProfileDetails(
  uid: string,
  displayName: string,
  bio: string,
  isDiscoverable: boolean
): Promise<void> {
  const path = `users/${uid}`;
  try {
    await updateDoc(doc(db, 'users', uid), {
      displayName: sanitizeString(displayName, BLUEPRINT_LIMITS.DISPLAY_NAME_MAX, 'User'),
      bio: sanitizeString(bio, BLUEPRINT_LIMITS.BIO_MAX, ''),
      isDiscoverable,
      isOnline: true,
      lastSeen: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function ensureChatRoom(
  currentUser: UserProfile,
  otherUser: UserProfile
): Promise<string> {
  const chatId = getDeterministicChatId(currentUser.uid, otherUser.uid);
  const path = `chats/${chatId}`;
  const chatRef = doc(db, 'chats', chatId);
  const [participantA, participantB] = getSortedPair(currentUser.uid, otherUser.uid);
  const isCurrentA = currentUser.uid === participantA;
  const userA = isCurrentA ? currentUser : otherUser;
  const userB = isCurrentA ? otherUser : currentUser;

  try {
    const snap = await getDoc(chatRef);
    if (!snap.exists()) {
      await setDoc(chatRef, {
        chatId,
        participants: [participantA, participantB],
        participantA,
        participantB,
        participantAName: sanitizeString(userA.displayName, BLUEPRINT_LIMITS.DISPLAY_NAME_MAX, 'User'),
        participantBName: sanitizeString(userB.displayName, BLUEPRINT_LIMITS.DISPLAY_NAME_MAX, 'User'),
        participantAPhoto: sanitizeString(userA.photoURL, BLUEPRINT_LIMITS.PHOTO_URL_MAX, ''),
        participantBPhoto: sanitizeString(userB.photoURL, BLUEPRINT_LIMITS.PHOTO_URL_MAX, ''),
        lastMessageText: '',
        lastMessageSenderId: '',
        lastMessageAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      const existing = snap.data();
      const nextAName = sanitizeString(userA.displayName, BLUEPRINT_LIMITS.DISPLAY_NAME_MAX, 'User');
      const nextBName = sanitizeString(userB.displayName, BLUEPRINT_LIMITS.DISPLAY_NAME_MAX, 'User');
      const nextAPhoto = sanitizeString(userA.photoURL, BLUEPRINT_LIMITS.PHOTO_URL_MAX, '');
      const nextBPhoto = sanitizeString(userB.photoURL, BLUEPRINT_LIMITS.PHOTO_URL_MAX, '');
      if (
        existing.participantAName !== nextAName ||
        existing.participantBName !== nextBName ||
        existing.participantAPhoto !== nextAPhoto ||
        existing.participantBPhoto !== nextBPhoto
      ) {
        await updateDoc(chatRef, {
          participantAName: nextAName,
          participantBName: nextBName,
          participantAPhoto: nextAPhoto,
          participantBPhoto: nextBPhoto,
          updatedAt: serverTimestamp(),
        });
      }
    }
    return chatId;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function sendChatMessage(params: {
  chatId: string;
  participants: [string, string];
  senderId: string;
  senderName: string;
  text: string;
  type?: MessageType;
}): Promise<void> {
  const cleanText = sanitizeString(params.text, BLUEPRINT_LIMITS.MESSAGE_TEXT_MAX);
  if (!cleanText) return;

  const messageId = generateSafeId('msg');
  const messagePath = `chats/${params.chatId}/messages/${messageId}`;
  const chatRef = doc(db, 'chats', params.chatId);
  const messageRef = doc(db, 'chats', params.chatId, 'messages', messageId);

  try {
    const batch = writeBatch(db);
    batch.set(messageRef, {
      messageId,
      chatId: params.chatId,
      participants: params.participants,
      senderId: params.senderId,
      senderName: sanitizeString(params.senderName, BLUEPRINT_LIMITS.DISPLAY_NAME_MAX, 'User'),
      type: params.type ?? 'text',
      text: cleanText,
      readBy: [params.senderId],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    batch.update(chatRef, {
      lastMessageText: cleanText.slice(0, BLUEPRINT_LIMITS.LAST_MESSAGE_MAX),
      lastMessageSenderId: params.senderId,
      lastMessageAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, messagePath);
  }
}

export async function markMessageAsRead(
  chatId: string,
  messageId: string,
  existingReadBy: string[],
  readerUid: string
): Promise<void> {
  if (existingReadBy.includes(readerUid) || existingReadBy.length !== 1) return;
  const path = `chats/${chatId}/messages/${messageId}`;
  try {
    await updateDoc(doc(db, 'chats', chatId, 'messages', messageId), {
      readBy: [existingReadBy[0], readerUid],
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function setTypingStatus(
  chatId: string,
  participants: [string, string],
  userId: string,
  isTyping: boolean
): Promise<void> {
  const path = `chats/${chatId}/typing/${userId}`;
  const typingRef = doc(db, 'chats', chatId, 'typing', userId);
  try {
    const snap = await getDoc(typingRef);
    if (!snap.exists()) {
      await setDoc(typingRef, {
        userId,
        chatId,
        participants,
        isTyping,
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(typingRef, {
        isTyping,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function createCallSession(params: {
  callId: string;
  chatId: string;
  caller: UserProfile;
  callee: UserProfile;
  callType: CallType;
  offerSdp: string;
}): Promise<void> {
  const path = `calls/${params.callId}`;
  try {
    await setDoc(doc(db, 'calls', params.callId), {
      callId: params.callId,
      chatId: params.chatId,
      callerId: params.caller.uid,
      calleeId: params.callee.uid,
      callerName: sanitizeString(params.caller.displayName, BLUEPRINT_LIMITS.DISPLAY_NAME_MAX, 'User'),
      callerPhoto: sanitizeString(params.caller.photoURL, BLUEPRINT_LIMITS.PHOTO_URL_MAX, ''),
      calleeName: sanitizeString(params.callee.displayName, BLUEPRINT_LIMITS.DISPLAY_NAME_MAX, 'User'),
      calleePhoto: sanitizeString(params.callee.photoURL, BLUEPRINT_LIMITS.PHOTO_URL_MAX, ''),
      callType: params.callType,
      status: 'ringing' satisfies CallStatus,
      offerType: 'offer',
      offerSdp: params.offerSdp.slice(0, BLUEPRINT_LIMITS.SDP_MAX),
      answerType: '',
      answerSdp: '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function acceptCallSession(callId: string, answerSdp: string): Promise<void> {
  const path = `calls/${callId}`;
  try {
    await updateDoc(doc(db, 'calls', callId), {
      status: 'active' satisfies CallStatus,
      answerType: 'answer',
      answerSdp: answerSdp.slice(0, BLUEPRINT_LIMITS.SDP_MAX),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function updateCallStatus(
  callId: string,
  nextStatus: 'ended' | 'declined' | 'missed'
): Promise<void> {
  const path = `calls/${callId}`;
  try {
    await updateDoc(doc(db, 'calls', callId), {
      status: nextStatus,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    // Ignore if call already transitioned to terminal state by peer
    if (error instanceof Error && !error.message.toLowerCase().includes('permission')) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  }
}

export async function addIceCandidateRecord(params: {
  callId: string;
  participants: [string, string];
  senderId: string;
  candidate: string;
  sdpMid: string;
  sdpMLineIndex: number;
}): Promise<void> {
  const cleanCandidate = params.candidate.trim();
  if (!cleanCandidate) return;
  const candidateId = generateSafeId('ice');
  const path = `calls/${params.callId}/candidates/${candidateId}`;
  try {
    await setDoc(doc(db, 'calls', params.callId, 'candidates', candidateId), {
      candidateId,
      callId: params.callId,
      participants: params.participants,
      senderId: params.senderId,
      candidate: cleanCandidate.slice(0, BLUEPRINT_LIMITS.CANDIDATE_MAX),
      sdpMid: sanitizeString(params.sdpMid, BLUEPRINT_LIMITS.SDP_MID_MAX, ''),
      sdpMLineIndex: Math.min(20, Math.max(0, Math.floor(params.sdpMLineIndex))),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    // Ignore candidate write if call already ended
    if (error instanceof Error && !error.message.toLowerCase().includes('permission')) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  }
}
