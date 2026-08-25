import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';
import { portfolioConfig } from '@/data/portfolio';

/*
 * The hero filmstrip.
 *
 * Look and motion adapted from ThreeUI's CharacterCarousel (filmstrip variant),
 * read from the authored source rather than from screenshots. Its whole
 * character comes from one number:
 *
 *     focus = exp(-d^2 * 1.28)
 *
 * where d is a card's wrapped distance from a continuous phase. That Gaussian
 * is sharp in the middle and falls away fast, so the centred card sits forward,
 * lit and saturated, while its neighbours recede, desaturate and blur. Position,
 * scale, opacity, blur, shadow depth, sepia and the inner rule are all derived
 * from it — nothing is keyframed.
 *
 * Kept from the source, because they are the look:
 *   the transform maths and easing, the pointer parallax, the idle drift after
 *   3.6s, the paper-rule stage, the grain, the pointer-following light, the
 *   edge vignette, and the card anatomy of portrait over a dark caption bar.
 *
 * Changed on purpose:
 *   its orange accent becomes the gold from the client's logo; Arial Narrow
 *   becomes the site's Playfair and DM Mono; and the person name/role footer
 *   becomes couple name and place, which is what this studio's cards carry.
 *   The behaviour around it — arrows, drag, autoplay, wrap, watermark — is the
 *   site's own and is unchanged.
 */

/* Every constant below is the authored value. */
const FOCUS_K = 1.28;
const IDLE_AFTER = 3600;
const IDLE_RATE = 0.00042;
const IDLE_SWING = 2.45;
const EASE_BASE = 0.001;
const COMPACT_AT = 650;

type Card = { src: string; alt: string; name: string; place: string };

/* Cards want a caption, so they are built from real stories rather than from
   the bare image list — one from each of the first categories. */
function buildCards(): Card[] {
  const out: Card[] = [];
  for (const category of portfolioConfig.categories) {
    const collection = category.collections.find((c) => c.kind === 'photography') ?? category.collections[0];
    const story = collection?.stories[0];
    if (story) out.push({ src: story.image.src, alt: story.image.alt, name: story.name, place: story.place });
    if (out.length >= 8) break;
  }
  return out;
}

