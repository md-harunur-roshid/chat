import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Check,
  CheckCheck,
  MessageCircle,
  Phone,
  PhoneCall,
  Send,
  Smile,
  Video,
} from 'lucide-react';
import {
  COPY,
  formatMessageTime,
  formatRelativeLastSeen,
  isUserActuallyOnline,
  Locale,
} from '../lib/i18n';
import { markMessageAsRead, sendChatMessage, setTypingStatus } from '../lib/chatService';
import { CallType, ChatMessage, ChatRoom, TypingState, UserProfile } from '../types/chat';
import { Avatar } from './Avatar';

interface ChatWindowProps {
  chat: ChatRoom | null;
  currentUser: UserProfile;
  otherUser: UserProfile | null;
  messages: ChatMessage[];
  otherTypingState: TypingState | null;
  nowMs: number;
  locale: Locale;
  onBackMobile: () => void;
  onStartCall: (callee: UserProfile, chatId: string, callType: CallType) => void;
}

const QUICK_EMOJIS = ['👋', '😊', '😂', '❤️', '👍', '🎉', '🙏', '🔥'];

export function ChatWindow({
  chat,
  currentUser,
  otherUser,
  messages,
  otherTypingState,
  nowMs,
  locale,
  onBackMobile,
  onStartCall,
}: ChatWindowProps) {
  const t = COPY[locale];
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [showEmojis, setShowEmojis] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const typingTimerRef = useRef<number | null>(null);
  const isTypingSentRef = useRef(false);
  const lastTypingEmitRef = useRef(0);

  const otherOnline = otherUser
    ? isUserActuallyOnline(otherUser.isOnline, otherUser.lastSeen, nowMs)
    : false;

  const isOtherTyping = useMemo(() => {
    if (!otherTypingState || !otherTypingState.isTyping || !otherTypingState.updatedAt) {
      return false;
    }
    return nowMs - otherTypingState.updatedAt.toMillis() < 6000;
  }, [otherTypingState, nowMs]);

  // Auto scroll when messages or typing state changes
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, isOtherTyping, chat?.chatId]);

  // Mark incoming messages as read automatically
  useEffect(() => {
    if (!chat) return;
    messages.forEach((msg) => {
      if (
        msg.senderId !== currentUser.uid &&
        !msg.readBy.includes(currentUser.uid) &&
        msg.readBy.length === 1
      ) {
        void markMessageAsRead(chat.chatId, msg.messageId, msg.readBy, currentUser.uid);
      }
    });
  }, [chat, messages, currentUser.uid]);

  // Reset typing state when switching chats or unmounting
  useEffect(() => {
    const activeChat = chat;
    return () => {
      if (typingTimerRef.current !== null) {
        window.clearTimeout(typingTimerRef.current);
        typingTimerRef.current = null;
      }
      if (activeChat && isTypingSentRef.current) {
        isTypingSentRef.current = false;
        void setTypingStatus(activeChat.chatId, activeChat.participants, currentUser.uid, false);
      }
    };
  }, [chat, currentUser.uid]);

  const emitTyping = (nextTyping: boolean) => {
    if (!chat) return;
    const now = Date.now();
    if (nextTyping) {
      if (!isTypingSentRef.current || now - lastTypingEmitRef.current > 2200) {
        isTypingSentRef.current = true;
        lastTypingEmitRef.current = now;
        void setTypingStatus(chat.chatId, chat.participants, currentUser.uid, true);
      }
      if (typingTimerRef.current !== null) {
        window.clearTimeout(typingTimerRef.current);
      }
      typingTimerRef.current = window.setTimeout(() => {
        isTypingSentRef.current = false;
        void setTypingStatus(chat.chatId, chat.participants, currentUser.uid, false);
      }, 2600);
    } else {
      if (typingTimerRef.current !== null) {
        window.clearTimeout(typingTimerRef.current);
        typingTimerRef.current = null;
      }
      if (isTypingSentRef.current) {
        isTypingSentRef.current = false;
        void setTypingStatus(chat.chatId, chat.participants, currentUser.uid, false);
      }
    }
  };

  const handleSend = async () => {
    if (!chat || sending) return;
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    setShowEmojis(false);
    emitTyping(false);
    setSending(true);
    try {
      await sendChatMessage({
        chatId: chat.chatId,
        participants: chat.participants,
        senderId: currentUser.uid,
        senderName: currentUser.displayName,
        text,
        type: 'text',
      });
      inputRef.current?.focus();
    } finally {
      setSending(false);
    }
  };

  if (!chat || !otherUser) {
    return (
      <section className="hidden md:flex flex-1 flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-8 text-center">
        <div className="max-w-sm space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-teal-700/10 dark:bg-teal-500/15 text-teal-700 dark:text-teal-400 flex items-center justify-center mx-auto">
            <MessageCircle className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
            {t.selectChatTitle}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            {t.selectChatDesc}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="flex-1 h-full flex flex-col bg-slate-50 dark:bg-slate-950 min-w-0">
      {/* Chat Header */}
      <header className="px-4 sm:px-6 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onBackMobile}
            aria-label="Back"
            className="md:hidden p-2 -ml-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <Avatar
            src={otherUser.photoURL}
            name={otherUser.displayName}
            size="md"
            showPresence
            isOnline={otherOnline}
          />

          <div className="min-w-0">
            <h2 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white truncate">
              {otherUser.displayName}
            </h2>
            <div className="text-xs truncate">
              {isOtherTyping ? (
                <span className="text-teal-700 dark:text-teal-400 font-medium">
                  {t.typing}
                </span>
              ) : otherOnline ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                  {t.online}
                </span>
              ) : (
                <span className="text-slate-500 dark:text-slate-400">
                  {formatRelativeLastSeen(otherUser.lastSeen, locale, nowMs)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Audio & Video Call Triggers */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onStartCall(otherUser, chat.chatId, 'audio')}
            title={t.audioCall}
            className="h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Phone className="w-4 h-4 text-teal-700 dark:text-teal-400" />
            <span className="hidden sm:inline">{t.audioCall}</span>
          </button>
          <button
            type="button"
            onClick={() => onStartCall(otherUser, chat.chatId, 'video')}
            title={t.videoCall}
            className="h-10 px-3 rounded-lg bg-teal-700 hover:bg-teal-800 text-white flex items-center gap-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Video className="w-4 h-4" />
            <span className="hidden sm:inline">{t.videoCall}</span>
          </button>
        </div>
      </header>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto chat-scroll px-4 sm:px-6 py-5 space-y-3">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center space-y-2 max-w-xs">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {otherUser.displayName}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t.startConversationPrompt}
              </p>
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isMine = msg.senderId === currentUser.uid;
            const isReadByPeer = msg.readBy.length >= 2;

            if (msg.type === 'call_event') {
              return (
                <div key={msg.messageId} className="flex justify-center py-1">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
                    <PhoneCall className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400" />
                    <span>{msg.text}</span>
                    <span className="text-slate-400 dark:text-slate-500">·</span>
                    <span className="font-mono-nums text-[11px] text-slate-400 dark:text-slate-500">
                      {formatMessageTime(msg.createdAt, locale)}
                    </span>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={msg.messageId}
                className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[78%] sm:max-w-[68%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed break-words ${
                    isMine
                      ? 'bg-teal-700 text-white rounded-br-sm'
                      : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-bl-sm'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                  <div
                    className={`mt-1 flex items-center justify-end gap-1.5 text-[11px] font-mono-nums ${
                      isMine ? 'text-teal-100/80' : 'text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    <span>{formatMessageTime(msg.createdAt, locale)}</span>
                    {isMine && (
                      <span aria-label={isReadByPeer ? 'Read' : 'Sent'}>
                        {isReadByPeer ? (
                          <CheckCheck className="w-3.5 h-3.5 text-teal-200" />
                        ) : (
                          <Check className="w-3.5 h-3.5 text-teal-200/70" />
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Live Typing Indicator Bubble */}
        {isOtherTyping && (
          <div className="flex justify-start">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl rounded-bl-sm px-4 py-2.5 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1" aria-hidden="true">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-600 dark:bg-teal-400 animate-bounce [animation-delay:-0.2s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-teal-600 dark:bg-teal-400 animate-bounce [animation-delay:-0.1s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-teal-600 dark:bg-teal-400 animate-bounce" />
              </span>
              <span>{t.typing}</span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Message Composer */}
      <div className="px-4 sm:px-6 py-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shrink-0 relative">
        {showEmojis && (
          <div className="absolute bottom-full left-4 sm:left-6 mb-2 p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg flex items-center gap-1">
            {QUICK_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => {
                  setDraft((prev) => prev + emoji);
                  emitTyping(true);
                  inputRef.current?.focus();
                }}
                className="w-9 h-9 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-lg transition-colors cursor-pointer"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-end gap-2">
          <button
            type="button"
            onClick={() => setShowEmojis((prev) => !prev)}
            aria-label="Emoji"
            className="h-11 w-11 shrink-0 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer"
          >
            <Smile className="w-5 h-5" />
          </button>

          <textarea
            ref={inputRef}
            rows={1}
            value={draft}
            onChange={(e) => {
              const val = e.target.value;
              setDraft(val);
              emitTyping(val.trim().length > 0);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void handleSend();
              }
            }}
            placeholder={t.messagePlaceholder}
            maxLength={2000}
            className="flex-1 min-h-[44px] max-h-32 resize-none px-4 py-2.5 text-sm bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl border border-transparent focus:border-teal-600 dark:focus:border-teal-500 focus:bg-white dark:focus:bg-slate-950 focus:outline-none transition-colors"
          />

          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={!draft.trim() || sending}
            aria-label={t.send}
            className="h-11 px-4 shrink-0 rounded-xl bg-teal-700 hover:bg-teal-800 disabled:opacity-45 text-white text-sm font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">{t.send}</span>
          </button>
        </div>
      </div>
    </section>
  );
}
