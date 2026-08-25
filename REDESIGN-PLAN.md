# Redesign plan — creative direction audit

**Subject:** Nandan's Photography (`nandansphotography.com`)
**Audited:** 25 Aug 2026
**Surface:** 9 routes · `App.tsx` (1,064 lines) · `index.css` (654 lines) · `portfolio.ts`
**Method:** Full source read + dev server rendered and DOM-measured at 1440×900 and 390×844
**Status:** No files modified. Nothing below is implemented.

---

## 0. How to read this

Every finding carries an ID (`H-01`, `P-03`, …) referenced by the roadmap in §8. Work the
roadmap, not this list — the roadmap is ordered so each phase ships on its own.

Priorities:

| | meaning |
|---|---|
| **CRITICAL** | Actively damaging the work, or the first thing a visitor sees |
| **HIGH** | The difference between a template and a designed site |
| **MEDIUM** | Real refinement, not urgent |
| **LOW** | Hygiene |

---

## 1. Verdict

**Current: 41/100. Achievable: 92/100.**

The site is well engineered. Four-level information architecture, clean URLs, name slugs,
per-route metadata, genuine accessibility work, careful code comments. Somebody cared, and it
shows in the parts a visitor never sees.

It has also **never had a single art-direction decision made about it.** Everything a visitor
*does* see was inherited rather than chosen: DM Sans as a display face, Playfair Display as the
"luxury" signal, a coverflow carousel, drop-shadowed masonry cards, a three-column SaaS footer.
Individually each is defensible. Collectively they produce a site that could belong to any
photographer in any country — the precise opposite of what a portfolio is for.

Three decisions are worse than anonymous; they are actively working against the photographer.
The site **desaturates his colour grade**, **crops his compositions**, and **reorders his
sequence** — the last of which is an explicit brief requirement. A photography site is doing
damage to the photography.

On the landing screen at 1440×900, the largest photograph occupies roughly **11% of the
viewport**. The other 89% is beige.

---

## 2. Evidence

Measured against the running dev server, not inferred from source.

| Measurement | Value | Detail |
|---|---:|---|
| Hero photo share of viewport | **~11%** | Stage 470px of an 888px hero; frame 300×418 at 1440px |
| Hero photo width on a phone | **196px** | 390×844; centre frame 196×280 |
| Gallery photo width on a phone | **~122px** | `column-count:3` at 390px with a 7px gutter |
| `srcset` / `sizes` attributes on the site | **0** | Every image is a fixed `?w=1400` JPEG |
| Logo PNG | **454,863 B** | 1080×1080 natural, rendered at 38px, twice per page |
| JS bundle | 181,182 B | Logo is **2.5× the JS bundle** |
| CSS bundle | 40,259 B | |
| Computed `<h1>` | **82.03px DM Sans** | `letter-spacing: -4.92px` |
| Computed About `<h2>` | 50.48px DM Sans | `letter-spacing: -2.02px` |
| Identical `.band` sections on home | **8** | Same heading + rule + tagline + 3-card grid |
| Default photo saturation | **0.84** | Restored to 1.0 on `:hover` only |
| `.reveal` nodes on home | 26 | All doing the identical fade-up-16px |
| DOM nodes on home | 355 | Architecturally light — the weight is all images |

> **The consequence of that saturation number.** `filter: saturate(.84)` is the resting state;
> `saturate(1)` is the hover state. Touch devices have no hover. So the majority of this
> studio's audience — Instagram traffic, on phones — **never once sees the photographs at their
> true colour.** They only ever see the degraded version.

---

## 3. Findings

### 3.1 Hero — the first five seconds

---

#### `H-01` — The wordmark is sitting on top of the photograph — **CRITICAL**

**Problem.** `.hero-wordmark` carries `margin-bottom: -46px`, pulling the italic word
"Photography" directly over the top edge of the centre frame. Visible at 1440px, worse at 390px
where it lands across the bride's headpiece. This does not read as intentional overlap —
art-directed overlap sits against negative space or a controlled tonal area. This sits across
the busiest part of the picture.

**Why it matters.** It is the very first thing on the page and it looks like a CSS bug.
Everything after it is read through that impression.

**Replace with.** Remove the negative margin. Then remove the hero wordmark entirely — the name
is already in the sticky nav two centimetres above it, so the studio is printed twice on one
screen. Let the nav carry identity; give the hero back to the photograph.

**Effort.** ~10 minutes.

---

#### `H-02` — Coverflow, in 2026 — **CRITICAL**

**Problem.** The hero is a 3-deep coverflow deck — centre frame at `scale(1)`, neighbours at
`0.74` and `0.56`, dimmed to `0.72` and `0.34` opacity. The pattern peaked with iTunes in 2007
and was retired industry-wide by 2013. It is the most dated element on the site.

**Why it matters.** Beyond datedness: the pattern's whole premise is showing the visitor
*shrunken, cropped, dimmed* versions of four photographs in order to frame one small one. For a
photographer that is an actively hostile presentation — nothing is seen properly.

The engineering underneath is excellent. The wrap-around offset maths, the pointer damping, the
380ms gesture lock, writing drag to a CSS custom property instead of React state — all genuinely
well done. **The pattern is the problem, not the code.**

**Replace with.** A single full-bleed photograph, edge to edge, `100dvh`, no chrome. One image.
Crossfade to the next every 6.5s with a slow `scale(1.06 → 1.0)` Ken Burns drift underneath, so
the frame is never static but never obviously moving. Type overlays lower-left on a soft bottom
gradient, not centred. Keep the existing swipe/wheel/arrow-key `step()` logic — retarget it at a
crossfade instead of a deck.

**Design direction.** A magazine's opening spread, not a widget. The visitor should not be able
to tell there is a carousel until the second image arrives. Kill the visible arrows; move to a
hairline progress rule along the bottom edge — six thin segments, the active one filling over
6.5s.

**Motion direction.** Crossfade `1400ms`, `cubic-bezier(.4,0,.2,1)` — deliberately slower than
any other transition on the site, so the hero reads as a different tempo from the UI. Ken Burns
runs `8s linear`, restarting per slide. Reduced motion: hold one still frame, no autoplay,
arrows return.

**This is the highest-leverage change in the document.**

---

#### `H-03` — The hero background is mud — **CRITICAL**

**Problem.** `.hero` is `#b3a894`, a desaturated warm grey occupying ~89% of the landing screen.
It sits in the same mid-tone value range as the photographs' own midtones, so the images have
nothing to separate from and read flat. A radial cream glow at 50%/38% adds haze, not structure.

**Why it matters.** Colour contrast against the work is how a photograph gains presence. Beige
on beige is why these images look ordinary here and would look striking on Instagram.

**Replace with.** Once the hero is full-bleed the background disappears — the photograph *is*
the ground. Where a ground is still needed (film sections, lightbox, closing block), use warm
ink `#12100D`. Reserve cream `#F2EEE6` for editorial and text pages only.

> **Photographs live on ink. Words live on paper.**
> That single rule is more art direction than the site currently has anywhere.

---

#### `H-04` — Five seconds in, the visitor knows nothing — **HIGH**

**Problem.** The hero says: the studio's name, "EST 2015", "The *PORTFOLIO*", and "Every ritual,
every glance, remembered". Of the five things a hero must answer, it answers one and a half.

**Why it matters.** "The Portfolio" is a section label, not a positioning statement — it tells
the visitor what they are looking at, which they already knew. The tagline is atmospheric but
says nothing a competitor could not also say. Nowhere does the screen state *where he works*,
*what kind of wedding photography this is*, or *why it costs what it costs*. And `location` is
the bare string `'India'`, which is not a service area — it is the absence of one.

**Replace with.** A two-line overlay, lower-left, over the full-bleed image:

- **Line 1** — display serif, large: *"Weddings, photographed the way they are lived."*
- **Line 2** — mono, small, letterspaced: `NANDAN'S PHOTOGRAPHY · [CITY] · SINCE 2015 · TRAVELLING FOR WEDDINGS ACROSS INDIA`