export default function FilmstripHero() {
  const cards = useMemo(buildCards, []);
  const count = cards.length;

  const stageRef = useRef<HTMLDivElement>(null);
  const deckRef = useRef<HTMLDivElement>(null);
  const nodes = useRef<HTMLButtonElement[]>([]);

  const [active, setActive] = useState(0);

  const st = useRef({
    phase: 0, target: 0, base: 0,
    pointerX: 0, pointerY: 0,
    engaged: false,
    lastInput: 0,
    drag: null as null | { x0: number; base: number; moved: number },
  });

  const wrappedDelta = useCallback((index: number, phase: number) => {
    let d = index - phase;
    while (d > count / 2) d -= count;
    while (d < -count / 2) d += count;
    return d;
  }, [count]);

  const step = useCallback((dir: number) => {
    const s = st.current;
    s.base += dir;
    s.target = s.base;
    s.engaged = false;
    s.lastInput = performance.now();
  }, []);

  /* One loop writes every card. No React state per frame. */
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    let previous = performance.now();
    st.current.lastInput = previous;
    let lastActive = -1;

    const render = (time: number) => {
      const s = st.current;
      const dt = Math.min(32, time - previous);
      previous = time;
      const ease = reduced ? 1 : 1 - Math.pow(EASE_BASE, dt / 1000);

      /* Unattended, the strip breathes rather than sitting dead still. */
      if (!s.engaged && !s.drag && time - s.lastInput > IDLE_AFTER) {
        const idle = time - s.lastInput - IDLE_AFTER;
        s.target = s.base + Math.sin(idle * IDLE_RATE) * IDLE_SWING;
      }

      s.phase += (s.target - s.phase) * ease;

      const compact = window.innerWidth < COMPACT_AT;
      const hGap = Math.min(168, Math.max(112, window.innerWidth * 0.116));
      const vGap = Math.min(122, Math.max(88, window.innerHeight * 0.112));
      const nearest = ((Math.round(s.phase) % count) + count) % count;
      if (nearest !== lastActive) { lastActive = nearest; setActive(nearest); }

      for (let i = 0; i < nodes.current.length; i += 1) {
        const card = nodes.current[i];
        if (!card) continue;
        const delta = wrappedDelta(i, s.phase);
        const d = Math.abs(delta);
        const focus = Math.exp(-d * d * FOCUS_K);
        const side = Math.max(0, 1 - d / 5);
        const dir = Math.sign(delta);

        const x = compact ? delta * 24 + Math.sin(delta * 0.9) * 25 : delta * hGap;
        const y = compact ? delta * vGap : d * 8 + s.pointerY * focus * 10;
        const z = focus * 145 - d * 148;
        const scale = 0.54 + side * 0.15 + focus * 0.54;
        const rotateX = compact ? delta * 2.1 : -s.pointerY * focus * 3.5;
        const rotateY = compact
          ? -delta * 5
          : -dir * (d > 0.2 ? 14 + Math.min(d, 3) * 5 : 0) + s.pointerX * focus * 3;
        const rotateZ = compact ? delta * -1.4 : delta * 0.7;

        card.style.setProperty('--focus', focus.toFixed(4));
        card.style.zIndex = String(Math.round(1000 - d * 100));
        card.style.opacity = String(Math.max(0.13, side * 0.76 + focus * 0.24));
        card.style.filter = `blur(${Math.max(0, d - 1.5) * 0.38}px)`;
        card.style.transform =
          `translate(-50%, -50%) translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, ${z.toFixed(2)}px) ` +
          `rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) ` +
          `rotateZ(${rotateZ.toFixed(2)}deg) scale(${scale.toFixed(4)})`;
      }
      raf = requestAnimationFrame(render);
    };

    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, [count, wrappedDelta]);

  /* Autoplay, the site's own behaviour, layered on top. */
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setInterval(() => {
      const s = st.current;
      if (!s.engaged && !s.drag) step(1);
    }, 5200);
    return () => window.clearInterval(timer);
  }, [step]);

  const moveTo = (index: number) => {
    const s = st.current;
    const current = ((Math.round(s.phase) % count) + count) % count;
    let d = index - current;
    if (d > count / 2) d -= count;
    if (d < -count / 2) d += count;
    s.base += d;
    s.target = s.base;
    s.engaged = false;
    s.lastInput = performance.now();
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const stage = stageRef.current;
    const s = st.current;
    if (!stage) return;
    const rect = stage.getBoundingClientRect();

    if (s.drag) {
      const dx = event.clientX - s.drag.x0;
      s.drag.moved = Math.max(s.drag.moved, Math.abs(dx));
      s.target = s.drag.base - dx / (rect.width / count) * 0.85;
      s.lastInput = performance.now();
      return;
    }
    const nx = Math.max(-1, Math.min(1, ((event.clientX - rect.left) / rect.width - 0.5) * 2));
    const ny = Math.max(-1, Math.min(1, ((event.clientY - rect.top) / rect.height - 0.5) * 2));
    s.pointerX = nx;
    s.pointerY = ny;
    s.engaged = true;
    s.target = s.base + (window.innerWidth < COMPACT_AT ? ny * 2.2 : nx * 3.1);
    s.lastInput = performance.now();
    stage.style.setProperty('--pointer-x', `${(nx + 1) * 50}%`);
  };

  const onPointerLeave = () => {
    const s = st.current;
    s.engaged = false;
    s.pointerX = 0;
    s.pointerY = 0;
    s.target = s.base;
    stageRef.current?.style.setProperty('--pointer-x', '50%');
  };

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    const s = st.current;
    s.drag = { x0: event.clientX, base: s.target, moved: 0 };
    stageRef.current?.setPointerCapture(event.pointerId);
  };

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const s = st.current;
    if (!s.drag) return;
    const moved = s.drag.moved;
    s.drag = null;
    stageRef.current?.releasePointerCapture?.(event.pointerId);
    /* Settle on whole cards, never between them. */
    s.base = Math.round(s.target);
    s.target = s.base;
    s.lastInput = performance.now();
    if (moved < 6) s.engaged = false;
  };

  return (
    <section className="strip" id="hero">
      <div className="strip-wordmark">
        <span>EST</span>
        <h1>{portfolioConfig.shortName}<em>Photography</em></h1>
        <span>{portfolioConfig.established}</span>
      </div>

      <div
        className="strip-stage"
        ref={stageRef}
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
        onPointerDown={onPointerDown}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); step(1); }
          if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); step(-1); }
        }}
        tabIndex={0}
        role="group"
        aria-roledescription="carousel"
        aria-label="Photographs from the portfolio — use the arrow keys"
      >
        <div className="strip-deck" ref={deckRef}>
          {cards.map((card, i) => (
            <button
              key={card.src + i}
              type="button"
              className="strip-card"
              style={{ '--focus': 0 } as CSSProperties}
              ref={(n) => { if (n) nodes.current[i] = n; }}
              onClick={() => moveTo(i)}
              onFocus={() => moveTo(i)}
              aria-current={i === active ? 'true' : 'false'}
              aria-label={`${card.name}, ${card.place}`}
            >
              <span className="strip-portrait">
                <img src={card.src} alt={card.alt} draggable={false} loading={i < 4 ? 'eager' : 'lazy'} />
                {portfolioConfig.watermark.enabled && (
                  <span className="strip-mark" aria-hidden="true">{portfolioConfig.watermark.text}</span>
                )}
              </span>
              <span className="strip-footer">
                <span className="strip-index">{String(i + 1).padStart(2, '0')}</span>
                <span className="strip-meta">
                  <span className="strip-name">{card.name}</span>
                  <span className="strip-place">{card.place}</span>
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="strip-nav">
        <button onClick={() => step(-1)} aria-label="Previous photograph"><ArrowLeft size={20} /></button>
        <button onClick={() => step(1)} aria-label="Next photograph"><ArrowRight size={20} /></button>
      </div>

      <p className="strip-sr" aria-live="polite">Photograph {active + 1} of {count}</p>

      <div className="strip-title">
        <h2>The <span>PORTFOLIO</span></h2>
        <p>{portfolioConfig.heroTagline}</p>
      </div>

      <button
        className="strip-scroll"
        onClick={() => document.getElementById('collections')?.scrollIntoView({ behavior: 'smooth' })}
      >
        Scroll to explore <ArrowDown size={15} />
      </button>
    </section>
  );
}
