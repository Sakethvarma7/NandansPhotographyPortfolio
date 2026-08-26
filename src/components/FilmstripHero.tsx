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
 *   3.6s, the paper-rule stage, the grain, the pointer-following light and the
 *   edge vignette.
 *
 * Changed on purpose:
 *   its orange accent becomes the gold from the client's logo, and Arial Narrow
 *   becomes the site's Playfair and DM Mono. The authored card carries a dark
 *   caption bar under the portrait; here the photograph takes the whole plate
 *   instead, so nothing competes with it. The names still reach assistive tech
 *   through each card's label. The behaviour around it — arrows, drag,
 *   autoplay, wrap, watermark — is the site's own and is unchanged.
 */

/* Every constant below is the authored value. */
const FOCUS_K = 1.28;
const IDLE_AFTER = 3600;
const IDLE_RATE = 0.00042;
const IDLE_SWING = 2.45;
const EASE_BASE = 0.001;
/*
 * The angle the deck fans along, and the width below which it applies.
 *
 * Desktop keeps a level line — there is room across a wide screen for the
 * fan to read without help. A phone has a third of that width and most of
 * the height going spare, so the same level fan runs out of room sideways
 * while leaving the stage empty above and below. Tipping the line borrows
 * that vertical space: the cards travel further apart for the same screen
 * width, and the deck reads as a raked hand rather than a flat strip.
 */
const SLANT_DEG = 50;
const SLANT_BELOW = 650;

/*
 * The unit vector the deck fans along.
 *
 * The render loop lays the cards out on this axis and the drag projects the
 * finger onto it, so both read the same source. Above SLANT_BELOW it resolves
 * to (1, 0) — a level line, and a drag that is pure horizontal travel, which
 * is exactly the desktop behaviour rather than a parallel code path.
 */
function slantAxis() {
  const rad = window.innerWidth < SLANT_BELOW ? (SLANT_DEG * Math.PI) / 180 : 0;
  return { cos: Math.cos(rad), sin: Math.sin(rad) };
}
/* Finger travel that advances one card. Low enough that a short flick lands. */
const DRAG_PER_CARD = 76;

const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

type Card = { src: string; alt: string; name: string; place: string };

