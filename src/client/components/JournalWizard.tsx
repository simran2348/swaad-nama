import { showToast } from '@devvit/web/client';
import { useEffect, useState, type ComponentType } from 'react';
import { createPortal } from 'react-dom';
import type {
  ImportPostResponse,
  JournalKind,
  JournalPhoto,
} from '../../shared/api';
import { JOURNAL_LIMITS, journalProblem } from '../../shared/journal';
import { importPost, saveJournal } from '../lib/api';
import { preloadImages } from '../lib/art';
import { useTheme } from '../lib/theme';
import { riseDelay } from '../lib/motion';
import { ThemeSurface } from './FoodBackground';
import {
  ArrowRightIcon,
  HomeIcon,
  InfoIcon,
  PinIcon,
  PlateIcon,
} from './icons';
import {
  BackButton,
  CommentNote,
  EmptyState,
  LoadingState,
  ScreenHeader,
  Spinner,
} from './ui';

const KINDS: readonly {
  id: JournalKind;
  label: string;
  hint: string;
  icon: ComponentType<{ className?: string }>;
}[] = [
  {
    id: 'travel',
    label: 'Travel',
    hint: 'Food you tried on a trip or holiday',
    icon: PinIcon,
  },
  {
    id: 'home',
    label: 'Home-made',
    hint: 'Food cooked at home',
    icon: HomeIcon,
  },
  {
    id: 'recipe',
    label: 'Recipe',
    hint: 'How to make the dish, step by step',
    icon: PlateIcon,
  },
];

/** What happens to the photos, shown above them. */
const KIND_INFO: Record<JournalKind, string> = {
  travel: 'All the photos are saved together as one trip.',
  home: 'Each photo is saved on its own. Add a recipe to a photo and it goes in Recipes instead of Home-made.',
  recipe: 'Each photo is saved as its own recipe, so every photo needs one.',
};

const inputClass =
  'w-full rounded-lg border border-line bg-field px-3 py-2 text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-cta';
const labelClass = 'flex flex-col gap-1 text-sm font-semibold text-ink';

const Optional = () => (
  <span className="font-normal text-muted">(optional)</span>
);

/**
 * Full-screen flow for adding one of your posts to your journal: first pick
 * Travel, Home-made or Recipe, then name the dish in each photo (plus the
 * place for a trip, or recipes for home-made food and recipes).
 */