That second line does four jobs at once: identity, geography, longevity, destination
availability. It is also the single most valuable line on the site for local search.

**Blocked on.** The city. `BRIEF.md` already flags this and correctly refuses to invent one.
**Ask Nandan for his city and service radius.** Everything else in the hero proceeds without it.

---

#### `H-05` — The page has no entrance — **MEDIUM**

**Problem.** Five staggered `hero-in` fade-ups at 0 / .1 / .22 / .26 / .38s, over remote Pexels
images that arrive whenever they arrive. The chrome animates in neatly and then photographs pop
in behind it at random. There is no loading state at all.

**Replace with.** A real entrance, first visit only (guard with `sessionStorage` — nobody wants
to watch it twice):

| t | event |
|---|---|
| `0` | Ink ground, monogram centred at 40% opacity, **held until the first hero image reports `decode()` complete** |
| `+0ms` | Ground splits and lifts as two panels, `900ms` — revealing the photograph already in place beneath |
| `+340ms` | Headline `clip-path` wipes up from its own baseline, `760ms` |
| `+520ms` | Nav and mono line fade in, `520ms` |

Total under 1.9s, and it doubles as the image preloader rather than sitting on top of one.

**Motion direction.** Everything on `cubic-bezier(.22,1,.36,1)`. Nothing bounces. Nothing scales
up from small. The reveal is a **curtain**, which is the correct metaphor for a wedding.

**Do this after the hero itself is right** — an entrance for a coverflow deck is polish on the
wrong object.

---

### 3.2 Typography

---

#### `T-01` — DM Sans is doing the display typography — **CRITICAL**

**Problem.** Every `<h1>` and `<h2>` inherits `font-family` from `:root`, which is DM Sans.
Measured on `/about`: h1 renders at **82.03px in DM Sans with -4.92px letter-spacing**. The
About h2 — "Warm, traditional, and made to be looked at for years." — renders at 50.48px in the
same face.

**Why it matters.** DM Sans is a *user-interface* typeface. Tight-tracked geometric sans at
80px+ is the house style of every SaaS landing page built since 2021 — the most recognisable
"generic modern startup" signal in web design. On a page whose stated feeling is **warm and
traditional**, the largest words are set in a face that reads as cold, systematic and
Californian. The About headline in particular could be selling project-management software.

**Replace with.** Two faces; DM Sans keeps neither display role.

| Role | Face | Notes |
|---|---|---|
| **Display** | *Canela* or *Reckless* (licensed, ~$200–400) | Worth it at this price point |
| | *Instrument Serif* or *Newsreader* (Google Fonts) | If the budget is zero |
| **Body / UI** | DM Sans — **demoted** | Genuinely good in this role |
| **Utility** | DM Mono — **unchanged** | The best typographic decision on the site |

All three display candidates have the editorial authority Playfair is reaching for, without
Playfair's ubiquity.

**Highest visual-return-per-hour change available.**

---

#### `T-02` — Playfair Display, negatively tracked — **CRITICAL**

**Problem.** Two compounding faults.

1. Playfair Display is the single most-used serif on wedding websites worldwide. It carries no
   distinction — it signals "this is a wedding site" the way a script font signals "bakery".
2. The `<em>` inherits the h1's `letter-spacing: -.06em`, so the italic renders at **82px with
   -4.92px tracking**. Playfair is a Didone — extreme thick-thin contrast, hairline serifs.
   Didones require normal-to-**positive** tracking. At `-0.06em` the hairlines collide and the
   counters close up. This is typographically incorrect, not a matter of taste.

**Why it matters.** The italic carries 100% of the site's "luxury" signal — it appears in every
headline, every card label, every band heading. That entire signal rests on the most predictable
serif available, set wrong.

**Replace with.** Whichever display face replaces Playfair, set the italic at `letter-spacing: 0`
to `+.005em` and **never inherit the display's negative tracking**. Then ration it — the italic
currently appears in nearly every heading, which spends the emphasis until it means nothing.
**One italic word per page, maximum.**

The tracking fix alone is one line of CSS.

---

#### `T-03` — There is no type scale — **HIGH**

**Problem.** Sizes are set ad hoc per component with unrelated `clamp()` ranges:
`clamp(48px,6.5vw,104px)`, `clamp(38px,5vw,74px)`, `clamp(34px,4.4vw,60px)`,
`clamp(26px,3vw,40px)`, `clamp(24px,2.4vw,38px)`. Body copy 15px, row descriptions 14px,
channels 14px, eyebrows 11px, band-card counts 9px, watermark 8px, footer-bottom 9px. Nothing
relates to anything.

**Why it matters.** A visitor cannot articulate this but feels it as "slightly off". Consistent
ratio is a large part of what separates designed from assembled. The 8px and 9px sizes are below
the threshold at which type reads as intentional rather than merely small.

**Replace with.** A fixed 1.25-ratio scale as custom properties, used everywhere:

```
12 · 14 · 16 · 20 · 25 · 31 · 39 · 49 · 61 · 76 · 95
```

Floor all utility type at 12px. **Cap the display at two steps per page** — a page using 95, 61
and 39 has no hierarchy, it has three headlines.

---

#### `T-04` — Body measure is 390px, about 45 characters — **MEDIUM**

**Problem.** `.body-copy` is capped at `max-width: 390px` at 15px — roughly 45 characters per
line, well under the 60–75 optimum. It produces the short ragged paragraphs visible on `/work`
and `/contact`.

**Replace with.** `max-width: 62ch` at 16–17px with `line-height: 1.65`. Character-based, so it
holds when the type scale changes. On `/about`, where the copy is doing persuasive work, 17px.

---

#### `T-05` — Fonts load via CSS `@import` — **MEDIUM**

**Problem.** Line 1 of `index.css` is an `@import` to Google Fonts. That request cannot begin
until the stylesheet itself has downloaded and parsed — it is serialised behind the CSS — and no
`preconnect` exists in `index.html`.

**Replace with.** `<link rel="preconnect">` to both `fonts.googleapis.com` and
`fonts.gstatic.com`, then the stylesheet `<link>`, both in `<head>`. Better: self-host the four
faces as woff2 with `font-display: swap` and `preload` the two used above the fold. Removes a
third-party round trip from the critical path, and removes a GDPR question from the client's
site.

---

### 3.3 Photography presentation

> The most serious section here. The site does not merely present the work weakly — in three
> specific ways it **modifies the work without permission.**

---

#### `P-01` — The site crops his compositions to fit a pattern — **CRITICAL**

**Problem.** `DepthGallery` assigns aspect ratio by `index % 5` — cycling 3:4, 1:1, 4:5, 4:3,
2:3 — and `.shot img` is `object-fit: cover`. A photograph's displayed shape is therefore
determined by **its position in the array**, and whatever does not fit is cut off. A wide
environmental shot landing on index 4 is cropped into a 2:3 portrait. Same treatment on
`.band-card` (4:3), `.couple-card` (4:3) and `.row-image` (220×130).

**Why it matters.** Framing is the craft. It is the thing the client is paying for. A website
that re-crops a photographer's frames to satisfy a decorative rhythm is doing the one thing a
portfolio must never do. It is also invisible to everyone except the photographer, who will
notice immediately and lose confidence in the site.

**Replace with.** Store real dimensions on `GalleryImage` (`width`, `height`) and lay out from
the true aspect ratio with `object-fit: contain` — or better, size the container *from* the
image. This also fixes cumulative layout shift for free, since the box is known before the bytes
arrive.

Rhythm should come from **scale variation** — some photographs full-bleed, some half-column,
some inset — not from cropping.

**Ship this before the real finals arrive, or every one of the ~870 images gets mangled on day
one.**

---

#### `P-02` — The site desaturates his grade, and on mobile never restores it — **CRITICAL**

**Problem.**

```css
.depth-photo .shot img { filter: saturate(.84); }   /* restored to 1 on :hover */
.row-image  .shot img { filter: saturate(.75); }
.hero-frame .shot img { filter: saturate(.94); }
```

