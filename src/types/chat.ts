import type { Timestamp } from 'firebase/firestore';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export interface UserProfile {
  uid: string;
  displayName: string;
  photoURL: string;
  bio: string;
  isOnline: boolean;
  isDiscoverable: boolean;
  lastSeen: Timestamp | null;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface ChatRoom {
  chatId: string;
  participants: [string, string];
  participantA: string;
  participantB: string;
  participantAName: string;
  participantBName: string;
  participantAPhoto: string;
  participantBPhoto: string;
  lastMessageText: string;
  lastMessageSenderId: string;
  lastMessageAt: Timestamp | null;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export type MessageType = 'text' | 'call_event';

export interface ChatMessage {
  messageId: string;
  chatId: string;
  participants: [string, string];
  senderId: string;
  senderName: string;
  type: MessageType;
  text: string;
  readBy: string[];
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface TypingState {
  userId: string;
  chatId: string;
  participants: [string, string];
  isTyping: boolean;
  updatedAt: Timestamp | null;
}

export type CallType = 'audio' | 'video';
export type CallStatus = 'ringing' | 'active' | 'ended' | 'declined' | 'missed';

export interface CallSession {
  callId: string;
  chatId: string;
  callerId: string;
  calleeId: string;
  callerName: string;
  callerPhoto: string;
  calleeName: string;
  calleePhoto: string;
  callType: CallType;
  status: CallStatus;
  offerType: 'offer';
  offerSdp: string;
  answerType: '' | 'answer';
  answerSdp: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface IceCandidateRecord {
  candidateId: string;
  callId: string;
  participants: [string, string];
  senderId: string;
  candidate: string;
  sdpMid: string;
  sdpMLineIndex: number;
  createdAt: Timestamp | null;
}
