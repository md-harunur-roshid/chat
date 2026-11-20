# Firestore Security Specification (Phase 0)

## 1. Data Invariants

1. **Identity Integrity**: A user may only create/update their own `/users/{userId}` profile (`uid == request.auth.uid`), their own `/users/{userId}/private/info` PII document, their own `/chats/{chatId}/typing/{userId}` document, and messages/ICE candidates where `senderId == request.auth.uid`.
2. **PII Isolation**: Email addresses live strictly inside `/users/{userId}/private/info` and are unreadable by any user other than `userId`.
3. **Deterministic 1-to-1 Chats**: A chat document ID must strictly equal `participantA + '_' + participantB` where `participantA < participantB` and `participants == [participantA, participantB]`. Only the two participants can read, list, create, or update chat metadata.
4. **Master Gate on Subcollections**: Messages and typing states inside `/chats/{chatId}` must validate parent chat existence and membership on write, and enforce `request.auth.uid in resource.data.participants` on list queries without `get()`/`exists()` inside `allow list`.
5. **Call Signaling State Machine & Terminal Locking**: Only participants of an existing chat can initiate a `/calls/{callId}` with initial `status == 'ringing'` and empty `answerSdp`. Only `calleeId` can transition `'ringing'` to `'active'` or `'declined'`. Once `status` reaches `'ended'`, `'declined'`, or `'missed'`, no further updates are permitted.
6. **Temporal & Volumetric Integrity**: All `createdAt` and `updatedAt` timestamps must match `request.time`. All IDs match `^[a-zA-Z0-9_\\-]+$` (`<= 128` chars), and all strings/arrays have strict bounds.

## 2. The "Dirty Dozen" Adversarial Payloads

1. **Profile Identity Spoofing**: User A attempts to create `/users/userB` with `{ uid: "userB", ... }`. Expected: `PERMISSION_DENIED`.
2. **Shadow Field Injection on Profile**: User A creates `/users/userA` with extra `{ isAdmin: true }`. Expected: `PERMISSION_DENIED`.
3. **PII Cross-Read**: User B attempts `get` on `/users/userA/private/info`. Expected: `PERMISSION_DENIED`.
4. **Blanket User List Scraping**: Unauthenticated or non-discoverable query on `/users`. Expected: `PERMISSION_DENIED`.
5. **Deterministic Chat ID Poisoning**: User A creates `/chats/custom_bad_id` with participants `[userA, userB]`. Expected: `PERMISSION_DENIED`.
6. **Non-Participant Chat Read/List**: User C attempts `get` or `list` on `/chats` not containing `userC`. Expected: `PERMISSION_DENIED`.
7. **Message Sender Spoofing**: User A creates message in chat with `senderId: "userB"`. Expected: `PERMISSION_DENIED`.
8. **Orphaned Message Write**: User A writes message to non-existent `/chats/nonexistent_chat/messages/m1`. Expected: `PERMISSION_DENIED`.
9. **Timestamp Forgery**: User A creates message with backdated `createdAt` != `request.time`. Expected: `PERMISSION_DENIED`.
10. **Typing Indicator Hijack**: User A updates `/chats/{chatId}/typing/userB`. Expected: `PERMISSION_DENIED`.
11. **Call Answer Hijack by Caller**: Caller tries to update `/calls/{callId}` from `ringing` to `active` with their own `answerSdp`. Expected: `PERMISSION_DENIED`.
12. **Terminal Call Resurrection**: Either participant tries to update a call whose existing `status` is `'ended'` back to `'active'`. Expected: `PERMISSION_DENIED`.