**Why it matters.** Colour grading is a deliverable. This studio's work is Indian weddings —
saffron, vermilion, marigold, gold. Muting them by 16% is not a "tasteful" choice, it is an
unrequested edit, and it flattens exactly the quality that distinguishes the work.

Then: **touch devices have no hover.** Every phone visitor sees only the muted version,
permanently. For a studio whose traffic arrives from Instagram, that is most of the audience.

**Replace with.** Delete every `saturate()` filter on photographic content. Full stop. If a
section needs images to recede, use an overlay tint on a wrapper element — never a filter on the
photograph, and never make the true state depend on hover.

One-line deletions.

---

#### `P-03` — CSS columns destroy the sequence the brief promised — **CRITICAL**

**Problem.** `.depth-gallery { column-count: 3 }`. CSS multi-column flows content *down* each
column before moving right. With 36 photographs, column one holds 1–12, column two 13–24, column
three 25–36. A visitor reading across the top row sees **photographs 1, 13 and 25**.

**Why it matters.** The brief's explicit requirement is *"Arrange gallery order myself"*, and
`portfolio.ts` is built so that array order is display order. **That promise is not being kept**
— array order is the order images are *painted*, not the order they are *read*.

Sequencing is how a photographer builds a story from a wedding: the arrival, the ritual, the
tears, the exit. That structure is currently scrambled. The code comment defending the choice —
*"gaplessness matters, strict order does not"* — is exactly backwards for this client.

**Replace with.** A CSS Grid or JS-balanced column layout that preserves left-to-right reading
order. Better still, abandon uniform masonry for the editorial spread system in `P-05`.

**This is a broken contractual requirement, not a style note.**

---

#### `P-04` — Photographs are styled as UI cards — **CRITICAL**

**Problem.** Every photograph carries `border-radius: 3px`, a two-layer drop shadow
(`0 20px 44px -22px` plus `0 5px 14px -8px`), and a `translateY(-9px)` hover lift. Cards also get
`0 18px 40px -24px` and a `-6px` lift.

**Why it matters.** Rounded corners and drop shadows are the visual grammar of **interface
objects** — buttons, modals, toasts. Applying them to photographs turns a gallery into a
Pinterest board. No printed photography monograph, no gallery wall, no high-end photographer's
site puts a drop shadow under a photograph. Depth is supposed to come from *inside* the frame;
adding it outside says the site does not trust the picture to hold attention on its own.

**Replace with.** `border-radius: 0` and `box-shadow: none` on all photographic content,
everywhere. Photographs sit flat on the ground, like prints on a page. Separation comes from
generous, *uneven* whitespace.

Hover becomes a slow `scale(1.02)` inside a fixed `overflow: hidden` frame — **the image moves,
the frame does not.** That is the standard editorial hover and reads as far more expensive than
a lift.

Two-line change. Transforms the perceived tier of the entire site.

---

#### `P-05` — The gallery shows photographs; it does not present them — **HIGH**

**Problem.** 36 photographs, three equal columns, one uniform gutter, every image at roughly
equal visual weight, top to bottom. No hero image, no pause, no change of scale, no sequence, no
words. It is a contact sheet with shadows.

**Why it matters.** This is the distinction between a site that *displays* work and a site that
*creates an experience around it*, and it is where the price tier is actually decided. A visitor
scrolling 36 equal-weight images makes one judgement — "nice photos" — and leaves. A visitor
taken *through* a wedding makes a different one: "this person can tell a story, and I want mine
told."

**Replace with.** A repeating **editorial spread system**. Five spread types, cycled by data:

| Type | Layout | Use |
|---|---|---|
| **A** | Full bleed — one photograph, 100vw, ~92vh | Opening, and once at the emotional peak |
| **B** | Diptych — two portraits side by side, one dropped ~80px lower | Asymmetry is what makes a grid look art-directed |
| **C** | Inset single — 62% width, offset from centre, surrounded by air | Breathing |
| **D** | Triptych — unequal widths `1.4fr / 1fr / 1fr`, common baseline | Pace |
| **E** | **Caption rest** — no photograph. One line of italic display type and a great deal of whitespace | Silence between movements |

Sequence roughly `A · D · B · C · E · D · B · A · C · E`.

The **E** blocks are what make the whole thing feel authored, and they cost nothing but one
sentence each — *"The mehendi ran until two in the morning."*

**Motion direction.** Reveal by **mask, not fade**:
`clip-path: inset(0 0 100% 0) → inset(0 0 0 0)` over `1100ms cubic-bezier(.22,1,.36,1)`, with
the image inside holding `scale(1.08) → scale(1)` over `1600ms`. The photograph appears to be
**uncovered** rather than to fade up.

Full-bleed **A** spreads get light parallax — the image translating `-8%` across its own frame
across the viewport, no more. Anything stronger detaches from the scroll and reads as a gimmick.

**The largest single upgrade in perceived value after the hero.**

---

#### `P-06` — The watermark is on the thumbnails — **HIGH**

**Problem.** `NANDAN'S PHOTOGRAPHY` is stamped on *every* rendered image at every size —
including 122px mobile gallery tiles, where it degrades to a 6px "NP". On the mobile gallery it
occupies a visible fraction of a tiny picture.

**Why it matters.** The brief does say "watermark everything", and that instruction should be
honoured. But a watermark visible at thumbnail scale reads as anxious rather than protective,
and it is the visual signature of stock-photo preview sites. As `BRIEF.md` already notes, it
protects nothing — screenshots and the network tab are untouched.

**Replace with.** Watermark **only at presentation scale** — lightbox and full-bleed spreads —
where a large image is genuinely worth taking. Suppress below ~480px rendered width. Quieten the
mark itself: current `rgba(255,255,255,.58)` with a text-shadow is loud; take it to `.3` and
drop the shadow.

Then have the conversation `BRIEF.md` recommends: if the client wants real protection, the mark
burns into the file before upload.

**Needs client sign-off**, since it softens a brief instruction.

---

#### `P-07` — The Films section contains no film — **HIGH**

**Problem.** There is no `<video>` element anywhere in the codebase. `/films` shows still frames
with a circular play glyph; clicking through leads to a `videoUrl` that is `null` for all five
films, rendering "Full film coming soon".

**Why it matters.** Wedding film is the higher-margin service, and the entire branch of the site
selling it currently demonstrates nothing. Every card is a promise of content that does not
exist.

**Replace with.**

- **Now** — a muted 6–10 second silent loop on each film card:
  `<video muted loop playsinline preload="none">`, poster frame shown until it enters the
  viewport. A moving frame among still ones is the strongest attention device available.
- **When the films land** — a full-bleed inline player, **not** an external link. Sending a
  visitor to YouTube hands them a recommendation sidebar full of other photographers.

**Blocked on** the five films, still on the client's drive. He needs help uploading them. Build
the player against a placeholder now.

---

### 3.4 Layout, composition and pacing

> The question an art director asks: does every section look *designed*, or are sections merely
> stacked? Here it is unambiguously the latter.

---

#### `L-01` — The home page is the same section eight times — **CRITICAL**

**Problem.** `CategoryBand` renders once per category and there are eight categories. Each is
identical: heading + hairline rule + mono tagline, then a 2- or 3-card grid at a fixed 4:3. Same
padding, same gap, same everything.

Because most categories contain the same collections, the words **"PHOTOGRAPHY", "FILM" and
"CANDID" appear roughly twenty times** on a single page, in caps serif, over the photographs.

**Why it matters.** This is the definition of a CMS render, and the clearest reason the site
reads as template-built. It also creates a labelling problem: the visitor scrolls past twenty
near-identical cards whose labels tell them nothing they want to know. **Nobody chooses a
wedding photographer by picking "Candid" from a menu.**

**Replace with.** Stop rendering the taxonomy. The home page's job is **seduction, not
navigation** — `/work` already does navigation properly. Restructure as roughly six blocks with
genuinely different layouts:

1. Full-bleed hero.
2. A short statement of intent — display type, enormous whitespace, **no image at all**.
3. **Featured story** — one couple, four photographs in an asymmetric spread, their names in
   display serif, one line of narrative. *This is the block that sells.*
