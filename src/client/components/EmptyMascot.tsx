import { useState, type ReactNode } from 'react';

/**
 * Centred empty state: an illustration, a heading and a message.
 * The illustration is hidden if it fails to load.
 */
export const EmptyMascot = ({
  src,
  width,
  height,
  alt,
  title,
  children,
}: {
  src: string;
  /** Pixel size, so the space is reserved before it loads. */
  width: number;
  height: number;
  alt: string;
  title: string;
  children: ReactNode;
}) => {
  const [failed, setFailed] = useState(false);
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-8 text-center">
      {!failed && (
        <img
          src={src}
          alt={alt}
          width={width}
          height={height}
          onError={() => setFailed(true)}
          className="h-36 w-auto max-w-full object-contain"
        />
      )}
      <h3 className="mt-2 text-lg font-extrabold text-ink">{title}</h3>
      <p className="max-w-xs text-sm text-muted">{children}</p>
    </div>
  );
};
