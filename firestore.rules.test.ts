/**
 * Security Rule Verification Suite (Phase 0 TDD)
 * Documents and verifies all 12 "Dirty Dozen" adversarial payloads against firestore.rules.
 */

export interface AdversarialTestCase {
  id: number;
  name: string;
  collection: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  actorUid: string | null;
  expectedOutcome: 'PERMISSION_DENIED';
  payload: Record<string, unknown>;
}

export const DIRTY_DOZEN_CASES: AdversarialTestCase[] = [
  {
    id: 1,
    name: 'Profile Identity Spoofing',
    collection: '/users/userB',
    operation: 'create',
    actorUid: 'userA',
    expectedOutcome: 'PERMISSION_DENIED',
    payload: { uid: 'userB', displayName: 'Spoof', isOnline: true, isDiscoverable: true },
  },
  {
    id: 2,
    name: 'Shadow Field Injection on Profile',
    collection: '/users/userA',
    operation: 'create',
    actorUid: 'userA',
    expectedOutcome: 'PERMISSION_DENIED',
    payload: { uid: 'userA', displayName: 'User A', isAdmin: true },
  },
  {
    id: 3,
    name: 'PII Cross-Read',
    collection: '/users/userA/private/info',
    operation: 'get',
    actorUid: 'userB',
    expectedOutcome: 'PERMISSION_DENIED',
    payload: {},
  },
  {
    id: 4,
    name: 'Blanket User List Scraping',
    collection: '/users',
    operation: 'list',
    actorUid: null,
    expectedOutcome: 'PERMISSION_DENIED',
    payload: {},
  },
  {
    id: 5,
    name: 'Deterministic Chat ID Poisoning',
    collection: '/chats/arbitrary_id',
    operation: 'create',
    actorUid: 'userA',
    expectedOutcome: 'PERMISSION_DENIED',
    payload: { chatId: 'arbitrary_id', participants: ['userA', 'userB'], participantA: 'userA', participantB: 'userB' },
  },
  {
    id: 6,
    name: 'Non-Participant Chat Read',
    collection: '/chats/userA_userB',
    operation: 'get',
    actorUid: 'userC',
    expectedOutcome: 'PERMISSION_DENIED',
    payload: {},
  },
  {
    id: 7,
    name: 'Message Sender Spoofing',
    collection: '/chats/userA_userB/messages/msg1',
    operation: 'create',
    actorUid: 'userA',
    expectedOutcome: 'PERMISSION_DENIED',
    payload: { messageId: 'msg1', chatId: 'userA_userB', senderId: 'userB', text: 'Spoofed' },
  },
  {
    id: 8,
    name: 'Orphaned Message Write',
    collection: '/chats/missing_chat/messages/msg1',
    operation: 'create',
    actorUid: 'userA',
    expectedOutcome: 'PERMISSION_DENIED',
    payload: { messageId: 'msg1', chatId: 'missing_chat', senderId: 'userA', text: 'Orphan' },
  },
  {
    id: 9,
    name: 'Timestamp Forgery',
    collection: '/chats/userA_userB/messages/msg2',
    operation: 'create',
    actorUid: 'userA',
    expectedOutcome: 'PERMISSION_DENIED',
    payload: { messageId: 'msg2', senderId: 'userA', createdAt: '2020-01-01T00:00:00Z' },
  },
  {
    id: 10,
    name: 'Typing Indicator Hijack',
    collection: '/chats/userA_userB/typing/userB',
    operation: 'update',
    actorUid: 'userA',
    expectedOutcome: 'PERMISSION_DENIED',
    payload: { isTyping: true },
  },
  {
    id: 11,
    name: 'Call Answer Hijack by Caller',
    collection: '/calls/call1',
    operation: 'update',
    actorUid: 'userA',
    expectedOutcome: 'PERMISSION_DENIED',
    payload: { status: 'active', answerType: 'answer', answerSdp: 'fake-sdp' },
  },
  {
    id: 12,
    name: 'Terminal Call Resurrection',
    collection: '/calls/call_ended',
    operation: 'update',
    actorUid: 'userA',
    expectedOutcome: 'PERMISSION_DENIED',
    payload: { status: 'active' },
  },
];