4. A **horizontal-scroll strip** of eight to ten single frames pulled across categories — the
   only horizontal moment on the site, and therefore memorable.
5. The **film block** — full-bleed, ink ground, one silent loop, one line.
6. The **closing block** (see `C-01`).

Then a single quiet text link: *"Every category →"*. Cuts ~2,400px of scroll and gains an
authored page.

**Motion direction.** Block 4 is the moment: pin the section and drive the strip on scroll-linked
`translateX` with `ScrollTrigger`-style scrubbing, so vertical scroll becomes horizontal travel.
Roughly 1.2 viewport heights of scroll for the full strip — long enough to register, short enough
not to trap. Disable entirely under reduced motion and below 768px, where it becomes a native
`scroll-snap` strip instead.

**The largest structural change proposed here.**

---

#### `L-02` — Everything is centred — **HIGH**

**Problem.** `.collection-head` and `.story-head` are both `text-align: center` with centred
crumbs. Card labels centred over images. Hero centred. The band headings are the only
left-aligned things on the site, and they read as the odd ones out.

**Why it matters.** Centred text is the safest possible composition and therefore the least
characterful. It creates ragged left edges on both sides, gives the eye no consistent return
point, and makes every page look like the same page. Editorial design is built on a strong left
axis with deliberate departures from it.

**Replace with.** Left-align every page header to a shared axis. Then break that axis **once**
per page, on purpose — a full-bleed image, or a single pull-quote indented to the 40% column.
Rhythm requires an axis to depart from; there currently isn't one.

---

#### `L-03` — Nothing is full-bleed. Ever. — **HIGH**

**Problem.** Every section is inset by `6vw` or `8vw` and capped at `max-width: 1560px`. There is
not one edge-to-edge photograph anywhere in nine routes.

**Why it matters.** Full-bleed is the cheapest, strongest luxury signal in web design — it says
the image is important enough not to need a margin. A site with no full-bleed moment has no
crescendo. The consistent inset also means the site has exactly one rhythm: *inset*. Rhythm
requires at least two.

**Replace with.** Three full-bleed moments per visit, no more: the hero, one image at the peak of
each story gallery, and the closing block. Contrast is what gives them force — they only work
because everything around them is inset.

---

#### `L-04` — `/work` and `/contact` have a dead right half — **MEDIUM**

**Problem.** `.page-intro` is a `16% / 1fr` grid with content in track two and the h1 capped at
`max-width: 900px`. On a 1440px screen the headline ends around x=880 and nothing follows for
560px. On `/contact`, scrolling past the form leaves the entire left column empty for ~400px of
height.

**Why it matters.** This is the difference between negative space and *unused* space. Negative
space is bounded and balanced by something — it has a job. This is an empty grid track, and it
reads as unfinished rather than restrained.

**Replace with.** Either make the emptiness deliberate — headline at 46% width with an enormous
top margin, so the void is clearly composed — or give the right column a job: a single tall
photograph bleeding off the right edge, or the section's metadata set small and high.

On `/contact`, put a full-height photograph in that column. **It is currently the only page on a
photography site with no photograph on it.**

---

#### `L-05` — Vertical rhythm is uniform, so there is no pacing — **MEDIUM**

**Problem.** Section padding lands between 74px and 132px throughout. Page intros are 120–130px
top. Everything breathes at the same rate from top to bottom of every page.

**Replace with.** A four-step spacing scale — `64 / 120 / 200 / 320px` — deployed by **narrative
weight**, not by component:

- The pause before the first photograph of a story: **200–240px** (currently 56px). That pause
  is what makes the first image land.
- The gap after a full-bleed: **320px**.
- Two consecutive images in a spread: **24px**.

Compression and release *is* pacing. Uniform padding is the absence of it.

---

### 3.5 Motion

> The CSS carries three sections headed `MOTION`, `PREMIUM LAYER` and `MOTION PASS`, and defines
> a shared easing vocabulary in `:root`. That intent is real and the discipline is good. What it
> produced is one idea repeated everywhere.

---

#### `M-01` — Everything does the same thing: fade up sixteen pixels — **HIGH**

**Problem.** `.reveal` is `opacity 0 → 1` plus `translateY(16px) → 0` over 550ms. Twenty-six
elements on the home page share it. Headings get a slightly larger variant (22px / 700ms); body
copy a slightly smaller one (14px / 600ms). That is the entire scroll vocabulary of the site.

**Why it matters.** Uniform fade-up is the AOS-library default and the most recognisable
"animations were added to make it look modern" signal on the web. It also treats a photograph and
a breadcrumb as the same kind of object, when the whole argument of the site is that photographs
are different.

**Replace with.** Three distinct behaviours, assigned by content type:

| Content | Behaviour | Spec |
|---|---|---|
| **Photographs** | Mask reveal — **never opacity** | `clip-path` wipe upward `1100ms`, internal `scale(1.08 → 1)` over `1600ms` |
| **Display type** | Line wipe — **never opacity** | Each line in its own `overflow:hidden` wrapper, `translateY(110% → 0)`, `760ms`, `90ms` stagger per line |
| **Utility type** | Fade only — **never movement** | `opacity 0 → 1` over `500ms`. Small elements that move read as jittery |

---

#### `M-02` — Page transitions fight the scroll — **HIGH**

**Problem.** `navigate()` calls `window.scrollTo({ behavior: 'smooth' })`, `html` also has
`scroll-behavior: smooth`, and the page shell is keyed on the route so it unmounts and replays a
500ms `page-enter` fade. Leaving a long gallery therefore runs a ~1s smooth scroll **while** the
new page fades in behind it — two easings on two properties, uncoordinated. The new page is often
fully rendered before the scroll has landed.

**Why it matters.** This is the moment a site most obviously reveals whether it was designed or
assembled, and it is currently the roughest interaction here.

**Replace with.** A properly covered transition:

| Stage | Behaviour |
|---|---|
| **Out** | Ink panel wipes up from the bottom, `520ms`, `cubic-bezier(.7,0,.3,1)` |
| **Under cover** | Scroll jumps to top **instantly** (no smooth behaviour — nobody sees it), route swaps |
| **In** | Panel continues up and off, `620ms`, revealing the new page already in place. First heading starts its line-wipe `180ms` before the panel clears |

Total ~1.14s, and it feels like one gesture instead of three.

**Remove `scroll-behavior: smooth` from `html`.** With a covered transition it is pure
interference.

---

#### `M-03` — The stagger fires in a scrambled order — **MEDIUM**

**Problem.** Gallery items stagger on `--i: index % 12` at 45ms — but because CSS columns place
item 13 at the top of column two, the delay values are distributed *vertically down each column*
rather than across each visual row. The reveal fires in an apparently random pattern instead of
a wave.

**Why it matters.** A stagger's entire purpose is legible sequence. Scrambled, it reads as jitter
— the site looks like it is loading badly rather than revealing deliberately.

**Replace with.** Resolves itself once `P-03` fixes the layout order. Then reduce the stagger to
**three steps maximum** (0 / 80 / 160ms) by visual row. A twelve-step stagger means the last item
waits 540ms after the first — long enough that the visitor has scrolled past it.

---

#### `M-04` — The cursor is the default arrow — **MEDIUM**

**Problem.** No custom cursor anywhere. `.hero-stage` sets `grab`/`grabbing`, which is correct
and is the only cursor thinking on the site.

**Why it matters.** A custom cursor is not decoration on a photography site — it is how a large
image communicates that it is **enterable**. Without it, a full-bleed photograph gives the
pointer nothing to say.

**Replace with.** One cursor, three states, desktop and fine-pointer only:

| State | Appearance |
|---|---|
| Default | 8px filled circle, `mix-blend-mode: difference`, following on a `0.12` lerp so it trails slightly |
| Over a photograph | Expands to 62px, fills to 12% white, shows `VIEW` in 9px mono |
| Over the horizontal strip | Expands, shows `DRAG` |

Hide entirely under `(pointer: coarse)` and `prefers-reduced-motion`.

