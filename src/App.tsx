import {
  useCallback, useEffect, useRef, useState,
  type CSSProperties, type FormEvent, type PointerEvent as ReactPointerEvent, type ReactNode,
} from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight, Instagram, Mail, Menu, MessageCircle, Phone, Play, X } from 'lucide-react';
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
    const onPop = () => setRoute(getRoute());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  const navigate = useCallback((path: string) => {
    window.history.pushState({}, '', path);
    setRoute(getRoute());
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);
  return { route, navigate };
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
      doc.classList.toggle('is-scrolled', doc.scrollTop > 24);
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
function Shot({ image, className, eager }: { image: GalleryImage; className?: string; eager?: boolean }) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (imgRef.current?.complete) setLoaded(true);
  }, [image.src]);

  return (
    <span className={`shot ${className ?? ''} ${loaded ? 'is-loaded' : ''}`}>
      <img
        ref={imgRef}
        src={image.src}
        alt={image.alt}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        draggable={false}
        onLoad={() => setLoaded(true)}
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

function SiteNav({ navigate, current }: { navigate: Nav; current: Route['page'] }) {
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
      <button className="nav-cta" onClick={() => go('/contact')}>Enquire <i className="cta-disc"><ArrowUpRight size={14} /></i></button>
      <button className="menu-button" type="button" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle navigation">
        {menuOpen ? <X size={22} /> : <Menu size={22} />}
      </button>
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

/*
 * Brief: visitors see a slideshow first.
 *
 * A stepped slideshow, not a free-scrolling strip. The centred photograph is
 * the large one; its neighbours sit back on either side. One swipe, one
 * sideways wheel nudge or one arrow key advances exactly ONE frame — a
 * cooldown makes sure a single flick cannot skid through three of them.
 *
 * It wraps forever: the offset of each frame is its SHORTEST signed distance
 * from the current index, so after the last photograph the first comes round
 * again with no seam and no end.
 *
 * Vertical scrolling is deliberately left alone — hijacking it would trap the
 * visitor in the hero. Horizontal intent only.
 */
const HERO_DWELL_MS = 5200;  /* unattended, it advances on its own */
const HERO_LOCK_MS = 380;    /* one gesture, one frame — under the 620ms glide so rapid swipes stay responsive */
const HERO_SWIPE_PX = 45;    /* drag distance that counts as a step */
const HERO_WHEEL_PX = 40;    /* horizontal wheel travel that counts as a step */

function HeroSlideshow() {
  const images = portfolioConfig.slideshowImages;
  const count = images.length;
  const stageRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  const locked = useRef(false);
  const paused = useRef(false);
  const pointer = useRef({ id: -1, startX: 0, active: false });
  const wheelAcc = useRef(0);

  /*
   * The lean is written straight to the DOM as a custom property. Putting it in
   * React state instead re-rendered all eight frames on every pointermove — that
   * was what made the swipe feel like it was catching.
   */
  const lean = useCallback((px: number) => {
    stageRef.current?.style.setProperty('--drag', `${px}px`);
  }, []);

  const step = useCallback((direction: number) => {
    if (locked.current) return;
    locked.current = true;
    setIndex((current) => current + direction);
    window.setTimeout(() => { locked.current = false; }, HERO_LOCK_MS);
  }, []);

  /* Unattended autoplay. Stops the moment anyone touches or looks at it. */
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setInterval(() => {
      if (!paused.current && !pointer.current.active) setIndex((current) => current + 1);
    }, HERO_DWELL_MS);
    return () => window.clearInterval(timer);
  }, []);

  /* Horizontal wheel / trackpad. Registered by hand so it can be non-passive. */
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const onWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;  /* let the page scroll */
      event.preventDefault();
      wheelAcc.current += event.deltaX;
      if (Math.abs(wheelAcc.current) < HERO_WHEEL_PX) return;
      step(wheelAcc.current > 0 ? 1 : -1);
      wheelAcc.current = 0;
    };
    stage.addEventListener('wheel', onWheel, { passive: false });
    return () => stage.removeEventListener('wheel', onWheel);
  }, [step]);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const stage = stageRef.current;
    if (!stage) return;
    pointer.current = { id: event.pointerId, startX: event.clientX, active: true };
    stage.setPointerCapture(event.pointerId);
    /* Transitions stand down while the deck is under the finger, so it tracks
       1:1 instead of easing towards where the finger already was. */
    stage.classList.add('is-dragging');
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointer.current.active) return;
    const travelled = event.clientX - pointer.current.startX;
    /* Damped, and softened further past the commit point so it reads as resistance. */
    const eased = Math.sign(travelled) * Math.pow(Math.abs(travelled), 0.86) * 0.62;
    lean(eased);
  };

  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const stage = stageRef.current;
    if (!stage || !pointer.current.active) return;
    const travelled = event.clientX - pointer.current.startX;
    pointer.current.active = false;
    if (stage.hasPointerCapture(event.pointerId)) stage.releasePointerCapture(event.pointerId);
    /* Class off and lean to zero in the same frame: the release and the step
       become one continuous movement rather than two. */
    stage.classList.remove('is-dragging');
    lean(0);
    if (Math.abs(travelled) > HERO_SWIPE_PX) step(travelled < 0 ? 1 : -1);
  };

  /* Shortest signed distance from the centre — this is what makes it endless. */
  const offsetOf = (position: number) => {
    const forward = ((position - index) % count + count) % count;
    return forward > count / 2 ? forward - count : forward;
  };

  const centred = ((index % count) + count) % count;

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
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onMouseEnter={() => { paused.current = true; }}
        onMouseLeave={() => { paused.current = false; }}
        onFocus={() => { paused.current = true; }}
        onBlur={() => { paused.current = false; }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowRight') { event.preventDefault(); step(1); }
          if (event.key === 'ArrowLeft') { event.preventDefault(); step(-1); }
        }}
        tabIndex={0}
        role="group"
        aria-roledescription="carousel"
        aria-label="Photographs from the portfolio — use the arrow keys"
      >
        {images.map((image, position) => {
          const offset = offsetOf(position);
          const depth = Math.abs(offset);
          /* The centre frame is the large one; each rank back sits smaller and dimmer. */
          const scale = depth === 0 ? 1 : depth === 1 ? 0.74 : 0.56;
          const fade = depth === 0 ? 1 : depth === 1 ? 0.72 : 0.34;
          return (
            <div
              key={image.src + position}
              className={`hero-frame ${offset === 0 ? 'is-active' : ''} ${depth > 2 ? 'is-far' : ''}`}
              style={{ '--o': offset, '--s': scale, '--f': fade, '--z': 10 - depth } as CSSProperties}
              aria-hidden={offset === 0 ? undefined : true}
            >
              <Shot image={image} eager={depth <= 1} />
            </div>
          );
        })}
      </div>

      {/* Bare arrows, no counter — the reference site's treatment. Swipe, wheel
          and arrow keys all still drive the same step(). */}
      <div className="hero-nav">
        <button onClick={() => step(-1)} aria-label="Previous photograph"><ArrowLeft size={20} /></button>
        <button onClick={() => step(1)} aria-label="Next photograph"><ArrowRight size={20} /></button>
      </div>

      <p className="hero-sr" aria-live="polite">
        Photograph {centred + 1} of {count}
      </p>

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

