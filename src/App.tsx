import {
  useCallback, useEffect, useLayoutEffect, useRef, useState,
  type CSSProperties, type FormEvent, type ReactNode,
} from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight, Instagram, Mail, Menu, MessageCircle, Phone, Play, Search, X } from 'lucide-react';
import SearchOverlay from '@/components/SearchOverlay';
import Testimonials from '@/components/Testimonials';
import {
  filmCategories,
  findCategory,
  findCollection,
  findStory,
  portfolioConfig,
  type Collection,
  type GalleryImage,
  type Story,
  type WorkCategory,
} from '@/data/portfolio';

/*
 * ROUTES
 *   /                                          home — slideshow, then every category
 *   /work                                      all categories
 *   /work/:category                            collections (Photography / Film / Candid)
 *   /work/:category/:collection                couples
 *   /work/:category/:collection/:story         gallery
 *   /films                                     categories that have films
 *   /films/:category                           films in that category
 *   /about  /contact
 */
type Route = {
  page: 'home' | 'work' | 'films' | 'about' | 'contact' | 'notfound';
  categoryId?: string;
  collectionId?: string;
  storyId?: string;
};

function getRoute(): Route {
  const [first, second, third, fourth] = window.location.pathname.split('/').filter(Boolean);
  if (first === 'work') return { page: 'work', categoryId: second, collectionId: third, storyId: fourth };
  if (first === 'films') return { page: 'films', categoryId: second };
  if (first === 'about') return { page: 'about' };
  if (first === 'contact') return { page: 'contact' };
  /* Only a bare path is home. An unrecognised segment is a wrong turn, and
     saying so beats rendering the landing page behind a broken link. */
  return { page: first ? 'notfound' : 'home' };
}

function useRoute() {
  const [route, setRoute] = useState<Route>(getRoute);

  useEffect(() => {
    /* Browsers restore the previous scroll offset on history navigation, which
       fights our own reset and lands the visitor mid-page. We own it instead. */
    if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual';
    const onPop = () => setRoute(getRoute());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigate = useCallback((path: string) => {
    if (path === window.location.pathname) return;
    window.history.pushState({}, '', path);
    setRoute(getRoute());
    /* NB: no scrolling here. This runs before React has swapped the page, so
       scrolling now animates the OUTGOING page and the new content renders
       under wherever that animation happened to stop — which is exactly how
       pages ended up opening halfway down. The reset lives in a layout effect
       keyed to the route, after the new DOM is committed. */
  }, []);

  return { route, navigate };
}

/**
 * Puts every newly-opened page at its top, after the new content is committed
 * but before the browser paints, so there is no visible jump.
 *
 * `instant` matters: `html { scroll-behavior: smooth }` would otherwise turn
 * this into an animation that the route change can interrupt. Anchor scrolling
 * inside a page ("scroll to explore") still animates, because that passes
 * `smooth` explicitly.
 */
function useScrollToTopOnRouteChange(routeKey: string) {
  useLayoutEffect(() => {
    const top = () => window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });

    top();

    /*
     * Measured: the first call lands at exactly 0, then the browser nudges the
     * page down ~40px within the next frame or two. It is not our code — a
     * scroll trap caught only this one call — it is the browser's own scroll
     * anchoring reacting as webfonts swap in and retitle the big display type.
     *
     * So re-assert across the next two frames, then stop. Bounded like this it
     * cannot fight a visitor who starts scrolling: by the time a real scroll is
     * possible the effect has already finished.
     */
    let frame = requestAnimationFrame(() => {
      top();
      frame = requestAnimationFrame(top);
    });
    return () => cancelAnimationFrame(frame);
  }, [routeKey]);
}

type Nav = (path: string) => void;

/*
 * Brief: "Yes, disable it" (right-click and download) and "watermark
 * everything". A deterrent, not real protection — screenshots still work.
 * Durable marks have to be burned into the files before upload.
 */
function useImageProtection() {
  useEffect(() => {
    if (!portfolioConfig.protectImages) return;
    const isImage = (target: EventTarget | null) =>
      target instanceof HTMLElement && (target.tagName === 'IMG' || target.closest('.shot') !== null);
    const block = (event: Event) => { if (isImage(event.target)) event.preventDefault(); };
    document.addEventListener('contextmenu', block);
    document.addEventListener('dragstart', block);
    return () => {
      document.removeEventListener('contextmenu', block);
      document.removeEventListener('dragstart', block);
    };
  }, []);
}

/*
 * One observer for the whole page. Anything with .reveal fades and rises once
 * as it comes into view, then stops being watched. Under reduced motion the
 * observer is never created and everything is simply visible.
 *
 * routeKey re-runs it after a navigation, when the DOM is entirely new.
 */
function useScrollReveal(routeKey: string) {
  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>('.reveal'));
    if (!nodes.length) return;
    /* Revealing starts from opacity 0, so anything that cannot observe must be
       shown outright — never leave content invisible because a feature is missing. */
    if (
      !('IntersectionObserver' in window) ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      nodes.forEach((node) => node.classList.add('is-in'));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-in');
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.05 },
    );
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [routeKey]);
}

/*
 * Every route used to share one <title> and one description, so every bookmark,
 * history entry and shared link looked identical. This gives each page its own.
 */
function useDocumentMeta(title: string, description: string) {
  useEffect(() => {
    document.title = title;
    let tag = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!tag) {
      tag = document.createElement('meta');
      tag.name = 'description';
      document.head.appendChild(tag);
    }
    tag.content = description;
  }, [title, description]);
}