**Do not add magnetic buttons.** Magnetism on a photography site is a portfolio-of-the-developer
effect, not a portfolio-of-the-photographer one.

---

#### `M-05` — The gold reading-progress bar — **LOW**

**Problem.** A 2px gold gradient bar pinned to the top of the viewport, driven by a rAF-throttled
scroll listener.

**Why it matters.** Reading-progress indicators belong on articles, where a reader is deciding
whether to commit to finishing. On a photography site they contradict the goal — the visitor
should feel unhurried, not measured. It is also the one element on the page in saturated gold,
competing with the photographs for the eye at the very top of the screen.

**Replace with.** Remove it. The `is-scrolled` class the same hook sets is genuinely useful for
the nav — keep that half and delete the bar.

---

#### The motion language, stated once

> **Photographs are *uncovered* by masks and never fade.**
> **Display type *rises from behind its own baseline* and never fades.**
> **Utility type *fades* and never moves.**

| Token | Value | Use |
|---|---|---|
| `--ease-out` | `cubic-bezier(.22, 1, .36, 1)` | Everything arriving |
| `--ease-in-out` | `cubic-bezier(.65, 0, .35, 1)` | Everything moving between two states |
| `--ease-panel` | `cubic-bezier(.7, 0, .3, 1)` | The two panel transitions only |

Durations come from a four-value set — `220 / 520 / 760 / 1100ms` — and **nothing on the site
uses a duration outside it.** Nothing bounces, nothing overshoots, nothing scales up from zero.
The site's slowest motion is always a photograph.

Two of those easing tokens already exist in `:root`. The vocabulary was started; it just was not
finished.

---

### 3.6 Navigation and mobile

> Mobile needs a separate verdict, not a smaller one. This studio's traffic arrives from
> Instagram, which means it arrives on a phone.

---

#### `MB-01` — On a phone, the work is a 196px card floating on beige — **CRITICAL**

**Problem.** At 390×844: the hero frame is **196×280px**, the stage 336px tall, and
`.hero { min-height: auto }` so the hero does not even fill the screen — cream begins partway
down. The wordmark still overlaps the picture. The watermark is stamped across a picture the size
of a postage stamp. Measured against the screen, the photograph occupies about **17% of it**.

**Why it matters.** This is the first impression for the majority of this studio's audience, and
it is the weakest screen on the site. A wedding photographer whose work appears on a phone at
196px wide is competing against Instagram, where the same photograph appears at 390px wide with
no beige around it. **The site loses that comparison badly enough that it is a reason not to
click through from the bio link.**

**Replace with.** Full-bleed, `100dvh`, one photograph, edge to edge. No card, no deck, no gap,
no wordmark. Type overlaid bottom-left on a gradient scrim, at 30px display and 10px mono.
Advance by swipe with the existing gesture code.

This is **not a resize** of the desktop hero — it is the desktop hero done properly, and mobile
is where it matters most.

**The single highest-impact change for this client's actual traffic.**

---

#### `MB-02` — Mobile galleries are 122px thumbnails — **CRITICAL**

**Problem.** `column-count: 3` is preserved all the way down to 390px with a 7px gutter, giving
each photograph roughly **122px of width**. The CSS comment defends it explicitly:
*"Phones keep a real contact-sheet grid — never one photograph at a time."*

**Why it matters.** That comment describes the right rule for a **proofing** gallery, where a
client is picking from images they have already seen. It is the wrong rule for a **portfolio**,
whose job is to make a stranger feel something. At 122px a face is about 20px across. No
expression is legible. No detail of a lehenga is legible. The visitor scrolls a texture, not
photographs.

**Replace with.** Single column, full-bleed width, one photograph at a time, generous vertical
gaps — the mobile equivalent of the editorial spread system. Optionally one diptych row every
fourth position for rhythm.

Yes, it is a longer scroll. A phone scroll is effortless and the alternative is a portfolio
nobody can see. If a proofing view is genuinely wanted later, that is a separate, authenticated
feature.

---

#### `N-01` — The navigation is the template layout, exactly — **HIGH**

**Problem.** Left logo, centred link row, right pill CTA, sticky cream bar with
`backdrop-filter: blur(14px)`, shrinking on scroll. This is the default header of every template
of the last five years. The `ENQUIRE` button with its circular arrow disc is a SaaS component.

**Why it matters.** The nav is on every screen of every page — the most-seen component on the
site, and currently the most generic. It is also opaque cream, which means it **interrupts** a
full-bleed hero rather than floating over it.

**Replace with.** Reduce it to two objects. **Left:** the monogram alone. **Right:** a single
word, `MENU`, in mono. Nothing else. Over the hero it is transparent with white type; past the
hero it fades to ink type on cream, with no shrink and no shadow — invisible when it should be,
present when needed.

`MENU` opens a **full-screen ink overlay at every breakpoint**, not just mobile:

- Four links at 64px display type, left-aligned, staggered in at 70ms
- The studio's contact details small in the bottom-left
- **A photograph occupying the right 42% that crossfades to a frame from whichever category is
  being hovered**

Navigation becomes a moment of photography rather than a list.

**Motion direction.** Overlay panel wipes down `clip-path: inset(0 0 100% 0) → 0` over `620ms`.
Links wipe up from their own baselines, `70ms` apart, starting at `220ms`. The photograph fades
at `900ms` — the last thing to arrive, so it registers as the point of the screen. Closing
reverses at 0.8× duration; **exits should always be faster than entrances.**

---

#### `N-02` — The logo is clip art — **MEDIUM** (visually) / **HIGH** (as a perf fix)

**Problem.** A cartoon camera glyph inside a gold circle, shipped as a **454,863-byte PNG at
1080×1080** and rendered at 38px — in the nav and again in the footer, on every page.

**Why it matters.** Two failures at once.

- **Visually** — an illustrated camera icon is the most literal possible mark for a photographer,
  and literalness is the enemy of premium. No high-end studio's logo depicts a camera.
- **Technically** — it is a 1-megapixel image doing the job of a 38px one, and it is **2.5× the
  size of the entire JavaScript bundle.**

**Replace with.** A typographic monogram — **NP** in the new display serif, custom-spaced,
delivered as inline SVG at roughly 2 KB. Scales perfectly, inherits `currentColor` so it works on
ink and on cream without a second asset, costs nothing.

If the client is attached to a mark, an abstracted aperture or a single hairline frame rectangle
would both work. A drawn camera will not.

**Ship the SVG regardless of the design conversation.**

---

#### `N-03` — The footer belongs to a different website — **MEDIUM**

**Problem.** Three columns — brand, link list, contact list — on `#26211a` dark brown, a colour
that appears nowhere else in the palette, with a copyright row beneath. A standard SaaS footer
wearing a warm tint.

**Replace with.** Fold the footer into the closing block (`C-01`) so the page ends on a
photograph and an invitation rather than a sitemap. What survives: **one line** — monogram ·
Instagram · WhatsApp · email · city — in 12px mono, on the same ink ground as the closing image,
separated by a hairline. Everything else is already in the nav overlay and does not need
repeating.

---

### 3.7 Performance

> The good news: this is a genuinely light site — 181 KB of JS, 40 KB of CSS, 355 DOM nodes on
> home, no animation library, no router dependency. The image pipeline is where it all goes.

---

#### `PF-01` — No responsive images at all — **CRITICAL**

**Problem.** Verified on the live DOM: **zero `srcset`, zero `sizes`.** Every `<img>` requests a
fixed `?w=1400` JPEG.

- On desktop those render at **354px** — about a quarter of the delivered pixel width.
- In the mobile gallery they render at **~122px**, where a 1400px file is roughly **130× more
  pixel data than the screen can use**.

A 36-image story therefore ships something on the order of **8–12 MB to a phone** to display
images no larger than a thumbnail.

**Why it matters.** Indian mobile networks and mid-range Android are the actual delivery context.
Every second of load is measurable drop-off, and this is the entire reason the site would feel
slow despite being architecturally light.

**Replace with.** Pexels already accepts a `w` parameter, so `srcset` costs one template literal
today and the same helper serves the real finals tomorrow:

- `srcset` at **480 / 768 / 1200 / 1600 / 2400**
- `sizes` matched per layout context — full-bleed `100vw`, spread
  `(max-width: 768px) 100vw, 50vw`, and so on
- Serve **AVIF with a WebP fallback**
- Add explicit `width` and `height` (which `P-01` requires anyway) to eliminate layout shift

Expect a **70–85% reduction in image bytes on mobile** with no visible quality change.

**Highest performance return available, and it is a contained change to one `Shot` component.**

---

#### `PF-02` — 445 KB of logo on every page, twice — **HIGH**

**Problem.** `public/assets/images/image.png` — 454,863 bytes, 1080×1080 — rendered at 38px in
both the nav and the footer.

**Why it matters.** Very likely the largest single asset on first paint, in the critical path
because the nav renders immediately, and 2.5× the JS bundle. **For 38 pixels.**

**Replace with.** Inline SVG monogram (~2 KB), per `N-02`. Roughly a **99.5% reduction** on the
site's heaviest first-paint asset, and it fixes the design problem in the same commit.

---

#### `PF-03` — A full-screen blended grain layer on every frame — **MEDIUM**

**Problem.** `body::after` is a fixed full-viewport SVG turbulence texture at `z-index: 45` with
`mix-blend-mode: multiply`, at `0.04` opacity.

**Why it matters.** A fixed, blended, full-screen layer forces the compositor to re-blend the
entire viewport on every scroll frame. On mid-range Android — the device class that matters here
— this is one of the more expensive things a page can do, and it buys an effect at 4% opacity
that essentially nobody will consciously perceive.

The **intent is right**; analogue grain is a good idea for this brand. The delivery is wrong.

**Replace with.** Drop `mix-blend-mode` and use a plain low-opacity overlay, or better, apply
grain only inside `.shot` containers where it reads as *film* rather than as *screen dirt*. Gate
behind `@media (min-width: 1024px)` and `(prefers-reduced-motion: no-preference)`.

---

#### `PF-04` — Tailwind ships but is unused — **LOW**

**Problem.** `tailwind.config.js` has an empty `theme.extend`, the three `@tailwind` directives
are present, and essentially all styling is hand-written CSS. Tailwind, PostCSS and Autoprefixer
are carried as dependencies for preflight alone.

**Replace with.** Either commit to it — move the design tokens into `theme.extend` so the type
scale, spacing scale and palette are **enforced** rather than remembered — or remove it and keep
the ~30 lines of reset actually in use.

The current state is the worst of both: the build cost with none of the constraint. Given this
plan proposes a token system, **committing is the better call.**

---

### 3.8 Positioning and conversion

> **The test:** remove the name from every page. Is there anything left that identifies this
> studio? Currently — no. The palette is generic warm-cream, the serif is the default wedding
> serif, the copy is well-written but interchangeable, and there is not one visual device that
> could not sit on any competitor's site.

---

#### `B-01` — "Warm and traditional" is stated but never designed — **HIGH**

**Problem.** The brief's answer for feeling was *warm and traditional*, and the response was
cream, gold and a serif — the most literal possible translation, landing on the exact palette
every wedding template already uses.

Meanwhile the actual photographs are saturated, dense, high-contrast Indian celebration:
marigold, vermilion, gold thread, night colour. **The site's palette is quieter than the work it
contains**, which inverts the correct relationship.

**Replace with.** Reinterpret "traditional" as **printed** rather than *beige* — the vernacular
of a good wedding album or an Indian art monograph.

| Token | Value | Use |
|---|---|---|
| `--ink` | `#12100D` | All photographic surfaces |
| `--paper` | `#F2EEE6` | All editorial / text surfaces |
| `--sindoor` | `#8C1D18` | The accent. Used **almost never** |

Gold is the default luxury signal and reads as costume. A deep sindoor red drawn from the work
itself reads as chosen. Use it on exactly two things: **the active nav state and the enquiry
CTA.**

Texture: the grain, properly implemented (`PF-03`), plus a hairline rule system at `0.5px` — the
visual language of a printed plate.

---

#### `B-02` — Zero trust signals anywhere on the site — **HIGH**

**Problem.** No testimonials render (the Supabase table exists; nothing is displayed). No
weddings-shot count. No venue or city list. No publication features. No years-active statement
beyond "EST 2015" in a wordmark that is being deleted. A visitor deciding between three
photographers has **nothing here to weigh**.

**Why it matters.** A wedding is the largest discretionary purchase most Indian families make,
booked from a shortlist, usually with family involved. Social proof is not optional at that price
point — it is the mechanism by which the decision actually gets made. Its complete absence is the
site's **biggest commercial gap**.

**Replace with.** Three understated devices, none of them badge-like:

1. **One testimonial per major page**, set as a display-serif pull-quote at 28px with the
   couple's names and city small beneath. Never a carousel, never three-across in cards. One
   quote, treated like a passage from a book.
2. **A single quiet line in the closing block:** *"180 weddings · 14 cities · since 2015"* in
   mono. Specific numbers, no icons, no counters animating up.
3. **A venue list in the footer line** if the client has recognisable ones — the strongest
   possible signal in this market, and it costs one line.

**Blocked on** written testimonials, which the client will collect. **Build the component now**
so it is not a launch blocker, and give him a three-question template to send past couples.

---

#### `C-01` — Every page ends on a sitemap — **HIGH**

**Problem.** The last thing on every page is the three-column footer. The home page's closing
gesture before it is `.home-note`: an italic line, a hairline rule, a text link. Galleries end
with a "Back to…" link.

**Why it matters.** The end of a gallery is the **highest-intent moment in the entire visit** —
the visitor has just looked at 36 photographs of somebody else's wedding and is imagining their
own. Meeting that moment with a link list wastes it completely.

**Replace with.** A single closing block on **every** page:

- Full-bleed photograph, ink scrim, roughly `70vh`
- Display serif, left-aligned, large: *"Tell us about your day."*
- One mono line beneath: *"Usually a same-day reply · WhatsApp, phone or email"*
- Three plain text links — WhatsApp / Instagram / email — at 14px mono. **No boxes, no icons, no
  button.**
- Then the single-line footer

On a gallery, use **the last photograph of that story** as the ground. The visitor's final
impression is the work, and the invitation sits inside it.

**Motion direction.** The photograph mask-reveals as it enters, then holds a very slow
`scale(1 → 1.04)` across the remaining scroll — the only continuously moving element on the site,
so it reads as a held breath at the end.

**Best conversion-per-hour change in this document.**

---

#### `C-02` — Eight required fields as the first ask — **HIGH**

**Problem.** `/contact` opens with a wall of eight fields, seven required, including **budget
range**. There is no photograph on the page — the only page on a photography site with no
photography on it.

**Why it matters.** Every required field costs completions, and a required budget question at
first contact is the most expensive one — many couples genuinely do not know, and the ones who do
are often reluctant to anchor themselves.

The brief does require all five data points, and it is right to: he needs them to quote. But
requiring them **all at once, up front** is a choice, and a costly one. The `BRIEF.md` note is
also correct that the bands are guesses and need confirming against real packages.

**Replace with.** Two steps on one page, no route change.

- **Step one** — three fields: *name, phone, event date*. Submit reads **"Check our
  availability"**. Low commitment, and the date is the field he actually needs first.
- **Step two** — revealed after step one with a mask wipe: *city, event type, budget, referral,
  message*. Header reads *"A few more things, so we can send you the right collection."*
  Budget keeps "Not sure yet" as a first-class option and **stays optional** — a lead with no
  budget is worth infinitely more than no lead.

Set the whole thing against a full-height photograph in the left column, and open the page with
the closing block's warmth rather than a form.

---

#### `C-03` — Enquiries are handed to WhatsApp and never recorded — **HIGH**

**Problem.** `EnquiryForm` composes a message and calls `window.open(wa.me…)`. **Nothing is
persisted.** The fallback links added after the earlier audit are good work — they correctly
handle Instagram's in-app browser swallowing the popup — but if the visitor abandons at the
handoff, **the lead is simply gone**, with no record it ever existed.

