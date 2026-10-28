// The header's melting bottom edge. The drip shapes come from a designed
// SVG (three drips and a shallow dip, in its own units), repeated across
// the screen at a fixed size: a wider screen shows more drips.
type Point = [x: number, y: number];
type Curve = [c1: Point, c2: Point, end: Point];

// Left to right, starting at an arch top (90, 75).
const DRIP_START: Point = [90, 75];
const DRIP_CURVES: Curve[] = [
  [
    [107, 70],
    [126, 74],
    [137, 89],
  ],
  [
    [147, 103],
    [148, 128],
    [158, 137],
  ],
  [
    [167, 144],
    [177, 140],
    [181, 127],
  ],
  [
    [188, 107],
    [190, 86],
    [209, 75],
  ],
  [
    [224, 66],
    [248, 66],
    [258, 86],
  ],
  [
    [267, 104],
    [260, 124],
    [265, 140],
  ],
  // The big drip's tip: a round bottom (flatter in the original).
  [
    [269, 153],
    [276, 166],
    [290, 166],
  ],
  [
    [304, 166],
    [314, 156],
    [314, 140],
  ],
  [
    [314, 120],
    [315, 88],
    [329, 76],
  ],
  [
    [343, 66],
    [364, 70],
    [372, 89],
  ],
  [
    [378, 106],
    [379, 127],
    [396, 129],
  ],
  [
    [411, 131],
    [416, 111],
    [428, 100],
  ],
  [
    [440, 89],
    [453, 95],
    [473, 103],
  ],
  // Back up to the next tile's start, matching both ends' slopes.
  [
    [499, 113],
    [506, 82],
    [530, 75],
  ],
];
const DRIP_TILE = 440; // 530 - 90: where the next tile starts.
const DRIP_TOP = 60; // Design units above this are the solid header.
const DRIP_SCALE = 0.62;
const EDGE_WIDTH = 960; // Wider than the app ever gets.
// Drip length per tile, so the repeat isn't obvious.
const DRIP_STRETCH = [1, 0.82, 1.1, 0.9];
const EDGE_HEIGHT = Math.ceil((170 - DRIP_TOP) * DRIP_SCALE * 1.1);

const r1 = (n: number) => Math.round(n * 10) / 10;

const EDGE_PATH = (() => {
  const tileWidth = DRIP_TILE * DRIP_SCALE;
  const tiles = Math.ceil(EDGE_WIDTH / tileWidth) + 1;
  // Design units to pixels, for tile t; stretches only below the arches.
  const at = ([x, y]: Point, t: number): string => {
    const stretch = DRIP_STRETCH[t % DRIP_STRETCH.length] ?? 1;
    const dy =
      y > DRIP_START[1] ? DRIP_START[1] + (y - DRIP_START[1]) * stretch : y;
    return `${r1((x - DRIP_START[0]) * DRIP_SCALE + t * tileWidth)} ${r1((dy - DRIP_TOP) * DRIP_SCALE)}`;
  };
  let d = `M0 0L${at(DRIP_START, 0)}`;
  for (let t = 0; t < tiles; t++) {
    for (const [c1, c2, end] of DRIP_CURVES) {
      d += `C${at(c1, t)} ${at(c2, t)} ${at(end, t)}`;
    }
  }
  return `${d}L${r1(tiles * tileWidth)} 0Z`;
})();

/** Coloured header with a big title and a melting bottom edge. */
export const DripHeader = ({ title }: { title: string }) => (
  <header className="relative shrink-0 overflow-hidden">
    <div className="bg-cta px-4 pt-[max(1.75rem,env(safe-area-inset-top))] pb-2 text-center text-cta-ink">
      <h1 className="text-4xl font-extrabold tracking-tight">{title}</h1>
    </div>
    {/* Fixed-size drawing, cut off at the screen's width. */}
    <svg
      width={EDGE_WIDTH}
      height={EDGE_HEIGHT}
      aria-hidden="true"
      className="-mt-0.5 block max-w-none text-cta"
    >
      <path d={EDGE_PATH} fill="currentColor" />
    </svg>
  </header>
);
