import { useState, type FormEvent } from 'react';
import { CloseIcon, SearchIcon } from './icons';

/**
 * Username search box. While a user is being viewed, shows them as a chip
 * that clears back to the default view.
 */
export const UserSearch = ({
  user,
  onSearch,
  onClear,
  placeholder = 'Search a Redditor',
}: {
  user: string | null;
  onSearch: (username: string) => void;
  onClear: () => void;
  placeholder?: string;
}) => {
  const [input, setInput] = useState('');
  const name = input.trim().replace(/^\/?u\//i, '');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name) return;
    onSearch(name);
    setInput('');
  };

  return (
    <div className="flex flex-col gap-2">
      <form onSubmit={submit} className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={placeholder}
            aria-label="Username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            maxLength={30}
            className="w-full rounded-full border border-line bg-field py-2 pr-4 pl-9 text-sm text-ink shadow-sm outline-none placeholder:text-muted focus:border-cta"
          />
        </div>
        <button
          type="submit"
          disabled={!name}
          className="shrink-0 rounded-full bg-cta px-4 py-2 text-sm font-bold text-cta-ink shadow-sm cursor-pointer hover:brightness-95 transition disabled:cursor-not-allowed disabled:opacity-50"
        >
          Search
        </button>
      </form>
      {user && (
        <div className="flex items-center gap-2 px-1 text-sm">
          <span className="text-muted">Showing</span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-soft py-0.5 pr-1 pl-3 font-bold text-soft-ink">
            u/{user}
            <button
              onClick={onClear}
              aria-label={`Stop viewing u/${user}`}
              className="flex h-5 w-5 items-center justify-center rounded-full text-xs leading-none cursor-pointer hover:bg-line"
            >
              <CloseIcon className="h-3 w-3" />
            </button>
          </span>
        </div>
      )}
    </div>
  );
};