**Why it matters.** Instagram in-app is a major share of this studio's traffic and the least
reliable handoff environment there is. Lost leads are invisible: nobody ever finds out how many
there were.

**Replace with.** `POST` to a Supabase table **first**, then hand off to WhatsApp. The
infrastructure is already provisioned and the write policy already restricted. The client gets a
durable enquiry list, a reply-rate he can actually see, and — the commercially important part —
**a follow-up list**. Add a hidden `source` field so Instagram-driven traffic is measurable.

Small change; directly protects revenue.

---

#### `C-04` — WhatsApp link previews show a camera icon — **MEDIUM** now, **CRITICAL** at launch

**Problem.** `og:image` points at `apple-touch-icon.png` at 180×180, and `twitter:card` is
`summary` rather than `summary_large_image`. `index.html` carries a TODO acknowledging this.

**Why it matters.** WhatsApp is this studio's primary channel — the brief says so explicitly.
Every time a couple forwards the link to their family, the preview shows a small cartoon camera
instead of a photograph. **That forward is the studio's single most valuable distribution moment
and it is currently wasted.**

**Replace with.** A 1200×630 crop of the strongest photograph, monogram bottom-right, plus
`twitter:card = summary_large_image`. Ideally per-route: a story's OG image is that couple's best
frame. Keep `og:image` absolute — relative paths are silently dropped by every scraper, which was
the earlier fault.

**Blocked on** the client's finals. Ship with the strongest placeholder now rather than leaving
the icon in place.

---

#### `C-05` — "India" is not a location — **MEDIUM** to build, **CRITICAL** to ask

**Problem.** `portfolioConfig.location = 'India'`, rendered in the footer and as "Based in India"
on the contact page.

**Why it matters.** Wedding photography is searched locally — *"wedding photographer in [city]"*
is essentially the whole category. With no city, the site is invisible for every one of those
searches, and there is no `LocalBusiness` schema either. It also reads slightly evasively to a
human: a studio that will not say where it is.

**Replace with.** City plus service radius, in the hero mono line, the footer, the contact page,
and a `LocalBusiness` JSON-LD block.

`BRIEF.md` is right to have refused to invent one. **Ask the client. This is the highest-value
unblocking question on the whole list.**

---

#### `A-01` — The About page has a dashed placeholder box on it — **MEDIUM**, rising to **CRITICAL** before launch

**Problem.** A dashed-border grey rectangle reading `STUDIO PORTRAIT / PHOTOGRAPH TO BE SUPPLIED`
occupies half the About page. Beside it, a headline in DM Sans at 50px that could belong to any
B2B company. The copy is a well-written draft — but it is the agency's words, not the
photographer's.

**Why it matters.** About is where a couple decides whether they want this person in the room
during the most private hours of their life. It is a **trust page**, and a visible placeholder
communicates the opposite. Photographers are also, notoriously, the hardest people to
photograph — the absence of a portrait is itself read as a signal.

**Replace with.** An editorial spread: a full-bleed **working shot of the team mid-wedding** —
not a posed studio portrait — with the copy in two staggered columns at 17px, and one pull-quote
in display italic.

If no portrait exists yet, **a photograph of his hands, or his camera on a table at a venue**, is
infinitely better than a dashed box and is available today.

The copy needs a 20-minute call and should be his sentences. One specific, unglamorous detail
about how he works is worth more than three paragraphs of warmth.

**Do not ship a dashed box.**

---

## 4. Template vs. keep

### Reads as template — replace

| Current | Replace with | ID |
|---|---|---|
| Coverflow hero deck | Full-bleed single frame | `H-02` |
| DM Sans at 82px | Editorial display serif | `T-01` |
| Playfair Display italic | A serif with an actual point of view | `T-02` |
| Eight identical category bands | Six authored blocks | `L-01` |
| Drop-shadowed rounded photo cards | Flat prints on the ground | `P-04` |
| Uniform 3-column masonry | Five-type editorial spread system | `P-05` |
| Logo / centre links / pill CTA nav | Monogram + MENU + full-screen overlay | `N-01` |
| Cartoon camera logo | Typographic monogram, inline SVG | `N-02` |
| Three-column SaaS footer | One line under the closing block | `N-03` |
| Fade-up-16px on everything | Three behaviours by content type | `M-01` |
| Gold reading-progress bar | Delete | `M-05` |
| Bordered contact "channel" rows | Plain text links | `C-01` |
| Centred page headers | One left axis, broken once per page | `L-02` |
| Everything inset by 6–8vw | Three full-bleed moments per visit | `L-03` |

### Already good — do not touch

- **The information architecture.** Four levels, clean URLs, name slugs, skipped single-choice
  levels. Genuinely well-judged and rare.
- **The accessibility work.** `focus-visible` on every control, skip link, lightbox focus trap
  with return, `aria-live` slide announcements, thorough `prefers-reduced-motion` coverage.
- **The contrast remediation.** The 2.86:1 → 4.87:1 fix and the 9px → 11px label fix were correct
  and correctly reasoned.
- **The `Shot` load-settle.** Handling the cached-image case via `imgRef.complete`, and the
  `onError` guard against stranding at opacity 0, are the marks of someone who has been burned
  before.
- **DM Mono as the utility face.** The best typographic decision on the site. Keep it exactly as
  it is.
- **The gesture engineering** in the hero — wrap-around offset maths, pointer damping at
  `^0.86 × 0.62`, the 380ms lock, writing drag to a CSS custom property instead of React state.
  **Retarget it; do not rewrite it.**
- **The enquiry fallback links** for blocked popups in Instagram's in-app browser. Real-world
  thinking.
- **Per-route titles and descriptions**, and the not-found resolution that mirrors `Work()`'s own
  logic.
- **`BRIEF.md` itself** — and specifically its refusal to invent a city or fabricate testimonials.
  That judgement is worth more than most of the code.

---

## 5. The four moments worth engineering — and nothing beyond them

Memorability comes from a small number of executed moments, not from many effects. Four, in order
of return:

1. **The curtain.** First visit only. Ink ground holds until the hero photograph has decoded, then
   splits and lifts to reveal it already in place. **The loading state *is* the entrance.**
2. **The horizontal strip.** One pinned section on the home page where vertical scroll becomes
   horizontal travel across ten frames. The only direction change on the site, and therefore the
   thing people describe to someone else.
3. **The menu that shows photographs.** Hovering "Wedding" in the nav overlay crossfades a
   full-height frame beside the links. Navigation becomes portfolio.
4. **The closing hold.** Every page ends on a full-bleed photograph very slowly scaling under the
   invitation. The visitor's last impression is the work, and the ask sits inside it.

---

## 6. Token spec

Concrete values for Phase 2. Put these in `theme.extend` (`PF-04`), not in comments.

```
COLOUR
  --ink            #12100D    photographic surfaces, overlays, closing block
  --paper          #F2EEE6    editorial and text surfaces
  --paper-sunk     #E8E3D9    recessed / pending states
  --ink-soft       #4A4640    body copy on paper
  --ink-mute       #6E695F    utility type on paper  (verify ≥4.5:1)
  --sindoor        #8C1D18    accent — active nav state and enquiry CTA ONLY
  --rule           rgba(18,16,13,.14)

TYPE
  display          [Canela | Reckless | Instrument Serif | Newsreader]
  body / ui        DM Sans          (demoted from display)
  utility          DM Mono          (unchanged)

  scale (1.25)     12 · 14 · 16 · 20 · 25 · 31 · 39 · 49 · 61 · 76 · 95
  utility floor    12px
  display per page max 2 steps
  display italic   letter-spacing: 0 → +.005em   NEVER inherit negative tracking
  body measure     62ch @ 16–17px, line-height 1.65

SPACE (narrative weight, not component)
  --s-tight        24px    two images inside one spread
  --s-base         64px
  --s-section      120px
  --s-pause        200px   before the first photograph of a story
  --s-breath       320px   after a full-bleed

MOTION
  --ease-out       cubic-bezier(.22, 1, .36, 1)     arriving
  --ease-in-out    cubic-bezier(.65, 0, .35, 1)     between states
  --ease-panel     cubic-bezier(.7, 0, .3, 1)       panel transitions only
  durations        220 · 520 · 760 · 1100ms         nothing outside this set
  hero crossfade   1400ms cubic-bezier(.4, 0, .2, 1)    (deliberate exception)

PHOTOGRAPHY
  border-radius    0
  box-shadow       none
  filter           none          no saturate(), ever
  hover            scale(1.02) inside a fixed overflow:hidden frame
  reveal           clip-path mask, never opacity
  srcset           480 / 768 / 1200 / 1600 / 2400
```