/* Built from real stories rather than the bare image list, so each card can
   name itself to a screen reader — one from each of the first categories. */
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
    drag: null as null | { x0: number; y0: number; base: number; moved: number },
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
    const reduced = prefersReducedMotion();
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

      /*
       * One layout, every width.
       *
       * There used to be a "compact" branch below 650px that stood the deck
       * up and ran it vertically — cards stacked down the screen instead of
       * fanning across it. It made the phone a different product from the
       * desktop: the same photographs, arranged along the other axis.
       *
       * The fan now runs horizontally everywhere. hGap already floors at
       * 112px, which against a 180px phone card gives roughly the same
       * gap-to-card ratio the desktop has at 238px — so the fan reads the
       * same, just with fewer cards in view, which is what a narrow screen
       * should do.
       */
      const hGap = Math.min(168, Math.max(112, window.innerWidth * 0.116));
      /* Spread is resolved along the slanted axis, so cards keep their even
         spacing measured ALONG the line rather than only across it. */
      const { cos: slantCos, sin: slantSin } = slantAxis();
      const slant = Math.atan2(slantSin, slantCos);
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

        const spread = delta * hGap;
        const x = spread * slantCos;
        const y = spread * slantSin + d * 8 + s.pointerY * focus * 10;
        const z = focus * 145 - d * 148;
        const scale = 0.54 + side * 0.15 + focus * 0.54;
        const rotateX = -s.pointerY * focus * 3.5;
        const rotateY = -dir * (d > 0.2 ? 14 + Math.min(d, 3) * 5 : 0) + s.pointerX * focus * 3;
        /*
         * The lean is scaled by (1 - focus), so the card in focus sits dead
         * straight and the rest tip further as they recede. A raked line of
         * upright cards reads as a bug, but a raked SELECTED card reads as a
         * crooked photograph — the eye forgives a tilt in the deck and does
         * not forgive one in the picture it is looking at.
         */
        const rotateZ = delta * 0.7 + slant * (180 / Math.PI) * 0.22 * (1 - focus);

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
    if (prefersReducedMotion()) return;
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
      /*
       * Travel is the finger PROJECTED onto the fan's axis, not its horizontal
       * component.
       *
       * The deck rakes at 50 degrees on a phone, so that is the direction a
       * thumb naturally moves along it. Measuring only clientX threw away most
       * of that gesture — a swipe straight down the line registered as barely
       * any movement, because the line is mostly vertical.
       *
       * A dot product with the axis means dragging along the deck advances it
       * at full rate, and dragging across the deck does almost nothing, which
       * is the behaviour the raked line implies.
       */
      const axis = slantAxis();
      const travel =
        (event.clientX - s.drag.x0) * axis.cos + (event.clientY - s.drag.y0) * axis.sin;
      s.drag.moved = Math.max(s.drag.moved, Math.abs(travel));
      s.target = s.drag.base - travel / DRAG_PER_CARD;
      s.lastInput = performance.now();
      return;
    }

    /*
     * Pointer position tilts the deck and moves the light. It deliberately does
     * NOT touch the phase: driving the centred card from the cursor meant the
     * picture changed as you moved across the hero and snapped back the moment
     * you left it. Which photograph is showing changes only when asked —
     * arrows, keys, a click, a drag, or autoplay.
     */
    const nx = Math.max(-1, Math.min(1, ((event.clientX - rect.left) / rect.width - 0.5) * 2));
    const ny = Math.max(-1, Math.min(1, ((event.clientY - rect.top) / rect.height - 0.5) * 2));
    s.pointerX = nx;
    s.pointerY = ny;
    s.engaged = true;
    s.lastInput = performance.now();
    stage.style.setProperty('--pointer-x', `${(nx + 1) * 50}%`);
  };

  const onPointerLeave = () => {
    const s = st.current;
    s.engaged = false;
    s.pointerX = 0;
    s.pointerY = 0;
    /* No phase to restore — the tilt simply relaxes back to level. */
    stageRef.current?.style.setProperty('--pointer-x', '50%');
  };

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    /*
     * Only a gesture that starts ON a photograph drives the deck. Anywhere else
     * on the stage is left to the browser, so a thumb landing on the paper
     * scrolls the page to the next section instead of being swallowed here.
     */
    const onCard = (event.target as Element | null)?.closest('.strip-card');
    if (!onCard) return;
    const s = st.current;
    s.drag = { x0: event.clientX, y0: event.clientY, base: s.target, moved: 0 };
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
        className={`strip-stage ${portfolioConfig.heroVideo ? 'has-film' : ''}`}
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
        {/*
          Brief: "No — please cut one from one of my films." There is no clip
          yet, so heroVideo is null and this renders nothing. The moment a file
          is dropped into the config it becomes the stage's ground, behind the
          deck: silent, looping, and never autoplaying for anyone who has asked
          for less motion.
        */}
        {portfolioConfig.heroVideo && (
          <video
            className="strip-film"
            src={portfolioConfig.heroVideo}
            poster={cards[0]?.src}
            autoPlay={!prefersReducedMotion()}
            muted
            loop
            playsInline
            preload="metadata"
            aria-hidden="true"
            tabIndex={-1}
          />
        )}

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
              /* Name and place still reach assistive tech, just not the eye. */
              aria-label={`${card.name} — ${card.place}`}
            >
              <span className="strip-portrait">
                <img src={card.src} alt={card.alt} draggable={false} loading={i < 4 ? 'eager' : 'lazy'} />
                {/*
                  No watermark in the hero, deliberately.

                  portfolioConfig.watermark still governs every gallery and
                  lightbox image; this one surface opts out. The hero is the
                  first thing anyone sees and it is meant to be immersive —
                  a caption stamped across the corner of each frame breaks
                  that for the sake of protecting an image that is already
                  240px wide and mostly out of focus.
                */}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="strip-nav">
        <button onClick={() => step(-1)} aria-label="Previous photograph"><ArrowLeft size={22} strokeWidth={1.25} /></button>
        <button onClick={() => step(1)} aria-label="Next photograph"><ArrowRight size={22} strokeWidth={1.25} /></button>
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