/* A hairline of gold across the top showing how far through the page you are. */
function useReadingProgress() {
  useEffect(() => {
    let frame = 0;
    const write = () => {
      frame = 0;
      const doc = document.documentElement;
      const span = doc.scrollHeight - doc.clientHeight;
      doc.style.setProperty('--read', span > 0 ? String(doc.scrollTop / span) : '0');
      /* Hysteresis, so the state cannot chatter around a single threshold:
         it engages well down the page and only lets go near the very top. */
      const y = doc.scrollTop;
      const on = doc.classList.contains('is-scrolled');
      if (!on && y > 64) doc.classList.add('is-scrolled');
      else if (on && y < 16) doc.classList.remove('is-scrolled');
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(write); };
    write();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);
}

/*
 * Photographs fade up as they decode rather than snapping in. With 36 remote
 * images in a gallery that is the difference between a page that clatters and
 * one that settles. A cached image is already complete before React runs, so
 * the effect catches that case too.
 */
function Shot({
  image, className, eager, natural,
}: { image: GalleryImage; className?: string; eager?: boolean; natural?: boolean }) {
  const imgRef = useRef<HTMLImageElement>(null);
  const wrapRef = useRef<HTMLSpanElement>(null);
  const [loaded, setLoaded] = useState(false);

  /*
   * `natural` means the frame should take the photograph's shape rather than
   * the other way round. The true ratio is only knowable once the file has
   * decoded, so it is written to --ar then; until it arrives the tile keeps the
   * rough guess its tone class supplies, which reserves roughly the right space
   * and stops the masonry snapping about as images land.
   */
  const adopt = useCallback(() => {
    setLoaded(true);
    if (!natural) return;
    const img = imgRef.current;
    if (img?.naturalWidth && img.naturalHeight) {
      wrapRef.current?.style.setProperty('--ar', `${img.naturalWidth} / ${img.naturalHeight}`);
    }
  }, [natural]);

  useEffect(() => {
    if (imgRef.current?.complete) adopt();
  }, [image.src, adopt]);

  /*
   * Backstop. A file can finish decoding during the commit, in the window
   * between React rendering the <img> and its onLoad being wired up — measured
   * 5 of 28 tiles missing their ratio that way, which left them on the guess
   * and therefore cropped. Re-asserting once the element is known to have
   * loaded closes it without forcing any extra work.
   */
  useEffect(() => {
    if (!natural || !loaded) return;
    const img = imgRef.current;
    const wrap = wrapRef.current;
    if (!img?.naturalWidth || !wrap || wrap.style.getPropertyValue('--ar')) return;
    wrap.style.setProperty('--ar', `${img.naturalWidth} / ${img.naturalHeight}`);
  }, [natural, loaded]);

  return (
    <span ref={wrapRef} className={`shot ${className ?? ''} ${loaded ? 'is-loaded' : ''}`}>
      <img
        ref={imgRef}
        src={image.src}
        alt={image.alt}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        draggable={false}
        onLoad={adopt}
        /* never leave a broken photograph stuck at opacity 0 */
        onError={() => setLoaded(true)}
      />
      {portfolioConfig.watermark.enabled && (
        <span className="shot-mark" aria-hidden="true" data-short="NP">{portfolioConfig.watermark.text}</span>
      )}
    </span>
  );
}

function Channel({ icon, label, href }: { icon: ReactNode; label: string; href: string | null }) {
  if (!href) return <span className="channel is-pending">{icon}<span>{label}<small>To be confirmed</small></span></span>;
  return <a className="channel" href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noreferrer">{icon}<span>{label}</span><ArrowUpRight size={14} /></a>;
}

function Crumbs({ items, navigate }: { items: { label: string; path?: string }[]; navigate: Nav }) {
  return (
    <div className="crumbs">
      {items.map((item, index) => (
        <span key={`${item.label}-${index}`}>
          {item.path ? <button onClick={() => navigate(item.path!)}>{item.label}</button> : <i>{item.label}</i>}
          {index < items.length - 1 && <em>›</em>}
        </span>
      ))}
    </div>
  );
}

function SiteNav({ navigate, current, onSearch }: { navigate: Nav; current: Route['page']; onSearch: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const go = (path: string) => { setMenuOpen(false); navigate(path); };
  /* Nothing indicated the current section — pure guesswork for wayfinding. */
  const on = (page: Route['page']) => (current === page ? 'is-current' : '');
  return (
    <nav className="nav-shell">
      <button className="brand" onClick={() => go('/')} aria-label="Go home">
        <span className="brand-mark"><img src={portfolioConfig.logo} alt="" /></span>
        <span>{portfolioConfig.shortName}<small>PHOTOGRAPHY</small></span>
      </button>
      <div className={`nav-links ${menuOpen ? 'is-open' : ''}`}>
        <button className={on('work')} aria-current={current === 'work' ? 'page' : undefined} onClick={() => go('/work')}>Work</button>
        <button className={on('films')} aria-current={current === 'films' ? 'page' : undefined} onClick={() => go('/films')}>Films</button>
        <button className={on('about')} aria-current={current === 'about' ? 'page' : undefined} onClick={() => go('/about')}>About</button>
        <button className={on('contact')} aria-current={current === 'contact' ? 'page' : undefined} onClick={() => go('/contact')}>Contact</button>
      </div>
      <div className="nav-actions">
        <button className="nav-search" type="button" onClick={() => { setMenuOpen(false); onSearch(); }} aria-label="Search the portfolio">
          <Search size={19} />
        </button>
        <button className="nav-cta" onClick={() => go('/contact')}>Enquire <i className="cta-disc"><ArrowUpRight size={14} /></i></button>
        <button className="menu-button" type="button" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle navigation">
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>
    </nav>
  );
}

function Footer({ navigate }: { navigate: Nav }) {
  return (
    <footer>
      <button className="footer-brand" onClick={() => navigate('/')}>
        <span className="brand-mark"><img src={portfolioConfig.logo} alt="" /></span>
        <span>{portfolioConfig.shortName}<small>PHOTOGRAPHY</small></span>
      </button>
      <div className="footer-links">
        <button onClick={() => navigate('/work')}>Work</button>
        <button onClick={() => navigate('/films')}>Films</button>
        <button onClick={() => navigate('/about')}>About</button>
        <button onClick={() => navigate('/contact')}>Contact</button>
      </div>
      <div className="footer-contact">
        <a href={`mailto:${portfolioConfig.email}`}>{portfolioConfig.email}</a>
        {portfolioConfig.phone && (
          <a href={`tel:${portfolioConfig.phone.replace(/[^\d+]/g, '')}`}>{portfolioConfig.phone}</a>
        )}
        {portfolioConfig.instagram && (
          <a
            className="footer-social"
            href={`https://instagram.com/${portfolioConfig.instagram.replace('@', '')}`}
            target="_blank"
            rel="noreferrer"
          >
            <Instagram size={14} /> {portfolioConfig.instagram}
          </a>
        )}
        <span>{portfolioConfig.location}</span>
      </div>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} {portfolioConfig.clientName}</span>
        <span>All photographs are the property of the studio.</span>
      </div>
    </footer>
  );
}

function PageIntro({ label, title, description }: { label: string; title: ReactNode; description?: string }) {
  return (
    <header className="page-intro reveal">
      <div>
        <p className="eyebrow">{label}</p>
        <h1>{title}</h1>
        {description && <p className="body-copy">{description}</p>}
      </div>
    </header>
  );
}

/* ---------------------------------------------------------------- HOME --- */

/** One category band on the home page: heading, rule, then its collection cards. */
function CategoryBand({ category, navigate }: { category: WorkCategory; navigate: Nav }) {
  const storyCount = category.collections.reduce((sum, item) => sum + item.stories.length, 0);
  return (
    <section className="band">
      <div className="band-head reveal">
        <h2>{category.label} <em>collection</em></h2>
        <span className="band-rule" />
        <p>{category.tagline}</p>
      </div>
      <div className="band-grid" data-count={category.collections.length}>
        {category.collections.map((item, index) => (
          <button
            key={item.id}
            className="band-card reveal"
            style={{ '--i': index } as CSSProperties}
            onClick={() => navigate(`/work/${category.id}/${item.id}`)}
          >
            <Shot image={item.cover} />
            <span className="band-card-shade" />
            <span className="band-card-label">{item.label}</span>
            <ArrowUpRight className="band-card-arrow" size={18} />
          </button>
        ))}

        {/*
          Every band lays out on three tracks, so a category with one or two
          collections has room left over. It goes to a quiet editorial column
          rather than to stretching the cards — which is what used to happen,
          and it meant the photographs changed size from band to band all the
          way down the page.
        */}
        {category.collections.length < 3 && (
          <aside className="band-aside reveal" style={{ '--i': category.collections.length } as CSSProperties}>
            <p className="body-copy">{category.description}</p>
            <span className="band-aside-count">
              {storyCount} {storyCount === 1 ? 'story' : 'stories'}
            </span>
            <button
              className="band-aside-cta"
              onClick={() => navigate(
                /* One collection is not a choice, so send them straight to it;
                   with two, the category page is where the choice lives. */
                category.collections.length === 1
                  ? `/work/${category.id}/${category.collections[0].id}`
                  : `/work/${category.id}`,
              )}
            >
              See the {category.label.toLowerCase()} work <ArrowUpRight size={15} />
            </button>
          </aside>
        )}
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- HOME --- */
/*
 * Brief: visitors see a slideshow first.
 *
 * A continuous reel rather than a stepped deck. Rounded cards sit at slight,
 * fixed angles and drift sideways forever at about 34px a second — slow enough
 * that you notice it has moved rather than watching it move.
 *
 * It is a CSS animation on ONE element. The whole reel is a single composited
 * transform, so nothing here runs per-frame JavaScript: no render loop, no
 * pointer maths, no per-card transforms being rewritten sixty times a second.
 * That is the entire reason this can run continuously without the page feeling
 * busy — the earlier filmstrip did all of that work and never settled.
 *
 * The seam: the reel holds the image set TWICE, and the animation travels
 * exactly one set-width. At the end of the cycle the track is showing an
 * identical frame to the one it started on, so the reset is invisible and the
 * loop has no join.
 */

/*
 * Cards sit on the rim of one very large wheel, and the wheel turns.
 *
 * The radius is NOT tied to the card count. Earlier it was — cards had to
 * cover a full 360deg or a gap would rotate into view, so a gentler arc meant
 * more and more DOM. The way out is to notice that the ring does not have to
 * travel a whole revolution to loop: the images repeat every eight cards, so
 * after turning by exactly eight card-steps the wheel is showing an identical
 * arrangement. Sweeping that much and starting over is seamless, and it means
 * the circle can be as large as we like while only carrying enough cards to
 * cover the visible arc plus the sweep.
 *
 * WHEEL_CARDS just has to be a whole number of image sets, and comfortably
 * more than (cards across the widest screen / 2) + one sweep on each side.
 */

/*
 * The wheel's geometry, resolved in JavaScript.
 *
 * It used to live in CSS custom properties — radius, step angle and sweep all
 * derived with calc() and clamp(), and the sweep read back out inside
 * @keyframes. That is elegant and it worked everywhere except the one browser
 * that matters most here: on iOS Safari the chain of nested custom properties
 * inside transform and animation-name resolves unreliably, and when it fails
 * it fails SILENTLY — no error, no fallback, just a hero that sits still on
 * the client's phone while looking perfect on every desktop it was tested on.
 *
 * So the maths happens here and reaches the DOM as plain pixels and degrees.
 * There is nothing left for a browser to disagree about. It costs one
 * measurement on mount and one per resize, and no per-frame work at all.
 */
const clamp = (min: number, value: number, max: number) => Math.min(max, Math.max(min, value));

/* How long one card takes to move into its neighbour's place. Eight of these
   is a full pass of the image set, so this is the old 78s pace per set. */
const WHEEL_STEP_MS = 9750;

function wheelGeometry(width: number) {
  /*
   * A wider screen spans more of the arc, and the drop at its edges grows with
   * the square of that — so the radius has to grow with the viewport, or a
   * large monitor either shears the leaning cards or forces the hero taller
   * than the window. k is the radius counted in card-steps.
   */
  let cardW: number, gap: number, k: number;
  if (width <= 640)       { cardW = clamp(148, width * 0.38, 178);  gap = 20;                          k = 15; }
  else if (width <= 900)  { cardW = clamp(150, width * 0.21, 210);  gap = clamp(20, width * 0.026, 40); k = 22; }
  else if (width < 1600)  { cardW = clamp(148, width * 0.155, 220); gap = clamp(22, width * 0.03, 56);  k = 36; }
  else if (width < 2200)  { cardW = 220;                            gap = 56;                          k = 40; }
  else                    { cardW = 220;                            gap = 56;                          k = 60; }

  const cardH = cardW * (4 / 3);
  /* A step of one arc-length on a circle of k arc-lengths subtends 1/k radians. */
  const step = 57.29578 / k;
  /*
   * Only enough cards to cover what is actually seen, plus two either side.
   *
   * The ring used to carry a whole image set of spare cards on the arriving
   * side, so that turning by eight steps would land on an identical
   * arrangement. That works, but it drags thousands of pixels of card through
   * one compositing layer — measured at 4478px across on a 390px phone, past
   * what iOS will hold on to, and it drops the layer without a word.
   *
   * Recycling is cheaper: turn by ONE step, then shift which photograph each
   * card shows by one and start over. A card at minus-one-step showing photo N
   * is indistinguishable from a card at zero showing photo N+1, so the restart
   * is invisible and the ring never has to be longer than the screen.
   */
  const half = Math.ceil(width / (cardW + gap) / 2) + 2;

  return {
    cardW, cardH,
    radius: k * (cardW + gap),
    step, before: half,
    count: half * 2 + 1,
    /* Room for the drop, or the stage's own overflow cuts the leaning cards. */
    height: cardH + clamp(76, width * 0.08, 180),
  };
}

function HeroSlideshow() {
  const images = portfolioConfig.slideshowImages;
  const stageRef = useRef<HTMLDivElement>(null);
  const wheelRef = useRef<HTMLDivElement>(null);
  const [geo, setGeo] = useState(() => wheelGeometry(typeof window === 'undefined' ? 1440 : window.innerWidth));
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const measure = () => setGeo(wheelGeometry(window.innerWidth));
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('orientationchange', measure);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('orientationchange', measure);
    };
  }, []);

  /*
   * Driven through the Web Animations API rather than a CSS @keyframes rule.
   * Same compositor-only transform, but the sweep is a literal number computed
   * above, so there is no keyframe left for a browser to fail to resolve — and
   * on iOS Safari a custom property inside @keyframes fails silently, which is
   * indistinguishable from a hero that was simply never animated.
   *
   * One step per cycle. When it finishes, `offset` moves on by one and this
   * effect re-runs: the cleanup cancels the finished animation, dropping the
   * wheel back to zero rotation, while the same commit has already advanced
   * every card's photograph by one. The two states are the same picture, so
   * the restart cannot be seen.
   */
  useEffect(() => {
    const wheel = wheelRef.current;
    if (!wheel || typeof wheel.animate !== 'function') return;

    /*
     * The wheel deliberately keeps turning under prefers-reduced-motion.
     *
     * That setting normally means stop, and this used to. The client asked for
     * it to turn on every device regardless, having found the hero frozen on
     * his own phone with Reduce Motion switched on — which on iOS a great many
     * people have, often for battery rather than for vestibular reasons.
     *
     * It is a considered exception rather than an oversight. What makes it
     * defensible is the character of the motion: one slow, linear, constant
     * drift of about 30px a second on a single transform, with no parallax, no
     * scaling, no flashing and nothing tied to scroll position — the kinds of
     * motion that actually provoke symptoms. Everything else on the site still
     * honours the setting; only this turns.
     */
    const spin = wheel.animate(
      [{ transform: 'rotate(0deg)' }, { transform: `rotate(${-geo.step}deg)` }],
      { duration: WHEEL_STEP_MS, easing: 'linear', fill: 'forwards' },
    );
    /* fill:forwards holds the finished pose until the next render lands, so
       there is never a frame showing the old photographs un-rotated. */
    spin.onfinish = () => setOffset((o) => o + 1);
    return () => spin.cancel();
  }, [geo.step, offset]);

  /*
   * Content that moves on its own for more than five seconds needs a way to be
   * stopped (WCAG 2.2.2), so a keyboard can halt the wheel and a mouse can rest
   * on it. Neither route may fire for touch: iOS applies :hover on tap and
   * leaves it applied, and a tap also focuses anything focusable — between them
   * they stopped the wheel dead the moment a finger landed on the photographs.
   */
  const setPaused = (paused: boolean) => {
    const wheel = wheelRef.current;
    if (!wheel || typeof wheel.getAnimations !== 'function') return;
    wheel.getAnimations().forEach((a) => (paused ? a.pause() : a.play()));
  };
  const finePointer = () =>
    typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /*
   * The stage is focusable so a keyboard can reach it and stop the wheel — but
   * TAPPING a focusable element focuses it too, so on a phone one touch anywhere
   * on the photographs stopped the rotation, and it only started again when
   * something else was touched.
   *
   * Distinguished by watching for a pointer immediately beforehand rather than
   * by asking :focus-visible. That property is the right idea but the wrong
   * tool here: Safari only grew it in 15.4, and browsers hand it out for
   * programmatic focus as well, so it answers "should this look focused"
   * rather than "did a finger do this". A pointerdown lands before the focus
   * it causes, which answers exactly the question being asked.
   */
  const focusFromPointer = useRef(false);

  return (
    <section className="hero" id="hero">
      <div className="hero-wordmark">
        <span>EST</span>
        <h1>{portfolioConfig.shortName}<em>Photography</em></h1>
        <span>{portfolioConfig.established}</span>
      </div>

      <div
        className="hero-stage"
        ref={stageRef}
        style={{ height: `${Math.round(geo.height)}px` }}
        tabIndex={0}
        role="group"
        aria-label="Photographs from the portfolio"
        onMouseEnter={() => { if (finePointer()) setPaused(true); }}
        onMouseLeave={() => { if (finePointer()) setPaused(false); }}
        onPointerDown={() => { focusFromPointer.current = true; }}
        onFocus={() => {
          const tapped = focusFromPointer.current;
          focusFromPointer.current = false;
          /* Only a keyboard arriving here should stop the wheel. */
          if (!tapped) setPaused(true);
        }}
        onBlur={() => { focusFromPointer.current = false; setPaused(false); }}
      >
        {/*
          Both the wheel and its cards turn about the SAME point — one radius
          below the middle of the stage — using transform-origin rather than by
          being positioned there. Laying the wheel out at +radius worked, but it
          put a box thousands of pixels below the fold and gave the stage that
          much scrollable overflow, which is somewhere iOS will happily send a
          finger instead of scrolling the page.
        */}
        <div
          className="hero-wheel"
          ref={wheelRef}
          style={{ transformOrigin: `50% calc(50% + ${Math.round(geo.radius)}px)` }}
        >
          {Array.from({ length: geo.count }, (_, position) => {
            const slot = position - geo.before;
            const image = images[(((slot + offset) % images.length) + images.length) % images.length];
            const angle = slot * geo.step;
            return (
              <div
                /* Keyed by SLOT, never by image: the photograph in a slot
                   changes on every recycle, and keying on it would tear the
                   card down and build it again — a fresh decode and a visible
                   flash, ten seconds apart, forever. */
                key={position}
                className="hero-card"
                style={{
                  width: `${Math.round(geo.cardW)}px`,
                  height: `${Math.round(geo.cardH)}px`,
                  /* Centred by margins, not by transform, so the origin below
                     stays measured from the card's own box. */
                  marginLeft: `${-Math.round(geo.cardW / 2)}px`,
                  marginTop: `${-Math.round(geo.cardH / 2)}px`,
                  transformOrigin: `50% calc(50% + ${Math.round(geo.radius)}px)`,
                  transform: `rotate(${angle.toFixed(3)}deg)`,
                }}
                /* Each photograph appears several times along the arc.
                   Announcing every copy would just make the hero sound broken,
                   so only one pass is exposed. */
                aria-hidden={slot < 0 || slot >= images.length ? true : undefined}
              >
                <Shot image={image} eager={position < 5} />
              </div>
            );
          })}
        </div>
      </div>

      <div className="hero-title">
        <h2>The <span>PORTFOLIO</span></h2>
        <p>{portfolioConfig.heroTagline}</p>
      </div>

      <button className="hero-scroll" onClick={() => document.getElementById('collections')?.scrollIntoView({ behavior: 'smooth' })}>
        Scroll to explore <ArrowDown size={15} />
      </button>
    </section>
  );
}

