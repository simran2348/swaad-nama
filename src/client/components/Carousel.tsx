import { useRef, useState } from 'react';
import { Photo } from './Photo';

/**
 * Swipeable photos, one at a time, with dots instead of a scrollbar.
 * Tapping a dot jumps to that photo. `onIndexChange` reports the photo in view.
 */
export const Carousel = ({
  images,
  className = '',
  onIndexChange,
}: {
  images: string[];
  /** Size and shape of the frame, e.g. `h-52 rounded-xl`. */
  className?: string;
  onIndexChange?: (index: number) => void;
}) => {
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  const onScroll = () => {
    const el = track.current;
    if (!el || el.clientWidth === 0) return;
    const next = Math.round(el.scrollLeft / el.clientWidth);
    if (next !== index) {
      setIndex(next);
      onIndexChange?.(next);
    }
  };

  const goTo = (i: number) => {
    const el = track.current;
    if (el) el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' });
  };

  return (
    <div className={`relative overflow-hidden bg-black ${className}`}>
      <div
        ref={track}
        onScroll={onScroll}
        className="no-scrollbar flex h-full snap-x snap-mandatory overflow-x-auto"
      >
        {images.map((url, i) => (
          <Photo
            key={url}
            src={url}
            alt={`Photo ${i + 1} of ${images.length}`}
            className="relative h-full w-full shrink-0 snap-center"
          />
        ))}
      </div>
      {images.length > 1 && (
        <div className="absolute inset-x-0 bottom-2 flex justify-center gap-1.5">
          {images.map((url, i) => (
            <button
              key={url}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Show photo ${i + 1}`}
              aria-current={i === index}
              className={`h-2 rounded-full shadow transition-all cursor-pointer ${
                i === index ? 'w-5 bg-white' : 'w-2 bg-white/55'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};
