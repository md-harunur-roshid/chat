import { useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { Check, Languages, MessageSquare, Moon, PhoneCall, Radio, Sun, Video } from 'lucide-react';
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
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Sign-in failed.';
      setErrorMsg(msg);
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
      <main className="flex-1 w-full max-w-6xl mx-auto px-6 py-12 lg:py-16 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
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
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 space-y-6">
            {/* Bespoke SVG Communication Visual */}
            <div className="rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 p-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-teal-700 text-white text-xs font-semibold flex items-center justify-center">
                      আ
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-900 dark:text-white">
                        {locale === 'bn' ? 'তানভীর আহমেদ' : 'Tanvir Ahmed'}
                      </div>
                      <div className="text-xs text-emerald-600 dark:text-emerald-400">
                        {t.online} · {t.typing}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                    <PhoneCall className="w-4 h-4" />
                    <Video className="w-4 h-4" />
                  </div>
                </div>

                <div className="space-y-2 pt-1">
                  <div className="max-w-[80%] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl rounded-tl-sm px-3.5 py-2 text-xs text-slate-700 dark:text-slate-200">
                    {locale === 'bn'
                      ? 'হ্যালো! প্রজেক্ট মিটিংয়ের জন্য কি এখন ভিডিও কল করব?'
                      : 'Hey! Ready to jump on a quick video call?'}
                  </div>
                  <div className="ml-auto max-w-[75%] bg-teal-700 text-white rounded-xl rounded-tr-sm px-3.5 py-2 text-xs">
                    {locale === 'bn'
                      ? 'হ্যাঁ অবশ্যই, আমি অনলাইনে আছি। কল দাও!'
                      : 'Yes! I am online now, go ahead and call.'}
                  </div>
                </div>
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300">
                {errorMsg}
              </div>
            )}

            <div className="space-y-3">
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full py-3 px-4 bg-teal-700 hover:bg-teal-800 disabled:opacity-60 text-white font-medium text-sm rounded-xl flex items-center justify-center gap-3 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="currentColor"
                    d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27 3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10 5.35 0 9.25-3.67 9.25-9.09 0-1.15-.15-1.81-.15-1.81Z"
                  />
                </svg>
                <span>{loading ? t.signingIn : t.signInWithGoogle}</span>
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