function Home({ navigate }: { navigate: Nav }) {
  return (
    <>
      <HeroSlideshow />
      <div className="collections" id="collections">
        {portfolioConfig.categories.map((category) => (
          <CategoryBand key={category.id} category={category} navigate={navigate} />
        ))}
      </div>
      <Testimonials navigate={navigate} />
      <section className="home-note">
        <p>Move through the collection slowly. Every photograph holds a story.</p>
        <button className="home-note-cta" onClick={() => navigate('/contact')}>Start an enquiry <ArrowUpRight size={16} /></button>
      </section>
    </>
  );
}

/* ---------------------------------------------------------------- WORK --- */

/*
 * The gallery is a true masonry: CSS columns, so every photograph stacks
 * directly under the one above it and no row can leave a hole. Heights vary by
 * a repeating set of aspect ratios, which is what makes it read as scattered
 * rather than as a tidy 3x3. Depth comes from the shadow and the hover lift.
 *
 * Columns flow top-to-bottom rather than left-to-right. For a gallery of
 * equals that is the right trade — gaplessness matters, strict order does not.
 */
const TONES = 5;

function DepthGallery({ images }: { images: GalleryImage[] }) {
  const [lightbox, setLightbox] = useState<number | null>(null);
  return (
    <>
      <div className="depth-gallery">
        {images.map((image, index) => (
          <button
            key={`${image.src}-${index}`}
            className={`depth-photo tone-${index % TONES} reveal`}
            style={{ '--i': index % 12 } as CSSProperties}
            onClick={() => setLightbox(index)}
            aria-label={`Open photograph ${index + 1} of ${images.length}`}
          >
            <Shot image={image} natural />
            <small>{String(index + 1).padStart(2, '0')}</small>
          </button>
        ))}
      </div>
      {lightbox !== null && <Lightbox images={images} start={lightbox} onClose={() => setLightbox(null)} />}
    </>
  );
}

