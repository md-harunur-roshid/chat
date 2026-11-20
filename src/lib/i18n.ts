import type { Timestamp } from 'firebase/firestore';

export type Locale = 'bn' | 'en';

export const COPY = {
  bn: {
    appName: 'আলাপ',
    tagline: 'তাৎক্ষণিক মেসেজিং ও অডিও-ভিডিও কল',
    authTitle: 'সহজ ও সরাসরি রিয়েল-টাইম যোগাযোগ',
    authSubtitle:
      'বন্ধু ও সহকর্মীদের সাথে সরাসরি চ্যাট করুন, কে অনলাইনে আছেন দেখুন, লাইভ টাইপিং বুঝুন এবং এক ক্লিকেই অডিও বা ভিডিও কল করুন।',
    featureRealtime: 'তাৎক্ষণিক মেসেজ সিঙ্ক ও রিড রিসিপ্ট',
    featurePresence: 'লাইভ অনলাইন স্ট্যাটাস ও শেষ দেখা সময়',
    featureTyping: 'অপরজন টাইপ করছে কি না রিয়েল-টাইম আপডেট',
    featureCalls: 'পিয়ার-টু-পিয়ার HD অডিও এবং ভিডিও কল',
    signInWithGoogle: 'Google দিয়ে প্রবেশ করুন',
    signingIn: 'প্রবেশ করা হচ্ছে...',
    signInNote: 'Google অথবা ইমেইল/মোবাইল নম্বর দিয়ে নিরাপদ প্রবেশ করুন।',
    authTabSignIn: 'লগইন',
    authTabSignUp: 'নতুন অ্যাকাউন্ট',
    fullNameLabel: 'আপনার নাম',
    fullNamePlaceholder: 'যেমন: তানভীর আহমেদ',
    identifierLabel: 'ইমেইল অথবা মোবাইল নম্বর',
    identifierPlaceholder: 'name@example.com অথবা 017XXXXXXXX',
    passwordLabel: 'পাসওয়ার্ড',
    passwordPlaceholder: 'কমপক্ষে ৬ অক্ষরের পাসওয়ার্ড',
    submitSignIn: 'লগইন করুন',
    submitSignUp: 'অ্যাকাউন্ট খুলুন',
    creatingAccount: 'অ্যাকাউন্ট তৈরি হচ্ছে...',
    orDivider: 'অথবা',
    errNameRequired: 'অনুগ্রহ করে আপনার নাম লিখুন।',
    errIdentifierInvalid: 'সঠিক ইমেইল অথবা কমপক্ষে ৬ ডিজিটের মোবাইল নম্বর দিন।',
    errPasswordWeak: 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।',
    errInvalidCredential: 'ইমেইল/নম্বর বা পাসওয়ার্ড সঠিক নয়।',
    errAccountExists: 'এই ইমেইল বা নম্বর দিয়ে আগেই অ্যাকাউন্ট খোলা আছে। অনুগ্রহ করে লগইন করুন।',
    errProviderDisabled:
      'Firebase Console-এ Authentication > Sign-in method থেকে Email/Password চালু করুন।',
    errUnauthorizedDomain: (host: string) =>
      `এই ডোমেইনটি (${host}) Firebase Console-এ Authorized domains তালিকায় যোগ করা নেই।`,
    chatsTab: 'চ্যাট',
    peopleTab: 'সবাই',
    searchPlaceholder: 'নাম দিয়ে খুঁজুন...',
    online: 'অনলাইন',
    offline: 'অফলাইন',
    typing: 'টাইপ করছে...',
    lastSeenPrefix: 'শেষ দেখা',
    justNow: 'এইমাত্র',
    minutesAgo: (n: number) => `${n} মিনিট আগে`,
    hoursAgo: (n: number) => `${n} ঘণ্টা আগে`,
    daysAgo: (n: number) => `${n} দিন আগে`,
    noChatsTitle: 'এখনো কোনো কথোপকথন নেই',
    noChatsDesc: '"সবাই" ট্যাব থেকে যেকোনো ব্যবহারকারীকে বেছে নিয়ে চ্যাট শুরু করুন।',
    browsePeople: 'সবার তালিকা দেখুন',
    noPeopleTitle: 'অন্য কোনো ব্যবহারকারী পাওয়া যায়নি',
    noPeopleDesc: 'নতুন কেউ যোগ দিলে এখানেই দেখতে পাবেন। আপনি চাইলে অন্য আরেকটি ব্রাউজার বা অ্যাকাউন্ট দিয়ে টেস্ট করতে পারেন।',
    selectChatTitle: 'একটি চ্যাট বেছে নিন',
    selectChatDesc: 'বাম পাশ থেকে যেকোনো কথোপকথন বা ব্যক্তিকে নির্বাচন করে মেসেজ, অডিও বা ভিডিও কল শুরু করুন।',
    messagePlaceholder: 'মেসেজ লিখুন...',
    send: 'পাঠান',
    audioCall: 'অডিও কল',
    videoCall: 'ভিডিও কল',
    profileSettings: 'প্রোফাইল সেটিংস',
    displayName: 'নাম',
    bio: 'স্ট্যাটাস / বায়ো',
    discoverableLabel: 'অন্যদের তালিকায় আমাকে দেখাও',
    save: 'সংরক্ষণ করুন',
    cancel: 'বাতিল',
    signOut: 'লগ আউট',
    darkMode: 'ডার্ক মোড',
    lightMode: 'লাইট মোড',
    incomingAudioCall: 'ইনকামিং অডিও কল...',
    incomingVideoCall: 'ইনকামিং ভিডিও কল...',
    calling: 'রিং হচ্ছে...',
    connecting: 'সংযোগ হচ্ছে...',
    connected: 'সংযুক্ত',
    accept: 'রিসিভ করুন',
    decline: 'কেটে দিন',
    endCall: 'কল শেষ করুন',
    mute: 'মিউট',
    unmute: 'আনমিউট',
    cameraOff: 'ক্যামেরা বন্ধ',
    cameraOn: 'ক্যামেরা চালু',
    callEnded: 'কল শেষ হয়েছে',
    callDeclined: 'কল গ্রহণ করা হয়নি',
    callMissed: 'মিসড কল',
    mediaError: 'মাইক্রোফোন বা ক্যামেরা অ্যাক্সেস পাওয়া যায়নি। ব্রাউজার পারমিশন চেক করুন।',
    today: 'আজ',
    yesterday: 'গতকাল',
    startConversationPrompt: 'হ্যালো লিখে কথোপকথন শুরু করুন!',
    youPrefix: 'আপনি: ',
    errorTitle: 'একটি সমস্যা হয়েছে',
    retry: 'আবার চেষ্টা করুন',
  },
  en: {
    appName: 'Alap',
    tagline: 'Real-Time Messaging & Audio/Video Calls',
    authTitle: 'Effortless real-time conversations',
    authSubtitle:
      'Message teammates and friends on a live database, see real-time online presence, watch live typing indicators, and jump into audio or video calls.',
    featureRealtime: 'Instant message sync with read receipts',
    featurePresence: 'Live online presence & last-seen timestamps',
    featureTyping: 'Real-time typing indicator per conversation',
    featureCalls: 'Peer-to-peer HD audio and video calling',
    signInWithGoogle: 'Continue with Google',
    signingIn: 'Signing in...',
    signInNote: 'Sign in securely with Google or your email / phone number.',
    authTabSignIn: 'Sign In',
    authTabSignUp: 'Create Account',
    fullNameLabel: 'Full Name',
    fullNamePlaceholder: 'e.g. Tanvir Ahmed',
    identifierLabel: 'Email or Phone Number',
    identifierPlaceholder: 'name@example.com or 017XXXXXXXX',
    passwordLabel: 'Password',
    passwordPlaceholder: 'At least 6 characters',
    submitSignIn: 'Sign In',
    submitSignUp: 'Create Account',
    creatingAccount: 'Creating account...',
    orDivider: 'or',
    errNameRequired: 'Please enter your name.',
    errIdentifierInvalid: 'Enter a valid email or a phone number (at least 6 digits).',
    errPasswordWeak: 'Password must be at least 6 characters long.',
    errInvalidCredential: 'Incorrect email/phone number or password.',
    errAccountExists: 'An account already exists with this email or phone number. Please sign in.',
    errProviderDisabled:
      'Please enable Email/Password sign-in under Authentication > Sign-in method in Firebase Console.',
    errUnauthorizedDomain: (host: string) =>
      `Domain (${host}) is not listed under Authorized domains in Firebase Console > Authentication > Settings.`,
    chatsTab: 'Chats',
    peopleTab: 'People',
    searchPlaceholder: 'Search by name...',
    online: 'Online',
    offline: 'Offline',
    typing: 'typing...',
    lastSeenPrefix: 'Last seen',
    justNow: 'just now',
    minutesAgo: (n: number) => `${n}m ago`,
    hoursAgo: (n: number) => `${n}h ago`,
    daysAgo: (n: number) => `${n}d ago`,
    noChatsTitle: 'No conversations yet',
    noChatsDesc: 'Switch to the People tab to start messaging someone.',
    browsePeople: 'Browse People',
    noPeopleTitle: 'No other users found',
    noPeopleDesc: 'When another user signs in, they will appear here right away.',
    selectChatTitle: 'Select a conversation',
    selectChatDesc: 'Pick a chat or person from the sidebar to send messages or start an audio or video call.',
    messagePlaceholder: 'Write a message...',
    send: 'Send',
    audioCall: 'Audio Call',
    videoCall: 'Video Call',
    profileSettings: 'Profile Settings',
    displayName: 'Display Name',
    bio: 'Bio / Status',
    discoverableLabel: 'Show me in the People directory',
    save: 'Save Changes',
    cancel: 'Cancel',
    signOut: 'Sign Out',
    darkMode: 'Dark Mode',
    lightMode: 'Light Mode',
    incomingAudioCall: 'Incoming audio call...',
    incomingVideoCall: 'Incoming video call...',
    calling: 'Ringing...',
    connecting: 'Connecting...',
    connected: 'Connected',
    accept: 'Accept',
    decline: 'Decline',
    endCall: 'End Call',
    mute: 'Mute',
    unmute: 'Unmute',
    cameraOff: 'Camera Off',
    cameraOn: 'Camera On',
    callEnded: 'Call ended',
    callDeclined: 'Call declined',
    callMissed: 'Missed call',
    mediaError: 'Could not access microphone or camera. Please check browser permissions.',
    today: 'Today',
    yesterday: 'Yesterday',
    startConversationPrompt: 'Say hello to start the conversation!',
    youPrefix: 'You: ',
    errorTitle: 'Something went wrong',
    retry: 'Reload',
  },
} as const;

export function isUserActuallyOnline(isOnline: boolean, lastSeen: Timestamp | null, nowMs: number): boolean {
  if (!isOnline || !lastSeen) return false;
  const diff = nowMs - lastSeen.toMillis();
  return diff < 75_000;
}

export function formatRelativeLastSeen(
  lastSeen: Timestamp | null,
  locale: Locale,
  nowMs: number
): string {
  const t = COPY[locale];
  if (!lastSeen) return t.offline;
  const diffSec = Math.max(0, Math.floor((nowMs - lastSeen.toMillis()) / 1000));
  if (diffSec < 60) return `${t.lastSeenPrefix} ${t.justNow}`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${t.lastSeenPrefix} ${t.minutesAgo(diffMin)}`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${t.lastSeenPrefix} ${t.hoursAgo(diffHr)}`;
  const diffDays = Math.floor(diffHr / 24);
  return `${t.lastSeenPrefix} ${t.daysAgo(diffDays)}`;
}

export function formatMessageTime(ts: Timestamp | null, locale: Locale): string {
  if (!ts) return '';
  const d = ts.toDate();
  return d.toLocaleTimeString(locale === 'bn' ? 'bn-BD' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDuration(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}