---

## 7. Scores

Judged against internationally recognised photographer and creative-studio portfolios — **not**
against the average Indian wedding photography website. Against that benchmark it would score
considerably higher, and that is not the standard being asked for.

| Dimension | Now | Achievable |
|---|---:|---:|
| Visual design | 48 | 93 |
| UI quality | 58 | 92 |
| UX quality | 62 | 91 |
| Typography | 38 | 94 |
| Art direction | **26** | 92 |
| Photography presentation | **30** | 95 |
| Animation | 34 | 90 |
| Interaction design | 40 | 89 |
| Brand perception | **30** | 90 |
| Mobile experience | 32 | 93 |
| Performance | 42 | 90 |
| Conversion | 40 | 88 |
| Premium / luxury feel | **31** | 93 |
| **Overall** | **41** | **92** |

### What separates 41 from 92

Not effort, and not engineering skill — both are already present at a level well above the score.

The gap is that **no choice was ever made.** Every visual decision on this site is the option you
land on when you do not decide: the default sans, the default wedding serif, the default
carousel, the default masonry, the default card, the default footer.

Reaching 92 does not require more code. It requires roughly **eleven decisions** — one display
face, one ground colour, one accent, one grid system, one motion vocabulary, one navigation
concept, one closing block, one image pipeline, one hero, one mobile strategy, one logo — held
consistently.

**Consistency of a chosen thing is what reads as art direction. That is the entire difference.**

---

## 8. Roadmap

Ordered so each phase ships on its own and each visibly raises the tier.
**Phase 1 alone moves the site from 41 to roughly 68.**

### Phase 1 — Must fix

*Mostly deletions and one-line changes. Largest return per hour in the document.*

- [ ] Delete the hero wordmark and its `-46px` margin — stops the overlap, removes the duplicate name `H-01`
- [ ] Replace coverflow with a full-bleed crossfade hero, `100dvh`, desktop **and** mobile. Retarget the existing gesture code `H-02` `MB-01`
- [ ] Delete every `saturate()` filter on photographic content `P-02`
- [ ] Remove all `border-radius` and `box-shadow` from photographs and cards `P-04`
- [ ] Swap the display face off DM Sans; set the italic at zero tracking `T-01` `T-02`
- [ ] Replace `column-count` with an order-preserving grid `P-03`
- [ ] Mobile galleries → single full-width column `MB-02`
- [ ] Add `srcset` / `sizes` / `width` / `height` to `Shot` `PF-01` `P-01`
- [ ] Replace the 445 KB PNG logo with an inline SVG monogram `N-02` `PF-02`
- [ ] Persist enquiries to Supabase **before** the WhatsApp handoff `C-03`
- [ ] **Ask the client three questions** — see §9

### Phase 2 — Structure

*Where the site stops being a template. The real design work.*

- [ ] Rebuild the home page as six authored blocks instead of eight identical bands `L-01`
- [ ] Build the five-type editorial spread system, including caption-rest blocks `P-05`
- [ ] Ship the closing block on every page, replacing the footer `C-01` `N-03`
- [ ] Rebuild navigation as monogram + MENU + full-screen photographic overlay `N-01`
- [ ] Establish the token system (§6) in `theme.extend` `T-03` `L-05` `B-01` `PF-04`
- [ ] Left-align every page header to one axis; add the three full-bleed moments `L-02` `L-03`
- [ ] Split the enquiry form into two steps; put a photograph on `/contact` `C-02` `L-04`
- [ ] Build the testimonial component against placeholder content `B-02`
- [ ] Rebuild About as an editorial spread; remove the dashed placeholder `A-01`

### Phase 3 — Motion

*Only once the structure is right. Motion on a weak layout amplifies the weakness.*

- [ ] Replace uniform fade-up with the three content-typed behaviours `M-01`
- [ ] Build the covered page transition; remove `scroll-behavior: smooth` from `html` `M-02`
- [ ] Build the curtain entrance, gated to first visit, doubling as the hero preloader `H-05`
- [ ] Build the pinned horizontal strip, with a `scroll-snap` fallback below 768px `L-01`
- [ ] Add the custom cursor — fine-pointer only, three states, no magnetism `M-04`
- [ ] Add silent looping video to film cards `P-07`
- [ ] Reduce the gallery stagger to three steps by visual row `M-03`
- [ ] Re-verify every reduced-motion path — current coverage is thorough and none of it should be lost

### Phase 4 — The last five per cent

*Invisible individually. Collectively the difference between very good and exceptional.*

- [ ] Per-route OG images at 1200×630 from real photographs, plus `summary_large_image` `C-04`
- [ ] Self-host the fonts as woff2; preload the two above-the-fold faces `T-05`
- [ ] Fix the grain — drop `mix-blend-mode`, scope to image containers, gate above 1024px `PF-03`
- [ ] Delete the reading-progress bar, keeping the `is-scrolled` hook `M-05`
- [ ] Watermark only at presentation scale, reduced opacity, suppressed below 480px `P-06`
- [ ] Fix the landmark structure — `nav` and `footer` currently sit inside `<main>`
- [ ] Resolve the `/films` duplication with `/work/:category/:film-collection` — two URLs, one gallery. Already flagged in `BRIEF.md`, still open
- [ ] Add `LocalBusiness` JSON-LD once the city exists `C-05`
- [ ] Write real alt text with the finals — 870 photographs currently share 14 strings, and wedding alt text is served on maternity and baby-shower galleries
- [ ] Build the studio login — add, delete, rearrange. In the signed brief, schema ready, no UI yet, and the site still reads from the static config
- [ ] Apply `20260824150000_restrict_portfolio_writes.sql` before the database is used for anything real — the `anon` key ships in the public bundle

---

## 9. Blocked on the client

These gate real work. Ask before Phase 1 finishes.

| # | Question | Blocks |
|---|---|---|
| 1 | **City and service radius.** "India" is not a location. | `H-04` `C-05` — hero copy, footer, contact, all local SEO |
| 2 | **A photograph of himself or the team working.** A working shot beats a studio portrait. | `A-01` — the About page currently ships a dashed placeholder |
| 3 | **Is the "Powered by Invitocraft" footer credit contractual?** | `N-03` — the footer is being replaced |
| 4 | **The five films**, still on his drive. He needs help uploading. | `P-07` — the entire Films branch demonstrates nothing |
| 5 | **~60 finals per category**, sorted. Current images are Pexels placeholders. | `P-01` `PF-01` — real dimensions and alt text |
| 6 | **Testimonials.** He has none written yet. Send a three-question template. | `B-02` — the biggest commercial gap |
| 7 | **Confirm the budget bands** against his real packages. Current ₹1L bands are a guess. | `C-02` |
| 8 | **Confirm the final category list.** Baby shower and Candid are on the site but not in the signed brief. | Home page restructure `L-01` |
| 9 | **Watermark softening** — presentation scale only. Softens a brief instruction, so needs sign-off. | `P-06` |
| 10 | **Two-minute call on the reference site.** He named Vivek Krishnan Photography with no reasons. Worth knowing *what* he likes before more design work. | Everything |

---

## 10. Audit basis

Full read of `App.tsx` (1,064 lines), `index.css` (654 lines), `portfolio.ts`, `index.html`,
build config and `BRIEF.md`. Site rendered from the dev server and inspected at 1440×900 and
390×844, with DOM measurements taken live. Nine routes covered, including the lightbox, mobile
menu, film pending states and the not-found page.

**No files were modified.**