/** One category band on the home page: heading, rule, then its collection cards. */
function CategoryBand({ category, navigate }: { category: WorkCategory; navigate: Nav }) {
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
          Maternity, Portrait and Baby shower have a single collection. Left
          alone, that one card stretched the full width and swallowed the
          viewport. It now shares the row with a quiet editorial column, which
          fills the space with something worth reading instead of banner.
        */}
        {category.collections.length === 1 && (
          <aside className="band-aside reveal" style={{ '--i': 1 } as CSSProperties}>
            <p className="body-copy">{category.description}</p>
            <span className="band-aside-count">
              {category.collections[0].stories.length}
              {category.collections[0].stories.length === 1 ? ' story' : ' stories'}
            </span>
            <button
              className="band-aside-cta"
              onClick={() => navigate(`/work/${category.id}/${category.collections[0].id}`)}
            >
              See the {category.label.toLowerCase()} work <ArrowUpRight size={15} />
            </button>
          </aside>
        )}
      </div>
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
            <Shot image={image} />
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
          <p className="body-copy">
            We work as a small team so there is always someone watching the room while someone else
            watches the couple. You will not be asked to pose for very much.
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
  useDocumentMeta(title, description);
  useImageProtection();
  useScrollReveal(routeKey);
  useReadingProgress();
  return (
    <main>
      <a className="skip-link" href="#main">Skip to content</a>
      <div className="read-bar" aria-hidden="true" />
      <SiteNav navigate={navigate} current={route.page} />
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
