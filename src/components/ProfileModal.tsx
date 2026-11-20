import { useState } from 'react';
import { X } from 'lucide-react';
import { updateUserProfileDetails } from '../lib/chatService';
import { BLUEPRINT_LIMITS } from '../lib/firebase';
import { COPY, Locale } from '../lib/i18n';
import { UserProfile } from '../types/chat';
import { Avatar } from './Avatar';

interface ProfileModalProps {
  user: UserProfile;
  locale: Locale;
  onClose: () => void;
}

export function ProfileModal({ user, locale, onClose }: ProfileModalProps) {
  const t = COPY[locale];
  const [displayName, setDisplayName] = useState(user.displayName);
  const [bio, setBio] = useState(user.bio);
  const [isDiscoverable, setIsDiscoverable] = useState(user.isDiscoverable);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim() || saving) return;
    setSaving(true);
    try {
      await updateUserProfileDetails(user.uid, displayName, bio, isDiscoverable);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            {t.profileSettings}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.cancel}
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-4">
          <Avatar src={user.photoURL} name={displayName || user.displayName} size="lg" showPresence isOnline />
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">
              {displayName || user.displayName}
            </div>
            <div className="text-xs text-emerald-600 dark:text-emerald-400">
              {t.online}
            </div>
          </div>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              {t.displayName}
            </label>
            <input
              type="text"
              required
              maxLength={BLUEPRINT_LIMITS.DISPLAY_NAME_MAX}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-teal-600"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              {t.bio}
            </label>
            <input
              type="text"
              maxLength={BLUEPRINT_LIMITS.BIO_MAX}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-teal-600"
            />
          </div>

          <label className="flex items-center gap-2.5 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={isDiscoverable}
              onChange={(e) => setIsDiscoverable(e.target.checked)}
              className="w-4 h-4 rounded accent-teal-700"
            />
            <span>{t.discoverableLabel}</span>
          </label>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              disabled={!displayName.trim() || saving}
              className="px-4 py-2 text-sm font-medium text-white bg-teal-700 hover:bg-teal-800 disabled:opacity-50 rounded-lg transition-colors cursor-pointer"
            >
              {t.save}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
