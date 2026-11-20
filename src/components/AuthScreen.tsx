import { useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
} from 'firebase/auth';
import {
  Check,
  Eye,
  EyeOff,
  Languages,
  MessageSquare,
  Moon,
  Radio,
  Sun,
  Video,
} from 'lucide-react';
import {
  resolveIdentifierToAuthEmail,
  setPendingSignupDisplayName,
} from '../lib/chatService';
import { auth, googleProvider } from '../lib/firebase';
import { COPY, Locale } from '../lib/i18n';

interface AuthScreenProps {
  locale: Locale;
  onToggleLocale: () => void;
  isDark: boolean;
  onToggleDark: () => void;
}

export function AuthScreen({ locale, onToggleLocale, isDark, onToggleDark }: AuthScreenProps) {
  const t = COPY[locale];
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [fullName, setFullName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const mapAuthError = (err: unknown): string => {
    const code = (err as { code?: string })?.code ?? '';
    const msg = err instanceof Error ? err.message : String(err);

    if (code === 'auth/unauthorized-domain' || msg.includes('auth/unauthorized-domain')) {
      const host = typeof window !== 'undefined' ? window.location.hostname : 'this domain';
      return t.errUnauthorizedDomain(host);
    }
    if (code === 'auth/operation-not-allowed' || msg.includes('auth/operation-not-allowed')) {
      return t.errProviderDisabled;
    }
    if (
      code === 'auth/invalid-credential' ||
      code === 'auth/wrong-password' ||
      code === 'auth/user-not-found'
    ) {
      return t.errInvalidCredential;
    }
    if (code === 'auth/email-already-in-use') {
      return t.errAccountExists;
    }
    if (code === 'auth/weak-password') {
      return t.errPasswordWeak;
    }
    return msg;
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setErrorMsg(mapAuthError(err));
      setLoading(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setErrorMsg(null);

    const trimmedName = fullName.trim();
    if (mode === 'signup' && trimmedName.length < 1) {
      setErrorMsg(t.errNameRequired);
      return;
    }

    const resolved = resolveIdentifierToAuthEmail(identifier);
    if (!resolved) {
      setErrorMsg(t.errIdentifierInvalid);
      return;
    }

    if (password.length < 6) {
      setErrorMsg(t.errPasswordWeak);
      return;
    }

    setLoading(true);
    try {
      if (mode === 'signup') {
        setPendingSignupDisplayName(trimmedName);
        const cred = await createUserWithEmailAndPassword(auth, resolved.authEmail, password);
        await updateProfile(cred.user, { displayName: trimmedName });
      } else {
        await signInWithEmailAndPassword(auth, resolved.authEmail, password);
      }
    } catch (err) {
      setPendingSignupDisplayName(null);
      setErrorMsg(mapAuthError(err));
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      {/* Clean 3-zone Top Bar Contract */}
      <header className="w-full max-w-6xl mx-auto px-6 py-5 flex items-center justify-between gap-8 border-b border-slate-200/80 dark:border-slate-800/80">
        <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0">
          {t.appName}
        </span>

        <div className="flex items-center gap-6 text-sm text-slate-600 dark:text-slate-400">
          <button
            type="button"
            onClick={onToggleLocale}
            className="inline-flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Languages className="w-4 h-4" />
            <span>{locale === 'bn' ? 'English' : 'বাংলা'}</span>
          </button>
          <button
            type="button"
            onClick={onToggleDark}
            aria-label={isDark ? t.lightMode : t.darkMode}
            className="inline-flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            <span>{isDark ? t.lightMode : t.darkMode}</span>
          </button>
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-white bg-teal-700 hover:bg-teal-800 disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          {loading ? t.signingIn : t.signInWithGoogle}
        </button>
      </header>

      {/* Main Split Content */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-6 py-10 lg:py-14 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        <div className="lg:col-span-6 space-y-6">
          <p className="text-sm font-medium text-teal-700 dark:text-teal-400">
            {t.tagline}
          </p>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight [text-wrap:balance]">
            {t.authTitle}
          </h1>
          <p className="text-base text-slate-600 dark:text-slate-400 leading-relaxed max-w-xl">
            {t.authSubtitle}
          </p>

          <ul className="space-y-3 pt-2">
            {[
              { icon: MessageSquare, text: t.featureRealtime },
              { icon: Radio, text: t.featurePresence },
              { icon: Check, text: t.featureTyping },
              { icon: Video, text: t.featureCalls },
            ].map((item, idx) => (
              <li key={idx} className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
                <span className="w-7 h-7 rounded-lg bg-teal-700/10 dark:bg-teal-500/15 text-teal-700 dark:text-teal-400 flex items-center justify-center shrink-0">
                  <item.icon className="w-4 h-4" />
                </span>
                <span>{item.text}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="lg:col-span-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 space-y-5">
            {/* Segmented Mode Toggle: Sign In vs Create Account */}
            <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setErrorMsg(null);
                }}
                className={`py-2 px-3 text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                  mode === 'signin'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {t.authTabSignIn}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setErrorMsg(null);
                }}
                className={`py-2 px-3 text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                  mode === 'signup'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {t.authTabSignUp}
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300 leading-relaxed">
                {errorMsg}
              </div>
            )}

            <form onSubmit={(e) => void handleFormSubmit(e)} className="space-y-4">
              {mode === 'signup' && (
                <div className="space-y-1.5">
                  <label
                    htmlFor="auth-fullname"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300"
                  >
                    {t.fullNameLabel}
                  </label>
                  <input
                    id="auth-fullname"
                    type="text"
                    required
                    maxLength={80}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder={t.fullNamePlaceholder}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-teal-600 dark:focus:border-teal-500"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label
                  htmlFor="auth-identifier"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300"
                >
                  {t.identifierLabel}
                </label>
                <input
                  id="auth-identifier"
                  type="text"
                  required
                  autoComplete="username"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder={t.identifierPlaceholder}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-teal-600 dark:focus:border-teal-500"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="auth-password"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300"
                >
                  {t.passwordLabel}
                </label>
                <div className="relative">
                  <input
                    id="auth-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t.passwordPlaceholder}
                    className="w-full pl-3.5 pr-10 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-teal-600 dark:focus:border-teal-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-teal-700 hover:bg-teal-800 disabled:opacity-60 text-white font-medium text-sm rounded-xl transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600"
              >
                {loading
                  ? mode === 'signup'
                    ? t.creatingAccount
                    : t.signingIn
                  : mode === 'signup'
                  ? t.submitSignUp
                  : t.submitSignIn}
              </button>
            </form>

            <div className="relative flex items-center py-1">
              <div className="flex-1 border-t border-slate-200 dark:border-slate-800" />
              <span className="px-3 text-xs text-slate-400 dark:text-slate-500">
                {t.orDivider}
              </span>
              <div className="flex-1 border-t border-slate-200 dark:border-slate-800" />
            </div>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full py-2.5 px-4 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 disabled:opacity-60 text-slate-800 dark:text-slate-100 font-medium text-sm rounded-xl flex items-center justify-center gap-3 transition-colors cursor-pointer"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="currentColor"
                    d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27 3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10 5.35 0 9.25-3.67 9.25-9.09 0-1.15-.15-1.81-.15-1.81Z"
                  />
                </svg>
                <span>{t.signInWithGoogle}</span>
              </button>
              <p className="text-xs text-center text-slate-500 dark:text-slate-400">
                {t.signInNote}
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
