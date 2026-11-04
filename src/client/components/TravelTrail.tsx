import { TRAIL_HOME_IMAGE } from '../lib/art';
import { riseDelay } from '../lib/motion';
import { PinIcon, PlateIcon } from './icons';

/** One food trip: where you went, a photo and how many dishes you logged. */
export type Trip = {
  id: string;
  place: string;
  dishes: number;
  photo: string | null;
};

// Sizes in px. Each stop is a portrait photo, centred on its side of the
// trail; a little room above it for the hover lift.
const PHOTO_W = 90;
const PHOTO_H = 120;
const PHOTO_TOP = 6;
// Space between the photo's centre and its place name.
const NAME_GAP = PHOTO_W / 2 + 30;
// Home is drawn a bit smaller; the trail ends at its roof peak.
const HOME = 150;
const HOME_H = Math.round(
  (HOME * TRAIL_HOME_IMAGE.height) / TRAIL_HOME_IMAGE.width
);
const HOME_X = Math.round(HOME * (150 / 320));
const HOME_ROOF = Math.round(HOME * (100 / 320));
// The dot under each stop, where its trail leaves from.
const DOT_Y = PHOTO_TOP + PHOTO_H + 16;
// Stops overlap in height: they alternate sides, so they don't collide.
const ROW = 168;
const HOME_ROW = HOME_H + 8;

/** Stops sit left or right of the middle, in turns (as a % of the width). */
const SIDE_X = { left: 24, right: 76 } as const;

/**
 * Journal → Travel: your food trips as a trail on a map. Home is at the
 * bottom; the trail winds up from it, left then right, through each trip
 * (newest at the top). Each stop is a photo with the place name on the
 * other side.
 */
export const TravelTrail = ({
  trips,
  onOpen,
}: {
  trips: readonly Trip[];
  /** Tap a trip's photo to see it. */
  onOpen: (id: string) => void;
}) => {
  // The stop just above home goes on the left, then they alternate.
  const sides = trips.map((_, i) =>
    (trips.length - 1 - i) % 2 === 0 ? 'left' : 'right'
  );
  const height = trips.length * ROW + HOME_ROW;
  // Trail: from each stop's dot down to the top of the next stop's photo
  // (or the roof of home). x in % of the width, y in px.
  const points = [
    ...sides.map((side, i) => ({
      x: SIDE_X[side],
      from: i * ROW + DOT_Y,
      to: i * ROW + PHOTO_TOP,
    })),
    { x: 50, from: 0, to: trips.length * ROW + HOME_ROOF },
  ];
  const paths = points.slice(1).map((end, i) => {
    const start = points[i];
    if (!start) return '';
    const y1 = start.from + 5;
    const y2 = end.to - 6;
    const mid = (y1 + y2) / 2;
    // Stops are close, so the bends reach past them for a gentle wave.
    const bend = Math.max(48, mid - y1);
    return `M${start.x} ${y1} C${start.x} ${y1 + bend} ${end.x} ${y2 - bend} ${end.x} ${y2}`;
  });

  return (
    <div className="relative mx-auto w-full max-w-xl" style={{ height }}>
      {/* Stretched to the box; strokes keep their width and dashes. */}
      <svg
        aria-hidden
        className="absolute inset-0 h-full w-full text-cta opacity-40"
        viewBox={`0 0 100 ${height}`}
        preserveAspectRatio="none"
      >
        {paths.map((d, i) => (
          <path
            key={i}
            d={d}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeDasharray="5 6"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>
      <ol aria-label="Your food trips, newest first">
        {trips.map((trip, i) => {
          const side = sides[i] ?? 'left';
          const x = SIDE_X[side];
          return (
            <li
              key={trip.id}
              className="rise absolute inset-x-0"
              style={{ top: i * ROW, height: ROW, ...riseDelay(i) }}
            >
              <button
                type="button"
                onClick={() => onOpen(trip.id)}
                aria-label={`See your trip to ${trip.place}`}
                className="absolute flex cursor-pointer items-center justify-center overflow-hidden rounded-2xl bg-cta-tint text-cta shadow-md ring-2 ring-surface transition duration-200 hover:-translate-y-1.5 hover:shadow-lg"
                style={{
                  top: PHOTO_TOP,
                  left: `calc(${x}% - ${PHOTO_W / 2}px)`,
                  width: PHOTO_W,
                  height: PHOTO_H,
                }}
              >
                {trip.photo ? (
                  <img
                    src={trip.photo}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover object-top"
                  />
                ) : (
                  <PlateIcon className="h-8 w-8" />
                )}
              </button>
              <span
                aria-hidden
                className="absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cta"
                style={{ top: DOT_Y, left: `${x}%` }}
              />
              {/* The place name, on the other side of the trail. */}
              <div
                className="absolute flex -translate-y-1/2 flex-col items-center gap-0.5 px-1 text-center"
                style={{
                  top: PHOTO_TOP + PHOTO_H / 2,
                  ...(side === 'left'
                    ? { left: `calc(${x}% + ${NAME_GAP}px)`, right: 0 }
                    : { right: `calc(${100 - x}% + ${NAME_GAP}px)`, left: 0 }),
                }}
              >
                <span className="flex items-center gap-1 text-lg leading-tight font-extrabold break-words text-ink">
                  <PinIcon className="h-4 w-4 shrink-0 text-cta" />
                  {trip.place}
                </span>
                <span className="text-xs font-semibold text-muted">
                  {trip.dishes} {trip.dishes === 1 ? 'dish' : 'dishes'}
                </span>
              </div>
            </li>
          );
        })}
        <li
          className="rise absolute inset-x-0"
          style={{
            top: trips.length * ROW,
            height: HOME_ROW,
            ...riseDelay(trips.length),
          }}
        >
          <img
            src={TRAIL_HOME_IMAGE.src}
            alt="Home, where the trail starts"
            width={HOME}
            height={HOME_H}
            className="absolute top-0 max-w-none select-none"
            style={{ left: `calc(50% - ${HOME_X}px)` }}
          />
        </li>
      </ol>
    </div>
  );
};
