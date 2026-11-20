/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { collection, doc, onSnapshot, query, where } from 'firebase/firestore';
import { AuthScreen } from './components/AuthScreen';
import { CallOverlay } from './components/CallOverlay';
import { ChatWindow } from './components/ChatWindow';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ProfileModal } from './components/ProfileModal';
import { Sidebar } from './components/Sidebar';
import { useWebRTCCall } from './hooks/useWebRTCCall';
import {
  ensureChatRoom,
  syncUserProfileOnLogin,
  updateUserPresence,
} from './lib/chatService';
import {
  BLUEPRINT_LIMITS,
  auth,
  db,
  getDeterministicChatId,
  getSortedPair,
  handleFirestoreError,
  sanitizeString,
} from './lib/firebase';
import { Locale } from './lib/i18n';
import {
  CallType,
  ChatMessage,
  ChatRoom,
  OperationType,
  TypingState,
  UserProfile,
} from './types/chat';

function ChatAppContent() {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [profileSynced, setProfileSynced] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [chats, setChats] = useState<ChatRoom[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [pendingChat, setPendingChat] = useState<ChatRoom | null>(null);
  const [chatError, setChatError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [otherTypingState, setOtherTypingState] = useState<TypingState | null>(null);

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const [locale, setLocale] = useState<Locale>(() => {
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem('alap_locale') : null;
    return saved === 'en' ? 'en' : 'bn';
  });

  const [isDark, setIsDark] = useState<boolean>(() => {
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem('alap_theme') : null;
    return saved === 'dark';
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    window.localStorage.setItem('alap_theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  useEffect(() => {
    document.documentElement.lang = locale;
    window.localStorage.setItem('alap_locale', locale);
  }, [locale]);

  // Periodic tick to keep relative last-seen & typing freshness accurate
  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 5000);
    return () => window.clearInterval(id);
  }, []);

  // Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      setProfileSynced(false);
      if (user) {
        try {
          await syncUserProfileOnLogin(user);
          setProfileSynced(true);
        } catch (err) {
          console.error(err);
        }
      } else {
        setCurrentUser(null);
        setUsers([]);
        setChats([]);
        setActiveChatId(null);
        setMessages([]);
        setOtherTypingState(null);
      }
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  // Presence heartbeat & visibility/unload updates
  useEffect(() => {
    if (!firebaseUser || !profileSynced) return;
    const uid = firebaseUser.uid;

    const heartbeat = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void updateUserPresence(uid, true);
      }
    }, 25_000);

    const handleVisibility = () => {
      void updateUserPresence(uid, document.visibilityState === 'visible');
    };

    const handlePageHide = () => {
      void updateUserPresence(uid, false);
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      window.clearInterval(heartbeat);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [firebaseUser, profileSynced]);

  // Subscribe to current user profile, discoverable directory, and user's chats
  useEffect(() => {
    if (!firebaseUser || !profileSynced) return;
    const uid = firebaseUser.uid;

    const unsubMe = onSnapshot(
      doc(db, 'users', uid),
      (snap) => {
        if (snap.exists()) {
          setCurrentUser(snap.data() as UserProfile);
        }
      },
      (error) => handleFirestoreError(error, OperationType.GET, `users/${uid}`)
    );

    const unsubUsers = onSnapshot(
      query(collection(db, 'users'), where('isDiscoverable', '==', true)),
      (snap) => {
        setUsers(snap.docs.map((d) => d.data() as UserProfile));
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'users')
    );

    const unsubChats = onSnapshot(
      query(collection(db, 'chats'), where('participants', 'array-contains', uid)),
      (snap) => {
        const list = snap.docs
          .map((d) => d.data() as ChatRoom)
          .sort((a, b) => {
            const aTime = a.lastMessageAt?.toMillis() ?? a.updatedAt?.toMillis() ?? 0;
            const bTime = b.lastMessageAt?.toMillis() ?? b.updatedAt?.toMillis() ?? 0;
            return bTime - aTime;
          });
        setChats(list);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'chats')
    );

    return () => {
      unsubMe();
      unsubUsers();
      unsubChats();
    };
  }, [firebaseUser, profileSynced]);

  // Subscribe to active chat messages and typing state
  useEffect(() => {
    if (!firebaseUser || !profileSynced || !activeChatId) {
      setMessages([]);
      setOtherTypingState(null);
      return;
    }

    const uid = firebaseUser.uid;
    const messagesPath = `chats/${activeChatId}/messages`;
    const typingPath = `chats/${activeChatId}/typing`;

    const unsubMessages = onSnapshot(
      query(collection(db, 'chats', activeChatId, 'messages'), where('participants', 'array-contains', uid)),
      (snap) => {
        const list = snap.docs
          .map((d) => d.data() as ChatMessage)
          .sort((a, b) => {
            const aTime = a.createdAt?.toMillis() ?? Date.now();
            const bTime = b.createdAt?.toMillis() ?? Date.now();
            return aTime - bTime;
          });
        setMessages(list);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, messagesPath)
    );

    const unsubTyping = onSnapshot(
      query(collection(db, 'chats', activeChatId, 'typing'), where('participants', 'array-contains', uid)),
      (snap) => {
        const peerTyping =
          snap.docs
            .map((d) => d.data() as TypingState)
            .find((item) => item.userId !== uid) ?? null;
        setOtherTypingState(peerTyping);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, typingPath)
    );

    return () => {
      unsubMessages();
      unsubTyping();
    };
  }, [activeChatId, firebaseUser, profileSynced]);

  const usersMap = useMemo(() => {
    const map: Record<string, UserProfile> = {};
    users.forEach((u) => {
      map[u.uid] = u;
    });
    if (currentUser) {
      map[currentUser.uid] = currentUser;
    }
    return map;
  }, [users, currentUser]);

  const activeChat = useMemo(() => {
    if (!activeChatId) return null;
    return (
      chats.find((c) => c.chatId === activeChatId) ??
      (pendingChat?.chatId === activeChatId ? pendingChat : null)
    );
  }, [chats, activeChatId, pendingChat]);

  const activeOtherUser = useMemo(() => {
    if (!activeChat || !currentUser) return null;
    const otherUid =
      activeChat.participantA === currentUser.uid
        ? activeChat.participantB
        : activeChat.participantA;
    if (usersMap[otherUid]) return usersMap[otherUid];

    return {
      uid: otherUid,
      displayName:
        activeChat.participantA === currentUser.uid
          ? activeChat.participantBName
          : activeChat.participantAName,
      photoURL:
        activeChat.participantA === currentUser.uid
          ? activeChat.participantBPhoto
          : activeChat.participantAPhoto,
      bio: '',
      isOnline: false,
      isDiscoverable: true,
      lastSeen: null,
      createdAt: null,
      updatedAt: null,
    };
  }, [activeChat, currentUser, usersMap]);

  const handleStartChatWithUser = useCallback(
    async (other: UserProfile) => {
      if (!currentUser) return;
      setChatError(null);
      const chatId = getDeterministicChatId(currentUser.uid, other.uid);
      const [participantA, participantB] = getSortedPair(currentUser.uid, other.uid);
      const isCurrentA = currentUser.uid === participantA;
      const userA = isCurrentA ? currentUser : other;
      const userB = isCurrentA ? other : currentUser;

      const optimisticRoom: ChatRoom = {
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
        lastMessageAt: null,
        createdAt: null,
        updatedAt: null,
      };

      setPendingChat(optimisticRoom);
      setActiveChatId(chatId);

      try {
        const synced = await ensureChatRoom(currentUser, other);
        setPendingChat(synced);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setChatError(msg);
      }
    },
    [currentUser]
  );

  const handleSignOut = useCallback(async () => {
    if (firebaseUser) {
      await updateUserPresence(firebaseUser.uid, false);
    }
    await signOut(auth);
  }, [firebaseUser]);

  const {
    activeCall,
    incomingCall,
    localStream,
    remoteStream,
    isMuted,
    isCameraOff,
    callSeconds,
    callError,
    terminalNotice,
    startCall,
    acceptIncomingCall,
    declineIncomingCall,
    endActiveCall,
    toggleMute,
    toggleCamera,
    dismissError,
  } = useWebRTCCall(currentUser, locale);

  const handleStartCall = useCallback(
    (callee: UserProfile, chatId: string, callType: CallType) => {
      void startCall(callee, chatId, callType);
    },
    [startCall]
  );

  if (!authReady) {
    return (
      <div className="h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-teal-700 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!firebaseUser || !currentUser) {
    return (
      <AuthScreen
        locale={locale}
        onToggleLocale={() => setLocale((l) => (l === 'bn' ? 'en' : 'bn'))}
        isDark={isDark}
        onToggleDark={() => setIsDark((d) => !d)}
      />
    );
  }

  return (
    <div className="h-screen w-full overflow-hidden bg-slate-50 dark:bg-slate-950 flex">
      {/* Sidebar: hidden on mobile when a chat is active */}
      <div className={`${activeChatId ? 'hidden md:flex' : 'flex'} w-full md:w-auto h-full`}>
        <Sidebar
          currentUser={currentUser}
          chats={chats}
          users={users}
          usersMap={usersMap}
          activeChatId={activeChatId}
          nowMs={nowMs}
          locale={locale}
          isDark={isDark}
          onSelectChat={(chatId) => setActiveChatId(chatId)}
          onStartChatWithUser={(u) => void handleStartChatWithUser(u)}
          onOpenProfile={() => setShowProfileModal(true)}
          onToggleLocale={() => setLocale((l) => (l === 'bn' ? 'en' : 'bn'))}
          onToggleDark={() => setIsDark((d) => !d)}
          onSignOut={() => void handleSignOut()}
        />
      </div>

      {/* Chat Viewport: hidden on mobile when no chat is selected */}
      <div className={`${activeChatId ? 'flex' : 'hidden md:flex'} flex-1 h-full min-w-0 relative`}>
        {chatError && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-40 max-w-md w-[90%] bg-red-600 text-white text-xs px-4 py-2.5 rounded-xl shadow-lg flex items-center justify-between gap-3">
            <span className="truncate">{chatError}</span>
            <button
              type="button"
              onClick={() => setChatError(null)}
              className="underline shrink-0 cursor-pointer"
            >
              OK
            </button>
          </div>
        )}
        <ChatWindow
          chat={activeChat}
          currentUser={currentUser}
          otherUser={activeOtherUser}
          messages={messages}
          otherTypingState={otherTypingState}
          nowMs={nowMs}
          locale={locale}
          onBackMobile={() => setActiveChatId(null)}
          onStartCall={handleStartCall}
        />
      </div>

      {showProfileModal && (
        <ProfileModal
          user={currentUser}
          locale={locale}
          onClose={() => setShowProfileModal(false)}
        />
      )}

      <CallOverlay
        currentUid={currentUser.uid}
        activeCall={activeCall}
        incomingCall={incomingCall}
        localStream={localStream}
        remoteStream={remoteStream}
        isMuted={isMuted}
        isCameraOff={isCameraOff}
        callSeconds={callSeconds}
        callError={callError}
        terminalNotice={terminalNotice}
        locale={locale}
        onAcceptIncoming={() => void acceptIncomingCall()}
        onDeclineIncoming={() => void declineIncomingCall()}
        onEndCall={() => void endActiveCall()}
        onToggleMute={toggleMute}
        onToggleCamera={toggleCamera}
        onDismissError={dismissError}
      />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ChatAppContent />
    </ErrorBoundary>
  );
}
