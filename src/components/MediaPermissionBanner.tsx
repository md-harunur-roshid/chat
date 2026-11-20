import { Mic, Video, X } from 'lucide-react';
import { COPY, Locale } from '../lib/i18n';
import { MediaPermissionState } from '../lib/mediaPermissions';

interface MediaPermissionBannerProps {
  permissions: MediaPermissionState;
  requesting: boolean;
  wasDeniedOnTry: boolean;
  locale: Locale;
  onRequestPermission: () => void;
  onDismiss: () => void;
}

export function MediaPermissionBanner({
  permissions,
  requesting,
  wasDeniedOnTry,
  locale,
  onRequestPermission,
  onDismiss,
}: MediaPermissionBannerProps) {
  const t = COPY[locale];
  const isDenied = permissions.mic === 'denied' || permissions.camera === 'denied' || wasDeniedOnTry;

  return (
    <div className="bg-teal-50 dark:bg-teal-950/50 border-b border-teal-200 dark:border-teal-900/70 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="w-8 h-8 rounded-lg bg-teal-700/10 dark:bg-teal-500/20 text-teal-700 dark:text-teal-300 flex items-center justify-center gap-0.5 shrink-0">
          <Mic className="w-3.5 h-3.5" />
          <Video className="w-3.5 h-3.5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-900 dark:text-white">
            {t.permBannerTitle}
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-snug">
            {permissions.mic === 'unsupported'
              ? t.permUnsupported
              : isDenied
              ? t.permDeniedDesc
              : t.permBannerDesc}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {permissions.mic !== 'unsupported' && (
          <button
            type="button"
            onClick={onRequestPermission}
            disabled={requesting}
            className="px-3 py-1.5 text-xs font-medium text-white bg-teal-700 hover:bg-teal-800 disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
          >
            {requesting
              ? t.permRequesting
              : isDenied
              ? t.permRetryBtn
              : t.permGrantBtn}
          </button>
        )}
        <button
          type="button"
          onClick={onDismiss}
          aria-label={t.permDismissBtn}
          title={t.permDismissBtn}
          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-teal-100/70 dark:hover:bg-teal-900/50 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
