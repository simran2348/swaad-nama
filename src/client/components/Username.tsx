import { showToast } from '@devvit/web/client';
import { CopyIcon } from './icons';

/** Copies text, falling back to a hidden textarea where the clipboard API is blocked. */
const copyText = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    return;
  } catch {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    if (!ok) throw new Error('Copy failed');
  }
};

/** "u/name" with a small button that copies the username. */
export const Username = ({ name }: { name: string }) => (
  <span className="inline-flex items-center gap-1">
    u/{name}
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        copyText(name)
          .then(() => showToast('Username copied'))
          .catch(() => showToast("Couldn't copy username"));
      }}
      aria-label={`Copy username ${name}`}
      title="Copy username"
      className="inline-flex h-5 w-5 items-center justify-center rounded text-muted cursor-pointer hover:bg-soft hover:text-ink transition-colors"
    >
      <CopyIcon className="h-3.5 w-3.5" />
    </button>
  </span>
);