function Lightbox({ images, start, onClose }: { images: GalleryImage[]; start: number; onClose: () => void }) {
  const [index, setIndex] = useState(start);
  const closeRef = useRef<HTMLButtonElement>(null);
  const swipeX = useRef<number | null>(null);

  const step = useCallback((amount: number) => {
    setIndex((current) => (current + amount + images.length) % images.length);
  }, [images.length]);

  useEffect(() => {
    /* Send focus into the dialog, and hand it back to wherever it came from. */
    const returnTo = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowRight') step(1);
      if (event.key === 'ArrowLeft') step(-1);
      if (event.key === 'Tab') event.preventDefault();  /* nothing outside is reachable */
    };
    document.addEventListener('keydown', key);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', key);
      document.body.style.overflow = '';
      returnTo?.focus?.();
    };
  }, [onClose, step]);

  return (
    <div
      className="lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={`Photograph ${index + 1} of ${images.length}`}
      onPointerDown={(event) => { swipeX.current = event.clientX; }}
      onPointerUp={(event) => {
        if (swipeX.current === null) return;
        const travelled = event.clientX - swipeX.current;
        swipeX.current = null;
        if (Math.abs(travelled) > 55) step(travelled < 0 ? 1 : -1);
      }}
    >
      <button className="lightbox-close" ref={closeRef} onClick={onClose} aria-label="Close"><X size={24} /></button>
      <button className="lightbox-nav prev" onClick={() => step(-1)} aria-label="Previous"><ArrowLeft /></button>
      {/* keyed so each photograph plays its own settle rather than swapping in place */}
      <Shot key={images[index].src + index} image={images[index]} eager />
      <button className="lightbox-nav next" onClick={() => step(1)} aria-label="Next"><ArrowRight /></button>
      <span className="lightbox-counter">{String(index + 1).padStart(2, '0')} / {String(images.length).padStart(2, '0')}</span>
    </div>
  );
}

