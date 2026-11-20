import { useMemo, useState } from 'react';
import {
  Languages,
  LogOut,
  MessageSquarePlus,
  Moon,
  Search,
  Settings,
  Sun,
  Users,
} from 'lucide-react';
import { COPY, formatMessageTime, formatRelativeLastSeen, isUserActuallyOnline, Locale } from '../lib/i18n';
import { ChatRoom, UserProfile } from '../types/chat';
import { Avatar } from './Avatar';

interface SidebarProps {
  currentUser: UserProfile;
  chats: ChatRoom[];
  users: UserProfile[];
  usersMap: Record<string, UserProfile>;
  activeChatId: string | null;
  nowMs: number;
  locale: Locale;
  isDark: boolean;
  onSelectChat: (chatId: string) => void;
  onStartChatWithUser: (user: UserProfile) => void;
  onOpenProfile: () => void;
  onToggleLocale: () => void;
  onToggleDark: () => void;
  onSignOut: () => void;
}

export function Sidebar({
  currentUser,
  chats,
  users,
  usersMap,
  activeChatId,
  nowMs,
  locale,
  isDark,
  onSelectChat,
  onStartChatWithUser,
  onOpenProfile,
  onToggleLocale,
  onToggleDark,
  onSignOut,
}: SidebarProps) {
  const t = COPY[locale];
  const [tab, setTab] = useState<'chats' | 'people'>('chats');
  const [queryText, setQueryText] = useState('');

  const filteredChats = useMemo(() => {
    const q = queryText.trim().toLowerCase();
    return chats.filter((chat) => {
      const otherUid = chat.participantA === currentUser.uid ? chat.participantB : chat.participantA;
      const otherProfile = usersMap[otherUid];
      const otherName =
        otherProfile?.displayName ??
        (chat.participantA === currentUser.uid ? chat.participantBName : chat.participantAName);
      if (!q) return true;
      return (
        otherName.toLowerCase().includes(q) ||
        chat.lastMessageText.toLowerCase().includes(q)
      );
    });
  }, [chats, currentUser.uid, queryText, usersMap]);

  const filteredUsers = useMemo(() => {
    const q = queryText.trim().toLowerCase();
    return users
      .filter((u) => u.uid !== currentUser.uid)
      .filter((u) => (!q ? true : u.displayName.toLowerCase().includes(q) || u.bio.toLowerCase().includes(q)))
      .sort((a, b) => {
        const aOn = isUserActuallyOnline(a.isOnline, a.lastSeen, nowMs) ? 1 : 0;
        const bOn = isUserActuallyOnline(b.isOnline, b.lastSeen, nowMs) ? 1 : 0;
        if (aOn !== bOn) return bOn - aOn;
        return a.displayName.localeCompare(b.displayName);
      });
  }, [users, currentUser.uid, queryText, nowMs]);

  return (
    <aside className="w-full md:w-80 lg:w-96 shrink-0 h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col">
      {/* Top User & App Bar */}
      <div className="px-4 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onOpenProfile}
            className="flex items-center gap-2.5 min-w-0 text-left group cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 rounded-lg"
            title={t.profileSettings}
          >
            <Avatar
              src={currentUser.photoURL}
              name={currentUser.displayName}
              size="sm"
              showPresence
              isOnline
            />
            <div className="min-w-0">
              <div className="text-sm font-semibold text-slate-900 dark:text-white truncate group-hover:text-teal-700 dark:group-hover:text-teal-400 transition-colors">
                {currentUser.displayName}
              </div>
              <div className="text-xs text-emerald-600 dark:text-emerald-400 truncate">
                {t.online}
              </div>
            </div>
          </button>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onToggleLocale}
            title={locale === 'bn' ? 'Switch to English' : 'বাংলায় দেখুন'}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <Languages className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onToggleDark}
            title={isDark ? t.lightMode : t.darkMode}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={onOpenProfile}
            title={t.profileSettings}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onSignOut}
            title={t.signOut}
            className="p-2 rounded-lg text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Search & Segmented Tabs */}
      <div className="p-3 space-y-2.5 border-b border-slate-200/70 dark:border-slate-800/70">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={queryText}
            onChange={(e) => setQueryText(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="w-full pl-9 pr-3 py-2 text-sm bg-slate-100 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-lg border border-transparent focus:border-teal-600 dark:focus:border-teal-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none transition-colors"
          />
        </div>

        <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 dark:bg-slate-800/90 rounded-lg">
          <button
            type="button"
            onClick={() => setTab('chats')}
            className={`py-1.5 px-3 text-xs font-medium rounded-md flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
              tab === 'chats'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <MessageSquarePlus className="w-3.5 h-3.5" />
            <span>{t.chatsTab}</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('people')}
            className={`py-1.5 px-3 text-xs font-medium rounded-md flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
              tab === 'people'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>{t.peopleTab}</span>
          </button>
        </div>
      </div>

      {/* List Viewport */}
      <div className="flex-1 overflow-y-auto chat-scroll divide-y divide-slate-100 dark:divide-slate-800/60">
        {tab === 'chats' ? (
          filteredChats.length === 0 ? (
            <div className="p-8 text-center space-y-3">
              <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center mx-auto">
                <MessageSquarePlus className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  {t.noChatsTitle}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {t.noChatsDesc}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setTab('people')}
                className="inline-flex items-center justify-center px-3.5 py-2 text-xs font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors cursor-pointer"
              >
                {t.browsePeople}
              </button>
            </div>
          ) : (
            filteredChats.map((chat) => {
              const otherUid =
                chat.participantA === currentUser.uid ? chat.participantB : chat.participantA;
              const otherProfile = usersMap[otherUid];
              const displayName =
                otherProfile?.displayName ??
                (chat.participantA === currentUser.uid
                  ? chat.participantBName
                  : chat.participantAName);
              const photoURL =
                otherProfile?.photoURL ??
                (chat.participantA === currentUser.uid
                  ? chat.participantBPhoto
                  : chat.participantAPhoto);
              const isOnline = otherProfile
                ? isUserActuallyOnline(otherProfile.isOnline, otherProfile.lastSeen, nowMs)
                : false;
              const isActive = activeChatId === chat.chatId;
              const previewText = chat.lastMessageText
                ? `${chat.lastMessageSenderId === currentUser.uid ? t.youPrefix : ''}${chat.lastMessageText}`
                : t.startConversationPrompt;

              return (
                <button
                  key={chat.chatId}
                  type="button"
                  onClick={() => onSelectChat(chat.chatId)}
                  className={`w-full px-4 py-3 flex items-center gap-3 text-left transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-teal-50/80 dark:bg-teal-950/30'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <Avatar
                    src={photoURL}
                    name={displayName}
                    size="md"
                    showPresence
                    isOnline={isOnline}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {displayName}
                      </span>
                      <span className="text-[11px] font-mono-nums text-slate-400 dark:text-slate-500 shrink-0">
                        {formatMessageTime(chat.lastMessageAt, locale)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {previewText}
                      </p>
                      {isOnline && (
                        <span className="text-[11px] text-emerald-600 dark:text-emerald-400 shrink-0">
                          {t.online}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )
        ) : filteredUsers.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center mx-auto">
              <Users className="w-5 h-5" />
            </div>
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
              {t.noPeopleTitle}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {t.noPeopleDesc}
            </p>
          </div>
        ) : (
          filteredUsers.map((person) => {
            const online = isUserActuallyOnline(person.isOnline, person.lastSeen, nowMs);
            return (
              <button
                key={person.uid}
                type="button"
                onClick={() => {
                  onStartChatWithUser(person);
                  setTab('chats');
                }}
                className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
              >
                <Avatar
                  src={person.photoURL}
                  name={person.displayName}
                  size="md"
                  showPresence
                  isOnline={online}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {person.displayName}
                    </span>
                    <span
                      className={`text-[11px] shrink-0 ${
                        online
                          ? 'text-emerald-600 dark:text-emerald-400 font-medium'
                          : 'text-slate-400 dark:text-slate-500'
                      }`}
                    >
                      {online ? t.online : t.offline}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    {person.bio || formatRelativeLastSeen(person.lastSeen, locale, nowMs)}
                  </p>
                </div>
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
}
