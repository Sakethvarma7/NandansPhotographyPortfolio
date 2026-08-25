# Brief → build status

Source: *Photographer Portfolio Brief — Responses.xlsx*, submitted by
nandansphotography25@gmail.com. One response row.

---

## Site structure

Modelled on vivekkrishnan.com, the reference the client named.

```
/                                     home — slideshow, then every category in order
/work                                 all categories
/work/:category                       Photography | Film | Candid
/work/:category/:collection           the couples
/work/:category/:collection/:story    the gallery (30-60 photographs)
/films                                categories that have films
/films/:category                      the films in that category
/about        /contact                separate pages
```

Category order in `portfolio.ts` **is** the display order, on the home page
and on `/work`. Rearranging that array rearranges the site.

---

## Built to the brief

| Brief answer | Where it lives |
|---|---|
| Site under **NandansPhotography.com** | `portfolioConfig.domain` |
| Categories: Wedding, Pre-wedding, Engagement, Haldi / Mehendi, Maternity, Portrait, Birthday / Family, Baby shower | `portfolio.ts` → `categories` |
| **A separate page for each category** | `/work/:category` |
| **Both** — a grid *plus* featured stories | Collection cards, then the couple grid |
| Stories titled with **couple names** | `Story.name` |
| **Candid** alongside Photography and Film | Wedding, Pre-wedding, Engagement, Haldi, Birthday |
| 30-60 photographs per story | 36 per photo story, 30 stills per film |
| **No pricing at all — enquiry only** | No pricing anywhere; contact page is enquiry-first |
| **No blog** | Not built |
| Visitors see **a slideshow** first | `Home` carousel |
| Feeling: **warm & traditional** | Existing cream/gold palette, Playfair + DM Sans |
| About = **a team, not listed individually** | `About` — no names, no individual bios |
| **Watermark everything** | `Shot` component overlays `portfolioConfig.watermark.text` |
| **Disable right-click and download** | `useImageProtection` + `user-select`/`user-drag` off |
| **Arrange gallery order myself** | Array order in `portfolio.ts` *is* display order |
| **5 featured films**, public, own thumbnails | `portfolioConfig.films` — 5 slots |
| Enquiry captures: event date, city, type of event, budget range, how they found you | `EnquiryForm` — all five, all required |
| He lives on **WhatsApp / phone / Instagram DM** | Contact page leads with those three, then email |
| **No** booked-dates calendar | Not built |
| **No** Instagram feed embed | Not built (footer social block removed too) |
| Login can **add, delete, rearrange** | Schema supports it; see *Not built yet* below |

---

## Waiting on the client

Nothing below is fabricated in the code — each is either `null` or an obvious
placeholder, so nothing fake can ship by accident.

1. ~~Phone / WhatsApp number~~ — **supplied**: `+91 93475 22502`, one number for
   both. The enquiry form now hands the message to WhatsApp rather than email.
2. ~~Instagram handle~~ — **supplied**: `@nandansphotography`. Linked from the
   contact page and the footer. Still no feed embed, per the brief.
3. **~60 final images per category** — he is sending them sorted by category.
   Current images are Pexels placeholders.
4. **5 films + a chosen thumbnail frame each** — currently on his drive only.
   He needs help uploading. Cards render "Awaiting upload" until `videoUrl` is set.
5. **A hero clip cut from one of his films** — `portfolioConfig.heroVideo` is `null`.
   Cannot be cut until the films arrive.
6. **About page facts** — he wants us to write it from what he tells us. Current
   copy is a reasonable draft, not his words.
7. **A photograph of himself** — `About` shows a dashed placeholder box.
8. **Testimonials** — he has none written yet and will collect some. The
   `portfolio_testimonials` table exists; nothing renders yet.

---

## Answers that need a follow-up

- **"Who is your ideal client?" → "Weddings"** — he answered with a service, not a
  client. Worth asking again: budget tier, region, and whether he wants
  destination work. It changes the copy and the enquiry budget bands.
- **"Three photographer websites you like" → one name, no reasons** — "Vivek
  Krishnan Photography", with nothing about *what* he likes. Worth a two-minute
  call before any more design work.
- **FAQ page → "Not sure"** — not built. Since there is no pricing on the site, an
  FAQ is usually where the "what does it cost / how do we book" pressure goes.
  Recommend building one.
- **Budget ranges** are a guess (₹1L bands). Confirm against his real packages.
- **"Anything else I should know?"** was left blank.
- **Baby shower and Candid** are on the site but are *not* in the signed brief —
  they were added on later instruction. The brief's category list was "Wedding,
  Pre-wedding, Engagement, Haldi / Mehendi, Maternity, Portrait, Birthday /
  Family". Confirm the final list with the client before launch.