/** Level 4 — one couple's gallery. */
function StoryView({ category, collection, story, navigate }: { category: WorkCategory; collection: Collection; story: Story; navigate: Nav }) {
  return (
    <>
      <header className="story-head reveal">
        <Crumbs
          navigate={navigate}
          items={[
            { label: 'Work', path: '/work' },
            { label: category.label, path: `/work/${category.id}` },
            { label: collection.label, path: `/work/${category.id}/${collection.id}` },
            { label: story.name },
          ]}
        />
        <h1>{story.name}</h1>
        <span className="story-rule" />
        <p className="eyebrow">{story.place} · {story.gallery.length} photographs</p>
      </header>

      {collection.kind === 'film' && (
        <section className="story-film">
          {story.videoUrl ? (
            <a className="story-film-play" href={story.videoUrl} target="_blank" rel="noreferrer">
              <Shot image={story.image} />
              <span className="story-film-shade" />
              <span className="play-button"><Play size={20} fill="currentColor" /></span>
              <span className="story-film-label">Watch the film{story.duration ? ` · ${story.duration}` : ''}</span>
            </a>
          ) : (
            <div className="story-film-play is-pending">
              <Shot image={story.image} />
              <span className="story-film-shade" />
              <span className="play-button"><Play size={20} fill="currentColor" /></span>
              <span className="story-film-label">Full film coming soon</span>
            </div>
          )}
        </section>
      )}

      <section className="story-gallery">
        <DepthGallery images={story.gallery} />
        <button className="back-link centred" onClick={() => navigate(`/work/${category.id}/${collection.id}`)}>
          <ArrowLeft size={15} /> Back to {collection.label}
        </button>
      </section>
    </>
  );
}

