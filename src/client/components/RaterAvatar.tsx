import { useState } from 'react';
import { FALLBACK_AVATAR_URL } from '../lib/art';

/** Round Snoo avatar, showing its head and shoulders. */
export const RaterAvatar = ({
  url,
  className = 'h-10 w-10 ring-2 ring-surface',
}: {
  url: string | null;
  /** Size (and ring) of the circle. */
  className?: string;
}) => {
  const [failed, setFailed] = useState(false);
  return (
    <span
      className={`flex ${className} shrink-0 items-end justify-center overflow-hidden rounded-full bg-soft`}
    >
      <img
        src={url && !failed ? url : FALLBACK_AVATAR_URL}
        alt=""
        loading="lazy"
        onError={() => setFailed(true)}
        className="h-[140%] w-auto max-w-none translate-y-[18%] object-contain"
      />
    </span>
  );
};