export const JournalWizard = ({
  postId,
  onCancel,
  onDone,
}: {
  postId: string;
  onCancel: () => void;
  /** Called after saving, with the section the post went to. */
  onDone: (section: JournalKind) => void;
}) => {
  const [post, setPost] = useState<ImportPostResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [kind, setKind] = useState<JournalKind | null>(null);
  const [photos, setPhotos] = useState<JournalPhoto[]>([]);
  const [place, setPlace] = useState('');
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // The loader stays until the post and its photos have loaded.
    importPost(postId)
      .then(async (res) => {
        await preloadImages(res.images);
        if (cancelled) return;
        setPost(res);
        // A post without photos still gets one dish.
        const images = res.images.length > 0 ? res.images : [''];
        setPhotos(images.map((image) => ({ image, dish: '', recipe: '' })));
        setBody(res.body.slice(0, JOURNAL_LIMITS.body));
      })
      .catch((err: Error) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, [postId]);

  const updatePhoto = (index: number, patch: Partial<JournalPhoto>) =>
    setPhotos((prev) =>
      prev.map((photo, i) => (i === index ? { ...photo, ...patch } : photo))
    );

  const problem = kind ? journalProblem(kind, place, photos) : null;

  const save = async () => {
    if (!kind || !post || problem || saving) return;
    setSaving(true);
    try {
      const { entries } = await saveJournal({
        postId: post.postId,
        kind,
        place,
        body,
        photos,
      });
      const recipes = entries.filter((e) => e.kind === 'recipe').length;
      const home = entries.length - recipes;
      showToast(
        kind === 'home' && recipes > 0 && home > 0
          ? `Added ${home} home-made and ${recipes} ${recipes === 1 ? 'recipe' : 'recipes'} to your journal`
          : 'Added to your journal!'
      );
      // Home-made with only recipes ends up in Recipes.
      onDone(entries[0]?.kind ?? kind);
    } catch (err) {
      setSaving(false);
      showToast(
        `Couldn't add it: ${err instanceof Error ? err.message : 'unknown error'}`
      );
    }
  };

  const back = () => (kind ? setKind(null) : onCancel());

  return createPortal(
    <div className="fixed inset-0 z-30 mx-auto flex max-w-[768px] flex-col">
      <ThemeSurface
        palette={useTheme()}
        withArt={false}
        className="absolute inset-0 -z-10"
      />
      <ScreenHeader
        title="Add to journal"
        compact
        {...(post ? { subtitle: post.title } : {})}
        left={<BackButton onClick={back} />}
      />

      {error ? (
        <EmptyState>Couldn't load this post: {error}</EmptyState>
      ) : !post ? (
        <LoadingState label="Loading your post…" />
      ) : !kind ? (
        <main className="scroll-area mx-auto flex w-full max-w-md flex-1 flex-col gap-3 px-4 pt-5 pb-8">
          <h2 className="text-lg font-extrabold text-ink">
            What kind of post is this?
          </h2>
          {KINDS.map(({ id, label, hint, icon: Icon }, i) => (
            <button
              key={id}
              type="button"
              onClick={() => setKind(id)}
              style={riseDelay(i)}
              className="rise flex items-center gap-3 rounded-2xl border border-line bg-surface p-3.5 text-left shadow-sm cursor-pointer transition hover:-translate-y-0.5 hover:border-cta hover:shadow-md"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-cta-tint text-cta">
                <Icon className="h-6 w-6" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="font-extrabold text-ink">{label}</span>
                <span className="text-sm text-muted">{hint}</span>
              </span>
              <ArrowRightIcon className="h-5 w-5 shrink-0 text-muted" />
            </button>
          ))}
        </main>
      ) : (
        <>
          <main
            key={kind}
            className="scroll-area mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 pt-4 pb-8"
          >
            <p className="flex gap-2 rounded-xl bg-cta-tint px-3 py-2.5 text-sm text-ink">
              <InfoIcon className="mt-0.5 h-4 w-4 shrink-0 text-cta" />
              {KIND_INFO[kind]}
            </p>

            {photos.map((photo, i) => (
              <section
                key={photo.image || i}
                aria-label={`Photo ${i + 1}`}
                className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-3 shadow-sm"
              >
                {photo.image ? (
                  <img
                    src={photo.image}
                    alt={`Photo ${i + 1} from your post`}
                    className="h-48 w-full rounded-xl bg-black object-cover"
                  />
                ) : (
                  <span className="flex h-24 items-center justify-center rounded-xl bg-cta-tint text-cta">
                    <PlateIcon className="h-9 w-9" />
                  </span>
                )}
                {photos.length > 1 && (
                  <span className="-mt-1 text-xs font-semibold text-muted">
                    Photo {i + 1} of {photos.length}
                  </span>
                )}
                <label className={labelClass}>
                  Dish name
                  <input
                    className={inputClass}
                    value={photo.dish}
                    maxLength={JOURNAL_LIMITS.dish}
                    placeholder="e.g. Misal pav"
                    onChange={(e) => updatePhoto(i, { dish: e.target.value })}
                  />
                </label>
                {kind !== 'travel' && (
                  <label className={labelClass}>
                    <span>Recipe {kind === 'home' && <Optional />}</span>
                    <textarea
                      className={`${inputClass} min-h-28`}
                      value={photo.recipe}
                      maxLength={JOURNAL_LIMITS.recipe}
                      placeholder="Ingredients and steps…"
                      onChange={(e) =>
                        updatePhoto(i, { recipe: e.target.value })
                      }
                    />
                  </label>
                )}
              </section>
            ))}

            {kind === 'travel' && (
              <label className={labelClass}>
                Place
                <input
                  className={inputClass}
                  value={place}
                  maxLength={JOURNAL_LIMITS.place}
                  placeholder="e.g. Goa, or a café like Britto's, Baga"
                  onChange={(e) => setPlace(e.target.value)}
                />
              </label>
            )}

            <label className={labelClass}>
              <span>
                Notes <Optional />
              </span>
              <textarea
                className={`${inputClass} min-h-24`}
                value={body}
                maxLength={JOURNAL_LIMITS.body}
                placeholder="Anything else you want to remember"
                onChange={(e) => setBody(e.target.value)}
              />
            </label>
          </main>

          <div className="flex gap-2 border-t border-line bg-surface px-4 py-3 backdrop-blur">
            <button
              onClick={back}
              className="rounded-full border border-line bg-soft px-5 py-2.5 text-sm font-bold text-soft-ink cursor-pointer hover:brightness-95"
            >
              Back
            </button>
            <button
              disabled={problem !== null || saving}
              onClick={() => void save()}
              className="flex flex-1 items-center justify-center gap-2 rounded-full bg-cta px-4 py-2.5 font-bold text-cta-ink shadow-md cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Spinner className="h-4 w-4" /> Saving…
                </>
              ) : (
                'Save to journal'
              )}
            </button>
          </div>
          {problem ? (
            <p className="bg-surface px-4 pb-3 text-center text-xs text-muted">
              {problem}
            </p>
          ) : (
            <CommentNote className="bg-surface px-4 pb-3" />
          )}
        </>
      )}
    </div>,
    document.body
  );
};