/* The old heading read literally "celebrating Photography". Derive it from the
   collection's kind, which the type already carries. */
function collectionHeading(category: WorkCategory, collection: Collection) {
  if (collection.kind === 'film') return <>{category.label} <em>films</em></>;
  if (collection.kind === 'candid') return <>{category.label}, <em>unposed</em></>;
  return <>{category.label} <em>photography</em></>;
}

/** Level 3 — the couples inside one collection. */
function CollectionView({ category, collection, navigate }: { category: WorkCategory; collection: Collection; navigate: Nav }) {
  return (
    <>
      <header className="collection-head reveal">
        <Crumbs
          navigate={navigate}
          items={[
            { label: 'Work', path: '/work' },
            { label: category.label, path: `/work/${category.id}` },
            { label: collection.label },
          ]}
        />
        <h1>{collectionHeading(category, collection)}</h1>
        <p className="body-copy">{category.description}</p>
      </header>
      <section className="couple-section">
        <div className="category-line">
          <span>{collection.kind === 'film' ? 'Selected films' : 'Selected stories'}</span>
          <span>{collection.stories.length}</span>
        </div>
        <div className="couple-grid">
          {collection.stories.map((story, index) => (
            <button
              key={story.id}
              className="couple-card reveal"
              style={{ '--i': index } as CSSProperties}
              onClick={() => navigate(`/work/${category.id}/${collection.id}/${story.id}`)}
            >
              <Shot image={story.image} />
              <span className="couple-shade" />
              {collection.kind === 'film' && <span className="play-button small"><Play size={14} fill="currentColor" /></span>}
              <span className="couple-name">{story.name}</span>
              <small>{story.place}</small>
            </button>
          ))}
        </div>
      </section>
    </>
  );
}

/** Level 2 — the collections inside one category. */
function CategoryView({ category, navigate }: { category: WorkCategory; navigate: Nav }) {
  return (
    <>
      <header className="collection-head reveal">
        <Crumbs navigate={navigate} items={[{ label: 'Work', path: '/work' }, { label: category.label }]} />
        <h1>{category.label} <em>collection</em></h1>
        <p className="body-copy">{category.description}</p>
      </header>
      <section className="band no-head">
        <div className="band-grid" data-count={category.collections.length}>
          {category.collections.map((item) => (
            <button key={item.id} className="band-card" onClick={() => navigate(`/work/${category.id}/${item.id}`)}>
              <Shot image={item.cover} />
              <span className="band-card-shade" />
              <span className="band-card-label">{item.label}</span>
              <span className="band-card-count">{item.stories.length} {item.kind === 'film' ? 'films' : 'stories'}</span>
              <ArrowUpRight className="band-card-arrow" size={18} />
            </button>
          ))}
        </div>
      </section>
    </>
  );
}

/** Level 1 — every category. */
function WorkIndex({ navigate }: { navigate: Nav }) {
  return (
    <>
      <PageIntro
        label="The work"
        title={<>Every story<br /><em>deserves its frame.</em></>}
        description="Photography and films, arranged by the feeling they leave behind."
      />
      <section className="work-index">
        {portfolioConfig.categories.map((category, index) => (
          <button className="work-row reveal" style={{ '--i': index } as CSSProperties} onClick={() => navigate(`/work/${category.id}`)} key={category.id}>
            <span className="row-number">{String(index + 1).padStart(2, '0')}</span>
            <span className="row-image"><Shot image={category.cover} /></span>
            <span className="row-title">{category.label}<em>{category.collections.map((c) => c.label).join(' · ')}</em></span>
            <span className="row-description">{category.description}</span>
            <ArrowUpRight className="row-arrow" size={20} />
          </button>
        ))}
      </section>
    </>
  );
}

function Work({ navigate, categoryId, collectionId, storyId }: { navigate: Nav; categoryId?: string; collectionId?: string; storyId?: string }) {
  const category = findCategory(categoryId);
  const collection = findCollection(category, collectionId);
  const story = findStory(collection, storyId);
  /* A segment was supplied but did not resolve — say so rather than quietly
     rendering the parent, which makes a broken link look like a working one. */
  if (categoryId && !category) return <NotFound navigate={navigate} />;
  if (collectionId && !collection) return <NotFound navigate={navigate} />;
  if (storyId && !story) return <NotFound navigate={navigate} />;
  if (category && collection && story) return <StoryView category={category} collection={collection} story={story} navigate={navigate} />;
  if (category && collection) return <CollectionView category={category} collection={collection} navigate={navigate} />;
  /* One collection is not a choice — skip the page that only holds one card. */
  if (category && category.collections.length === 1) {
    return <CollectionView category={category} collection={category.collections[0]} navigate={navigate} />;
  }
  if (category) return <CategoryView category={category} navigate={navigate} />;
  return <WorkIndex navigate={navigate} />;
}

