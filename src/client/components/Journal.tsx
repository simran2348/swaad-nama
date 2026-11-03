import { SectionHeading } from './Brand';
import { BookIcon } from './icons';
import { ScreenHeader } from './ui';

/** Tab: your food diary. Empty for now; entries come in a later version. */
export const Journal = () => (
  <div className="flex h-full min-h-0 flex-1 flex-col">
    <ScreenHeader title="Journal" subtitle="Your food diary" />
    <main className="scroll-area flex flex-1 flex-col items-center justify-center gap-3 px-6 py-8 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-soft text-cta">
        <BookIcon className="h-8 w-8" />
      </span>
      <SectionHeading>Coming soon</SectionHeading>
      <p className="max-w-xs text-sm text-muted">
        A diary of everything you eat and where. Check back soon.
      </p>
    </main>
  </div>
);