---

## Not built yet — the studio login

The brief asks for a login that can **add, delete and rearrange**, for Nandan plus
**one or two team members**. The Supabase schema in `supabase/migrations/` covers
this (`display_order` on categories, items and images), but **no admin UI exists
and the site does not read from Supabase yet** — everything renders from
`src/data/portfolio.ts`.

`portfolio.ts` is shaped to mirror the schema, so swapping the static config for a
Supabase query is a contained change when we build it.

### Security fix already applied

The original migration granted `anon` INSERT / UPDATE / DELETE on every table. The
anon key ships in the public JS bundle, so any visitor could have wiped the
portfolio with one request. `20260824150000_restrict_portfolio_writes.sql` drops
those policies and restricts writes to `authenticated`. **Apply it before the
database is used for anything real.**

### One caveat on watermarking

The in-page watermark and the right-click block are deterrents, not protection —
screenshots and the network tab still work. If the client wants photographs that
stay watermarked once they leave the site, the mark has to be burned into the
files before upload.


---

## UI audit — carried out, and what it left behind

A six-lens audit ran against the live site. The content/IA lens completed with 21
findings before the run was interrupted; those were implemented. **The other five
lenses (typography, colour/a11y, layout, interaction, performance) did not finish**
— worth re-running if you want that coverage.

### Fixed

- **Per-route `<title>` and description.** Every one of the nine routes previously
  shipped the same title, so every bookmark, history entry and shared link looked
  identical. `useDocumentMeta` now sets both per page.
- **Open Graph previews were broken on WhatsApp** — the client's primary channel.
  `og:image` was a relative path, which every scraper silently ignores. Now
  absolute, with `og:url`, `og:site_name`, dimensions and a canonical link.
- **"celebrating Photography"** — the `<h1>` on 15 pages was ungrammatical and
  lowercase. Now derived from the collection's `kind`: "Wedding *photography*",
  "Wedding *films*", "Wedding, *unposed*".
- **Internal status language shipped to clients.** "Awaiting upload" appeared on
  every film card and story. Now "Coming soon" / "Full film coming soon".
- **Story URLs were `story-one`, `film-one`, `candid-one`** and repeated in every
  category. Now name slugs: `/work/wedding/photography/aditya-meghna`.
- **A not-found state.** `/pricing`, `/blog`, `/work/bogus` all rendered a parent
  page behind a 200, making broken links look like working ones. All four
  unresolved-segment cases now render NotFound, and the title matches the body.
- **Two content-free clicks removed.** Maternity, Portrait and Baby shower each
  have one collection, so the category page held a single card leading to another
  single card. That level is now skipped.
- **Contrast.** `#8b918a` measured **2.86:1** on the cream ground — well below the
  4.5:1 AA floor — and was used for eyebrows, breadcrumbs, row numbers, back links
  and the About placeholder. Now `#646b62` (**4.87:1**). Enquiry-form labels were
  9px at that same failing colour, the least readable text on the site; now 11px
  at `#5f665e` (**5.25:1**).
- **The enquiry form could report success while failing.** It called
  `window.open(wa.me…)` then set the success state unconditionally — popup
  blockers and Instagram's in-app browser (where much of this client's traffic
  comes from) would swallow it silently. It now shows working WhatsApp and email
  links as a fallback.
- **Film durations** were stored for all five films and never rendered anywhere.
  Now shown on the film cards.
- **Breadcrumb separator** was `/`, which collided with the "Haldi / Mehendi"
  category label and made one crumb look like two. Now `›`.
- **PageIntro printed its label twice** on every page.

### Raised but NOT done — needs your call

- **Location is the bare string `India`.** The audit proposed inventing a city.
  I did not: fabricating a place of business for a real studio is the kind of
  detail a client notices. Ask Nandan for his city and service area.
- **870 photographs share 14 alt strings**, and wedding-specific alt text is
  served on the maternity, portrait and baby-shower galleries. This cannot be
  fixed properly until the real finals arrive with their own alt text.
- **`/films` duplicates `/work/:category/:film-collection`** — two paths to the
  same galleries. The audit flagged the branch as a dead end. Consolidating is a
  structural decision, not a bug fix.
- **"Powered by Invitocraft"** in the footer — confirm whether that credit is
  contractual before launch.
- **Home page shows the same photograph on two cards**, one pair in adjacent
  bands, because covers are derived arithmetically from a 14-image pool. Resolves
  itself when real images land.