/* --------------------------------------------------------------- FILMS --- */

/* Brief: films featured on their own page, listed by category. */
function Films({ navigate, categoryId }: { navigate: Nav; categoryId?: string }) {
  const entry = filmCategories.find((item) => item.category.id === categoryId);

  if (entry) {
    const films = entry.collections.flatMap((collection) =>
      collection.stories.map((story) => ({ collection, story })),
    );
    return (
      <>
        <header className="collection-head reveal">
          <Crumbs navigate={navigate} items={[{ label: 'Films', path: '/films' }, { label: entry.category.label }]} />
          <h1>{entry.category.label} <em>films</em></h1>
          <p className="body-copy">{entry.category.description}</p>
        </header>
        <section className="couple-section">
          <div className="category-line"><span>Selected films</span><span>{films.length}</span></div>
          <div className="couple-grid">
            {films.map(({ collection, story }) => (
              <button
                key={`${collection.id}-${story.id}`}
                className="couple-card"
                onClick={() => navigate(`/work/${entry.category.id}/${collection.id}/${story.id}`)}
              >
                <Shot image={story.image} />
                <span className="couple-shade" />
                <span className="play-button small"><Play size={14} fill="currentColor" /></span>
                <span className="couple-name">{story.name}</span>
                <small>{story.place}{story.duration ? ` · ${story.duration}` : ''}{story.videoUrl ? '' : ' · Coming soon'}</small>
              </button>
            ))}
          </div>
        </section>
      </>
    );
  }

  const total = filmCategories.reduce(
    (sum, item) => sum + item.collections.reduce((inner, collection) => inner + collection.stories.length, 0),
    0,
  );

  return (
    <>
      <PageIntro
        label="The films"
        title={<>The moments<br /><em>you can hear.</em></>}
        description="Wedding films for the voices, music, laughter and little in-between moments that photographs cannot hold."
      />
      <section className="band no-head">
        <div className="category-line"><span>Film collections</span><span>{total} films</span></div>
        <div className="band-grid" data-count={filmCategories.length}>
          {filmCategories.map(({ category, collections }) => (
            <button key={category.id} className="band-card" onClick={() => navigate(`/films/${category.id}`)}>
              <Shot image={collections[0].cover} />
              <span className="band-card-shade" />
              <span className="play-button"><Play size={17} fill="currentColor" /></span>
              <span className="band-card-label">{category.label}</span>
              <span className="band-card-count">
                {collections.reduce((sum, item) => sum + item.stories.length, 0)} films
              </span>
              <ArrowUpRight className="band-card-arrow" size={18} />
            </button>
          ))}
        </div>
      </section>
    </>
  );
}

/* --------------------------------------------------------------- ABOUT --- */

function About() {
  return (
    <>
      <PageIntro label="About the studio" title={<>The people<br /><em>behind the frame.</em></>} description={portfolioConfig.about.description} />
      <section className="about-page reveal">
        <div className="about-copy">
          <p className="eyebrow">{portfolioConfig.about.eyebrow}</p>
          <h2>{portfolioConfig.about.heading}</h2>
          <p className="body-copy">
            We photograph weddings the way they are lived — the long preparations, the ritual nobody
            explained to you, the aunt who cries at exactly the right moment. Warm, traditional, and
            unhurried.
          </p>
          {/* The point of this paragraph is coverage, not headcount. Saying it
              as "a small team" turned a reassurance into a doubt. */}
          <p className="body-copy">
            The day is never covered by one camera alone — someone is watching the room while
            someone else stays with the couple. You will not be asked to pose for very much.
          </p>
        </div>
        <div className="about-image is-pending">
          <span>Studio portrait<small>Photograph to be supplied</small></span>
        </div>
      </section>
    </>
  );
}

/* ------------------------------------------------------------- CONTACT --- */

/*
 * Brief: enquiry only, no pricing. He needs event date, city, type of event,
 * budget range and how they found him — and he answers on WhatsApp, phone and
 * Instagram DM. No backend yet, so the form composes the message and hands it
 * to WhatsApp (preferred) or email.
 */
function EnquiryForm() {
  const { eventTypes, budgetRanges, referralSources } = portfolioConfig.enquiry;
  /* Holds the composed links so the visitor always has a way through, even when
     window.open is blocked — which it is inside Instagram's in-app browser, and
     that is exactly where this studio's traffic comes from. */
  const [sent, setSent] = useState<{ wa: string | null; mail: string } | null>(null);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const value = (key: string) => String(data.get(key) ?? '').trim() || '—';
    const lines = [
      `Name: ${value('name')}`,
      `Phone: ${value('phone')}`,
      `Event date: ${value('eventDate')}`,
      `City: ${value('city')}`,
      `Type of event: ${value('eventType')}`,
      `Budget range: ${value('budget')}`,
      `How they found us: ${value('referral')}`,
      '',
      value('message'),
    ].join('\n');

    const mail = `mailto:${portfolioConfig.email}?subject=${encodeURIComponent('Wedding enquiry')}&body=${encodeURIComponent(lines)}`;
    const wa = portfolioConfig.whatsapp
      ? `https://wa.me/${portfolioConfig.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(lines)}`
      : null;
    if (wa) window.open(wa, '_blank', 'noreferrer');
    else window.location.href = mail;
    setSent({ wa, mail });
  };

  return (
    <form className="enquiry-form" onSubmit={onSubmit}>
      <label>Your name<input name="name" required autoComplete="name" /></label>
      <label>Your phone number<input name="phone" type="tel" required autoComplete="tel" /></label>
      <label>Event date<input name="eventDate" type="date" required /></label>
      <label>City<input name="city" required /></label>
      <label>Type of event
        <select name="eventType" required defaultValue="">
          <option value="" disabled>Choose one</option>
          {eventTypes.map((type) => <option key={type} value={type}>{type}</option>)}
        </select>
      </label>
      <label>Budget range
        <select name="budget" required defaultValue="">
          <option value="" disabled>Choose one</option>
          {budgetRanges.map((range) => <option key={range} value={range}>{range}</option>)}
        </select>
      </label>
      <label>How did you find us?
        <select name="referral" required defaultValue="">
          <option value="" disabled>Choose one</option>
          {referralSources.map((source) => <option key={source} value={source}>{source}</option>)}
        </select>
      </label>
      <label className="full">Anything else we should know?<textarea name="message" rows={4} /></label>
      <button className="enquiry-submit" type="submit">Send enquiry <i className="cta-disc"><ArrowUpRight size={15} /></i></button>
      {sent && (
        <p className="enquiry-sent" role="status">
          Your message is ready to send{sent.wa ? ' in WhatsApp' : ' in your email app'}. We usually reply the same day.
          {' '}If nothing opened,{' '}
          {sent.wa && <><a href={sent.wa} target="_blank" rel="noreferrer">open WhatsApp</a> or{' '}</>}
          <a href={sent.mail}>send it by email</a> instead.
        </p>
      )}
    </form>
  );
}

