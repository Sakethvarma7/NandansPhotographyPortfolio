import { portfolioConfig, type WorkCategory } from '@/data/portfolio';

/*
 * The search index.
 *
 * Built once from the same config the site renders, so it can never drift out
 * of step with what is actually on the pages.
 *
 * The aliases matter more than the ranking here. People do not search for
 * "Haldi / Mehendi" — they type "mehndi", "mehandi" or "henna", and a wedding
 * client typing the spelling they grew up with should not get nothing back.
 */

export type Hit = {
  id: string;
  kind: 'category' | 'collection' | 'story' | 'page';
  title: string;
  detail: string;
  path: string;
  /** Everything matchable, already lowercased. */
  terms: string;
};

/* Spellings and near-words that should reach the same place. */
const ALIASES: Record<string, string[]> = {
  wedding: ['shaadi', 'shadi', 'vivah', 'kalyanam', 'marriage', 'muhurtham', 'wedding day', 'ceremony', 'reception'],
  'pre-wedding': ['prewedding', 'pre wedding', 'save the date', 'couple shoot', 'pre shoot'],
  engagement: ['ring ceremony', 'roka', 'nischayam', 'sagai', 'betrothal', 'proposal'],
  'haldi-mehendi': ['haldi', 'haldhi', 'mehendi', 'mehndi', 'mehandi', 'henna', 'turmeric', 'pithi', 'sangeet'],
  maternity: ['pregnancy', 'baby bump', 'expecting', 'godh bharai', 'seemantham'],
  portrait: ['portraits', 'headshot', 'solo', 'editorial'],
  'birthday-family': ['birthday', 'family', 'anniversary', 'cake smash', 'kids', 'children'],
  'baby-shower': ['baby shower', 'godh bharai', 'valaikappu', 'seemantham', 'newborn'],
  photography: ['photos', 'photo', 'pictures', 'stills', 'album'],
  film: ['films', 'video', 'videos', 'cinematography', 'movie', 'reel', 'teaser'],
  candid: ['candids', 'unposed', 'documentary', 'natural'],
};

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s&/·-]/g, ' ').replace(/\s+/g, ' ').trim();

function buildIndex(): Hit[] {
  const hits: Hit[] = [];
  const { categories } = portfolioConfig;

  const push = (h: Omit<Hit, 'terms'> & { extra?: string }) => {
    hits.push({ ...h, terms: norm([h.title, h.detail, h.extra ?? ''].join(' ')) });
  };

  categories.forEach((category: WorkCategory) => {
    const catAliases = (ALIASES[category.id] ?? []).join(' ');

    push({
      id: `cat-${category.id}`,
      kind: 'category',
      title: category.label,
      detail: category.tagline,
      path: `/work/${category.id}`,
      extra: `${category.description} ${catAliases} collection work`,
    });

    category.collections.forEach((collection) => {
      const kindAliases = (ALIASES[collection.kind] ?? []).join(' ');
      push({
        id: `col-${category.id}-${collection.id}`,
        kind: 'collection',
        title: `${category.label} — ${collection.label}`,
        detail: `${collection.stories.length} ${collection.kind === 'film' ? 'films' : 'stories'}`,
        path: `/work/${category.id}/${collection.id}`,
        extra: `${collection.label} ${catAliases} ${kindAliases}`,
      });

      collection.stories.forEach((story) => {
        push({
          id: `story-${category.id}-${collection.id}-${story.id}`,
          kind: 'story',
          title: story.name,
          detail: `${category.label} · ${story.place}`,
          path: `/work/${category.id}/${collection.id}/${story.id}`,
          /* The place carries the city and the year, so "Udaipur" and "2024"
             both find this gallery. */
          extra: `${story.place} ${collection.label} ${catAliases}`,
        });
      });
    });
  });

  push({ id: 'page-work', kind: 'page', title: 'The work', detail: 'Every collection', path: '/work', extra: 'portfolio galleries categories browse' });
  push({ id: 'page-films', kind: 'page', title: 'Films', detail: 'Wedding films', path: '/films', extra: 'video cinematography reels teaser' });
  push({ id: 'page-about', kind: 'page', title: 'About the studio', detail: 'Who we are', path: '/about', extra: 'team studio story who' });
  push({ id: 'page-contact', kind: 'page', title: 'Enquire', detail: 'Dates, availability and collections', path: '/contact', extra: 'contact booking book price pricing cost enquiry enquire availability whatsapp phone email' });

  return hits;
}

export const SEARCH_INDEX = buildIndex();

/** Ranked so an exact title match always beats an incidental word match. */
export function search(raw: string, limit = 8): Hit[] {
  const q = norm(raw);
  if (q.length < 2) return [];
  const words = q.split(' ').filter(Boolean);

  const scored = SEARCH_INDEX.map((hit) => {
    const title = norm(hit.title);
    let score = 0;

    if (title === q) score += 100;
    else if (title.startsWith(q)) score += 60;
    else if (title.includes(q)) score += 40;

    if (hit.terms.includes(q)) score += 20;

    /* Every word has to land somewhere, or it is not a match at all. */
    for (const w of words) {
      if (!hit.terms.includes(w)) return { hit, score: 0 };
      if (title.includes(w)) score += 8;
      score += 3;
    }

    /* With equal relevance, offer the broader page before a single gallery. */
    score += { category: 6, collection: 4, page: 3, story: 0 }[hit.kind];
    return { hit, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.hit);
}

export const KIND_LABEL: Record<Hit['kind'], string> = {
  category: 'Collection',
  collection: 'Gallery',
  story: 'Story',
  page: 'Page',
};
