import { useState } from 'react';

interface AvatarProps {
  src?: string;
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showPresence?: boolean;
  isOnline?: boolean;
}

const SIZE_CLASSES: Record<NonNullable<AvatarProps['size']>, string> = {
  sm: 'w-9 h-9 text-xs',
  md: 'w-11 h-11 text-sm',
  lg: 'w-14 h-14 text-base',
  xl: 'w-20 h-20 text-xl',
};

const DOT_CLASSES: Record<NonNullable<AvatarProps['size']>, string> = {
  sm: 'w-2.5 h-2.5 border-2',
  md: 'w-3 h-3 border-2',
  lg: 'w-3.5 h-3.5 border-2',
  xl: 'w-4 h-4 border-2',
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Avatar({
  src,
  name,
  size = 'md',
  showPresence = false,
  isOnline = false,
}: AvatarProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const showImage = Boolean(src && src.trim().length > 0 && !imgFailed);

  return (
    <div className="relative inline-flex shrink-0">
      {showImage ? (
        <img
          src={src}
          alt={name}
          referrerPolicy="no-referrer"
          onError={() => setImgFailed(true)}
          className={`${SIZE_CLASSES[size]} rounded-full object-cover bg-slate-200 dark:bg-slate-800`}
        />
      ) : (
        <div
          aria-label={name}
          className={`${SIZE_CLASSES[size]} rounded-full bg-teal-700/10 dark:bg-teal-500/20 text-teal-800 dark:text-teal-300 font-semibold flex items-center justify-center select-none`}
        >
          {getInitials(name)}
        </div>
      )}

      {showPresence && (
        <span
          aria-label={isOnline ? 'Online' : 'Offline'}
          className={`absolute bottom-0 right-0 rounded-full border-white dark:border-slate-900 ${
            DOT_CLASSES[size]
          } ${isOnline ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}
        />
      )}
    </div>
  );
}