function Contact() {
  return (
    <>
      <PageIntro label="Contact" title={<>Ready to tell<br /><em>your story?</em></>} description="Tell us about the day. We will come back to you with availability and what a collection would look like." />
      <section className="contact-page reveal">
        <div className="contact-channels">
          <p className="eyebrow">Fastest ways to reach us</p>
          <Channel icon={<MessageCircle size={17} />} label="WhatsApp" href={portfolioConfig.whatsapp ? `https://wa.me/${portfolioConfig.whatsapp.replace(/\D/g, '')}` : null} />
          <Channel icon={<Phone size={17} />} label={portfolioConfig.phone ?? 'Phone call'} href={portfolioConfig.phone ? `tel:${portfolioConfig.phone.replace(/[^\d+]/g, '')}` : null} />
          <Channel icon={<Instagram size={17} />} label={portfolioConfig.instagram ?? 'Instagram DM'} href={portfolioConfig.instagram ? `https://instagram.com/${portfolioConfig.instagram.replace('@', '')}` : null} />
          <Channel icon={<Mail size={17} />} label={portfolioConfig.email} href={`mailto:${portfolioConfig.email}`} />
          <p className="body-copy contact-note">Based in {portfolioConfig.location}. We travel for weddings.</p>
        </div>
        <div className="contact-form-wrap">
          <p className="eyebrow">Enquire</p>
          <EnquiryForm />
        </div>
      </section>
    </>
  );
}

/* ----------------------------------------------------------------- APP --- */

function NotFound({ navigate }: { navigate: Nav }) {
  return (
    <>
      <PageIntro
        label="Not found"
        title={<>That page has<br /><em>moved on.</em></>}
        description="The link may be old, or we may have renamed something. The work is all still here."
      />
      <section className="notfound-actions">
        <button className="home-note-cta" onClick={() => navigate('/work')}>See the work <ArrowUpRight size={16} /></button>
        <button className="back-link" onClick={() => navigate('/')}><ArrowLeft size={15} /> Back home</button>
      </section>
    </>
  );
}

/* Titles are per route: a shared one made every bookmark and shared link alike. */
function metaFor(route: Route): [string, string] {
  const brand = portfolioConfig.clientName;
  const category = findCategory(route.categoryId);
  const collection = findCollection(category, route.collectionId);
  const story = findStory(collection, route.storyId);
  const missing = [route.page === 'notfound',
    route.categoryId && !category,
    route.collectionId && !collection,
    route.storyId && !story].some(Boolean);
  /* Mirror Work()'s resolution so a not-found body never carries a page title. */
  if (missing) return [`Page not found — ${brand}`, 'That page has moved or no longer exists.'];
  if (route.page === 'work') {
    if (story) return [`${story.name} — ${category!.label} — ${brand}`, `${story.gallery.length} photographs from ${story.name}, ${story.place}.`];
    if (collection) return [`${category!.label} ${collection.label} — ${brand}`, category!.description];
    if (category) return [`${category!.label} — ${brand}`, category!.description];
    return [`The work — ${brand}`, 'Wedding photography and films, arranged by category.'];
  }
  if (route.page === 'films') {
    if (category) return [`${category.label} films — ${brand}`, `Wedding films from ${category.label.toLowerCase()}.`];
    return [`Films — ${brand}`, 'Wedding films for the voices, music and laughter photographs cannot hold.'];
  }
  if (route.page === 'about') return [`About — ${brand}`, portfolioConfig.about.description];
  if (route.page === 'contact') return [`Enquire — ${brand}`, 'Tell us about the day. We reply the same day, usually on WhatsApp.'];
  return [`${brand} — Wedding photography across India`, 'Warm, traditional wedding photography and films. Enquire for availability.'];
}

function App() {
  const { route, navigate } = useRoute();
  const routeKey = `${route.page}/${route.categoryId ?? ''}/${route.collectionId ?? ''}/${route.storyId ?? ''}`;
  const [title, description] = metaFor(route);
  const [searchOpen, setSearchOpen] = useState(false);
  useDocumentMeta(title, description);
  useScrollToTopOnRouteChange(routeKey);

  /* Ctrl/Cmd-K is what anyone who searches often reaches for without thinking. */
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearchOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  useImageProtection();
  useScrollReveal(routeKey);
  useReadingProgress();
  return (
    <main>
      <a className="skip-link" href="#main">Skip to content</a>
      <div className="read-bar" aria-hidden="true" />
      <SiteNav navigate={navigate} current={route.page} onSearch={() => setSearchOpen(true)} />
      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} navigate={navigate} />
      {/* keyed so each navigation replays the page-enter fade */}
      <div className="page-shell" id="main" key={routeKey}>
        {route.page === 'home' && <Home navigate={navigate} />}
        {route.page === 'work' && <Work navigate={navigate} categoryId={route.categoryId} collectionId={route.collectionId} storyId={route.storyId} />}
        {route.page === 'films' && <Films navigate={navigate} categoryId={route.categoryId} />}
        {route.page === 'about' && <About />}
        {route.page === 'contact' && <Contact />}
        {route.page === 'notfound' && <NotFound navigate={navigate} />}
      </div>
      <Footer navigate={navigate} />
    </main>
  );
}

export default App;
