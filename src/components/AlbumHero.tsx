import {
  useCallback, useEffect, useRef, useState,
  type CSSProperties, type PointerEvent as ReactPointerEvent,
} from 'react';
import { ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';
import { portfolioConfig, type GalleryImage } from '@/data/portfolio';

/*
 * The album.
 *
 * Adapted from ThreeUI's "Meng To Sketchbook" landing page, whose page turn is
 * the good bit: instead of flipping a flat plane, the leaf is a chain of N
 * nested strips, each rotated a little further than its parent. Because the
 * rotations compound down the chain, the surface bends into an arc — a page
 * lifting off the spine rather than a card spinning over.
 *
 * The reference is a two-page sketchbook with a gutter down the middle. A
 * wedding album of individual photographs wants something simpler: one
 * photograph per leaf, hinged on the left edge, turning across the full width.
 * So the span is the whole book and the gutter is zero.
 *
 * The two angles, per frame:
 *   tt = swing + curl      how far the whole leaf has come over
 *   td = 2 * curl / N      the extra each strip adds to its parent
 * with curl = BETA * sin(pi*t), so the leaf is flat at both ends of the turn
 * and bows most in the middle — which is where a real page is most bent.
 *
 * The face imagery is pure geometry: each strip's background-position is fixed
 * when the turn is built, so nothing repaints while it animates. Only the CSS
 * variables move.
 */

const STRIPS = 16;      /* enough for the curve to read as smooth        */
const BETA = 0.6;       /* peak curl, radians                            */
const COMMIT_MS = 620;  /* finishing a turn the visitor let go of        */
const CANCEL_MS = 320;  /* springing back when they did not go far enough */
const DWELL_MS = 6200;  /* unattended, it turns itself                   */

type Dir = 'next' | 'prev';
type Turn = { dir: Dir; from: number; to: number };

const easeOutCubic = (x: number) => 1 - Math.pow(1 - x, 3);

export default function AlbumHero() {
  const pages: GalleryImage[] = portfolioConfig.slideshowImages;
  const count = pages.length;

  const stageRef = useRef<HTMLDivElement>(null);
  const bookRef = useRef<HTMLDivElement>(null);
  const stripRefs = useRef<HTMLDivElement[]>([]);

  const [idx, setIdx] = useState(0);
  const [turn, setTurn] = useState<Turn | null>(null);

  const tRef = useRef(0);
  const rafRef = useRef(0);
  const dragRef = useRef<{ dir: Dir; x0: number; w: number; moved: number } | null>(null);
  const pausedRef = useRef(false);
  const turnRef = useRef<Turn | null>(null);
  turnRef.current = turn;

  /* Writes the frame. Everything here is a CSS variable — no React, no reflow. */
  const applyTurn = useCallback((t: number, dir: Dir) => {
    const stage = stageRef.current;
    if (!stage) return;
    const swing = dir === 'next' ? Math.PI * t : Math.PI * (1 - t);
    const curl = BETA * Math.sin(Math.PI * t);
    const tt = swing + curl;
    const td = (2 * curl) / STRIPS;
    const deg = 180 / Math.PI;

    stage.style.setProperty('--tt', `${(tt * deg).toFixed(2)}deg`);
    stage.style.setProperty('--td', `${(td * deg).toFixed(3)}deg`);
    stage.style.setProperty('--shade', Math.sin(Math.PI * t).toFixed(3));

    /* Per-strip lighting: how square-on each strip's edges are to the viewer. */
    const list = stripRefs.current;
    for (let i = 0; i < list.length; i += 1) {
      const node = list[i];
      if (!node) continue;
      const near = Math.abs(Math.cos(tt - i * td));
      const far = Math.abs(Math.cos(tt - (i + 1) * td));
      node.style.setProperty('--lit', near.toFixed(3));
      /* 0.62 in the reference, over a pale sketchbook page. Photographs are
         already dark, so a lighter wash keeps the turning face readable. */
      node.style.setProperty('--a1', ((1 - near) * 0.42).toFixed(3));
      node.style.setProperty('--a2', ((1 - far) * 0.42).toFixed(3));
    }
  }, []);

  /* Book width drives every strip's geometry, so keep it on the stage. */
  useEffect(() => {
    const book = bookRef.current;
    const stage = stageRef.current;
    if (!book || !stage) return;
    const measure = () => stage.style.setProperty('--bw', `${book.clientWidth}px`);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(book);
    return () => ro.disconnect();
  }, []);

  const settle = useCallback((to: number, ms: number, done: () => void) => {
    const active = turnRef.current;
    if (!active) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      done();
      return;
    }
    const from = tRef.current;
    const start = performance.now();
    cancelAnimationFrame(rafRef.current);
    const frame = (now: number) => {
      const p = Math.min(1, (now - start) / ms);
      tRef.current = from + (to - from) * easeOutCubic(p);
      applyTurn(tRef.current, active.dir);
      if (p < 1) rafRef.current = requestAnimationFrame(frame);
      else done();
    };
    rafRef.current = requestAnimationFrame(frame);
  }, [applyTurn]);

  const begin = useCallback((dir: Dir, at = 0) => {
    setIdx((current) => {
      const to = dir === 'next' ? (current + 1) % count : (current - 1 + count) % count;
      tRef.current = at;
      setTurn({ dir, from: current, to });
      return current;
    });
  }, [count]);

  const commit = useCallback(() => {
    const active = turnRef.current;
    if (!active) return;
    settle(1, COMMIT_MS, () => {
      setIdx(active.to);
      setTurn(null);
      tRef.current = 0;
    });
  }, [settle]);

  const cancel = useCallback(() => {
    if (!turnRef.current) return;
    settle(0, CANCEL_MS, () => {
      setTurn(null);
      tRef.current = 0;
    });
  }, [settle]);

  const step = useCallback((dir: Dir) => {
    if (turnRef.current) return;
    begin(dir, 0);
  }, [begin]);

  /* Once the leaf exists in the DOM, paint frame zero and, for a click-driven
     turn, immediately run it home. */
  useEffect(() => {
    if (!turn) return;
    applyTurn(tRef.current, turn.dir);
    if (!dragRef.current) {
      const id = requestAnimationFrame(() => commit());
      return () => cancelAnimationFrame(id);
    }
  }, [turn, applyTurn, commit]);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  /* Unattended, it turns itself. Stops the moment anyone touches it. */
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setInterval(() => {
      if (!pausedRef.current && !turnRef.current && !dragRef.current) step('next');
    }, DWELL_MS);
    return () => window.clearInterval(timer);
  }, [step]);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || turnRef.current) return;
    const book = bookRef.current;
    if (!book) return;
    const rect = book.getBoundingClientRect();
    const dir: Dir = (event.clientX - rect.left) / rect.width > 0.5 ? 'next' : 'prev';
    dragRef.current = { dir, x0: event.clientX, w: rect.width, moved: 0 };
    book.setPointerCapture(event.pointerId);
    begin(dir, 0);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const active = turnRef.current;
    if (!drag || !active) return;
    const dx = event.clientX - drag.x0;
    drag.moved = Math.max(drag.moved, Math.abs(dx));
    const raw = (drag.dir === 'next' ? -dx : dx) / (drag.w * 0.62);
    tRef.current = Math.max(0, Math.min(1, raw));
    applyTurn(tRef.current, active.dir);
  };

  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    dragRef.current = null;
    bookRef.current?.releasePointerCapture?.(event.pointerId);
    if (!turnRef.current) return;
    /* A tap anywhere on the leaf turns the page; a short drag springs back. */
    if (drag.moved < 6 || tRef.current > 0.4) commit();
    else cancel();
  };

  const under = turn ? turn.to : idx;
  const leafFront = turn ? (turn.dir === 'next' ? turn.from : turn.to) : idx;
  const leafBack = turn ? (turn.dir === 'next' ? turn.to : turn.from) : idx;

  /* Face backgrounds are fixed geometry, expressed in calc() so they survive a
     resize mid-turn without being rebuilt. */
  const faceStyle = (page: number, facing: 'front' | 'back', i: number): CSSProperties => {
    const sw = `(var(--bw) / ${STRIPS})`;
    const x = facing === 'front' ? `calc(-1 * ${i} * ${sw})` : `calc(${i + 1} * ${sw} - var(--bw))`;
    return {
      backgroundImage: `url(${pages[page].src})`,
      backgroundPositionX: x,
    };
  };

  /* The nested chain. Each strip is the child of the one before it, which is
     what makes the rotations compound into a curve. */
  const chain = (i: number): React.ReactNode => {
    if (i >= STRIPS) return null;
    return (
      <div
        className={`album-strip ${i === STRIPS - 1 ? 'is-edge' : ''}`}
        style={{ '--i': i } as CSSProperties}
        ref={(node) => { if (node) stripRefs.current[i] = node; }}
      >
        <div className="album-face front" style={faceStyle(leafFront, 'front', i)}>
          <span className="album-sh" /><span className="album-gl" />
        </div>
        <div className="album-face back" style={faceStyle(leafBack, 'back', i)}>
          <span className="album-sh" /><span className="album-gl" />
        </div>
        {chain(i + 1)}
      </div>
    );
  };

  if (turn) stripRefs.current.length = STRIPS;
  else stripRefs.current = [];

  return (
    <section className="album" id="hero">
      <div className="album-wordmark">
        <span>EST</span>
        <h1>{portfolioConfig.shortName}<em>Photography</em></h1>
        <span>{portfolioConfig.established}</span>
      </div>

      <div
        className="album-stage"
        ref={stageRef}
        onMouseEnter={() => { pausedRef.current = true; }}
        onMouseLeave={() => { pausedRef.current = false; }}
      >
        <div
          className={`album-book ${turn ? 'is-turning' : ''}`}
          ref={bookRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onKeyDown={(event) => {
            if (event.key === 'ArrowRight') { event.preventDefault(); step('next'); }
            if (event.key === 'ArrowLeft') { event.preventDefault(); step('prev'); }
          }}
          tabIndex={0}
          role="group"
          aria-roledescription="album"
          aria-label="Photographs from the portfolio — use the arrow keys to turn the page"
        >
          {/* the page the turn is revealing, or simply the current one */}
          <div className="album-leaf-under">
            <img src={pages[under].src} alt={pages[under].alt} draggable={false} />
          </div>

          {turn && <div className={`album-curl ${turn.dir}`}>{chain(0)}</div>}

          <span className="album-spine" aria-hidden="true" />
          {portfolioConfig.watermark.enabled && (
            <span className="album-mark" aria-hidden="true">{portfolioConfig.watermark.text}</span>
          )}
        </div>
      </div>

      <div className="album-nav">
        <button onClick={() => step('prev')} aria-label="Previous photograph"><ArrowLeft size={20} /></button>
        <button onClick={() => step('next')} aria-label="Next photograph"><ArrowRight size={20} /></button>
      </div>

      <p className="album-sr" aria-live="polite">Photograph {idx + 1} of {count}</p>

      <div className="album-title">
        <h2>The <span>PORTFOLIO</span></h2>
        <p>{portfolioConfig.heroTagline}</p>
      </div>

      <button
        className="album-scroll"
        onClick={() => document.getElementById('collections')?.scrollIntoView({ behavior: 'smooth' })}
      >
        Scroll to explore <ArrowDown size={15} />
      </button>
    </section>
  );
}
