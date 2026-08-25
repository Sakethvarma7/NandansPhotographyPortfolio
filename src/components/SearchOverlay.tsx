import { useEffect, useMemo, useRef, useState } from 'react';
import { CornerDownLeft, Search, X } from 'lucide-react';
import { search, KIND_LABEL, type Hit } from '@/data/search';
import { portfolioConfig } from '@/data/portfolio';

/*
 * One search panel, both platforms.
 *
 * On a phone it is opened by an icon sitting beside the menu button and fills
 * the screen, because a 40%-height sheet with a keyboard over it is unusable.
 * On a desktop the same panel is a centred dialog reachable by the same icon
 * or by Ctrl/Cmd-K, which is what anyone who searches often will reach for.
 *
 * Results are grouped by nothing and ranked by relevance instead: with a
 * catalogue this size, a person typing "haldi" wants the Haldi collection
 * first, not a heading that says "Collections".
 */

const SUGGESTIONS = ['Haldi', 'Wedding film', 'Birthday', 'Candid', 'Udaipur'];

export default function SearchOverlay({
  open,
  onClose,
  navigate,
}: {
  open: boolean;
  onClose: () => void;
  navigate: (path: string) => void;
}) {
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const hits = useMemo(() => search(q), [q]);

  useEffect(() => { setActive(0); }, [q]);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    /* A phone will not raise its keyboard unless focus lands after paint. */
    const id = window.setTimeout(() => inputRef.current?.focus(), 60);
    document.body.style.overflow = 'hidden';
    return () => {
      window.clearTimeout(id);
      document.body.style.overflow = '';
      previous?.focus?.();
      setQ('');
    };
  }, [open]);

  /* Keep the highlighted row in view when arrowing past the fold. */
  useEffect(() => {
    const row = listRef.current?.querySelector<HTMLElement>('[data-active="true"]');
    row?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  if (!open) return null;

  const go = (hit: Hit) => {
    onClose();
    navigate(hit.path);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') { event.preventDefault(); onClose(); return; }
    if (!hits.length) return;
    if (event.key === 'ArrowDown') { event.preventDefault(); setActive((i) => (i + 1) % hits.length); }
    if (event.key === 'ArrowUp') { event.preventDefault(); setActive((i) => (i - 1 + hits.length) % hits.length); }
    if (event.key === 'Enter') { event.preventDefault(); go(hits[active]); }
  };

  const showing = q.trim().length >= 2;

  return (
    <div className="search-scrim" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div
        className="search-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Search the portfolio"
        onKeyDown={onKeyDown}
      >
        <div className="search-field">
          <Search size={18} aria-hidden="true" />
          <input
            ref={inputRef}
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search a ceremony, a couple, a city…"
            aria-label="Search"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="search"
          />
          <button className="search-close" onClick={onClose} aria-label="Close search"><X size={20} /></button>
        </div>

        <div className="search-body" ref={listRef}>
          {!showing && (
            <div className="search-hint">
              <p className="eyebrow">Try</p>
              <div className="search-chips">
                {SUGGESTIONS.map((s) => (
                  <button key={s} onClick={() => setQ(s)}>{s}</button>
                ))}
              </div>
            </div>
          )}

          {showing && hits.length === 0 && (
            <div className="search-empty">
              <p>Nothing matches <em>{q.trim()}</em>.</p>
              <p className="body-copy">
                Try a ceremony — haldi, mehendi, engagement — or ask us directly.
              </p>
              <button className="search-ask" onClick={() => { onClose(); navigate('/contact'); }}>
                Ask {portfolioConfig.shortName.toLowerCase()} <CornerDownLeft size={14} />
              </button>
            </div>
          )}

          {showing && hits.length > 0 && (
            <ul className="search-results" role="listbox" aria-label="Results">
              {hits.map((hit, i) => (
                <li key={hit.id}>
                  <button
                    role="option"
                    aria-selected={i === active}
                    data-active={i === active}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => go(hit)}
                  >
                    <span className="search-kind">{KIND_LABEL[hit.kind]}</span>
                    <span className="search-title">{hit.title}</span>
                    <span className="search-detail">{hit.detail}</span>
                    <CornerDownLeft className="search-enter" size={14} aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

      </div>
    </div>
  );
}
