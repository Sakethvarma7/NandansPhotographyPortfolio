/*
 * Site content for Nandan's Photography.
 *
 * STRUCTURE (mirrors the reference site the client picked out):
 *
 *   Category            Wedding, Pre-wedding, Engagement, ...
 *     └ Collection      Photography | Wedding film | Candid
 *         └ Story       one couple / family
 *             └ gallery 30-60 photographs
 *
 * The home page scrolls through every category in order. Work, Films, About
 * and Contact are separate pages.
 *
 * Images are PLACEHOLDERS. The pool below is small, so long galleries cycle
 * through it — the real ~30-60 finals per story replace it wholesale.
 *
 * STILL NEEDED FROM THE CLIENT — see BRIEF.md.
 */

export type GalleryImage = { src: string; alt: string };

export type CollectionKind = 'photography' | 'film' | 'candid';

export type Story = {
  id: string;
  /** Brief: stories are titled with the couple's names. */
  name: string;
  place: string;
  image: GalleryImage;
  gallery: GalleryImage[];
  /** Film stories only — null until the films are uploaded. */
  videoUrl: string | null;
  duration: string | null;
};

export type Collection = {
  id: string;
  label: string;
  kind: CollectionKind;
  cover: GalleryImage;
  stories: Story[];
};

export type WorkCategory = {
  id: string;
  label: string;
  /** The small caps line beside the section heading. */
  tagline: string;
  description: string;
  cover: GalleryImage;
  collections: Collection[];
};

const photo = (id: number, alt: string): GalleryImage => ({
  src: `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=1400`,
  alt,
});

/*
 * Placeholder pool — replaced when the real finals arrive.
 *
 * KNOWN LIMIT, deliberate: all fourteen frames are weddings, couples or
 * rituals. There is no birthday, no family group, no baby shower and no solo
 * portrait in here, so "Birthday / Family" and "Portrait" are necessarily
 * showing couple photographs. That is not a wiring mistake — it is the pool
 * being wrong for those two categories, and no amount of re-indexing fixes
 * it. Those covers become correct the moment Nandan's own frames land.
 *
 * The offsets below ARE meaningful for the categories the pool can serve:
 * index 9 is a verified haldi ceremony and index 10 is verified expecting
 * parents, so haldi-mehendi, maternity and baby-shower point at them
 * explicitly. Don't renumber them casually.
 */
const pool: GalleryImage[] = [
  photo(38681643, 'Wedding ceremony in colourful traditional dress'),
  photo(11749508, 'Couple in traditional wedding attire'),
  photo(32293298, 'Bride and groom exchanging garlands'),
  photo(32325846, 'Hands joined during a wedding ritual'),
  photo(19962114, 'Couple celebrating on their wedding day'),
  photo(27443854, 'Couple embracing outdoors in wedding attire'),
  photo(19609201, 'Couple laughing together in traditional dress'),
  photo(9931785, 'A shared moment between bride and groom'),
  photo(27798509, 'Couple in traditional attire at night'),
  photo(32500047, 'Haldi ceremony in full colour'),
  photo(12738034, 'Expecting parents photographed together'),
  photo(38047785, 'A quiet moment before a celebration'),
  photo(32151000, 'Still frame from a wedding film'),
  photo(38823745, 'Couple photographed at night before a celebration'),
];

/**
 * Brief: 30-60 photographs per story. The stride keeps repeats a full pool
 * apart instead of side by side, so the layout reads correctly while the
 * placeholders are still in place.
 */
const galleryOf = (offset: number, count: number): GalleryImage[] =>
  Array.from({ length: count }, (_, index) => pool[(offset + index * 5) % pool.length]);

const at = (offset: number): GalleryImage => pool[offset % pool.length];

type StorySeed = { id: string; name: string; place: string; size?: number; duration?: string };

const buildStories = (seeds: StorySeed[], kind: CollectionKind, base: number): Story[] =>
  seeds.map((seed, index) => ({
    id: seed.id,
    name: seed.name,
    place: seed.place,
    image: at(base + index * 3),
    gallery: galleryOf(base + index * 3, seed.size ?? 36),
    videoUrl: null,
    duration: kind === 'film' ? (seed.duration ?? null) : null,
  }));

const collection = (
  id: string,
  label: string,
  kind: CollectionKind,
  base: number,
  seeds: StorySeed[],
): Collection => ({
  id,
  label,
  kind,
  cover: at(base),
  stories: buildStories(seeds, kind, base),
});

/*
 * Category order here IS the display order — on the home page and on /work.
 * Rearranging this array rearranges the site.
 *
 * Note: the signed brief listed Engagement and "Birthday / Family" but not
 * Baby shower. Baby shower and Candid were added on later instruction. Worth
 * confirming with the client before launch — see BRIEF.md.
 */
const categories: WorkCategory[] = [
  {
    id: 'wedding',
    label: 'Wedding',
    tagline: 'Real emotions & intimate moments',
    description: 'The whole day, from the first ritual to the last dance.',
    cover: at(0),
    collections: [
      collection('photography', 'Photography', 'photography', 0, [
        { id: 'aditya-meghna', name: 'Aditya & Meghna', place: 'Udaipur · 2024' },
        { id: 'rohan-ishita', name: 'Rohan & Ishita', place: 'Jaipur · 2024' },
        { id: 'karthik-ananya', name: 'Karthik & Ananya', place: 'Chennai · 2023' },
      ]),
      collection('wedding-film', 'Wedding film', 'film', 12, [
        { id: 'vikram-sanjana', name: 'Vikram & Sanjana', place: 'Jodhpur · 2024', size: 30, duration: '4:12' },
        { id: 'arjun-devika', name: 'Arjun & Devika', place: 'Kochi · 2023', size: 30, duration: '3:48' },
        { id: 'siddharth-nandita', name: 'Siddharth & Nandita', place: 'Goa · 2025', size: 30, duration: '5:06' },
      ]),
      collection('candid', 'Candid', 'candid', 6, [
        { id: 'rahul-pallavi', name: 'Rahul & Pallavi', place: 'Hyderabad · 2024' },
        { id: 'nikhil-shreya', name: 'Nikhil & Shreya', place: 'Pune · 2023' },
      ]),
    ],
  },
  {
    id: 'pre-wedding',
    label: 'Pre-wedding',
    tagline: 'Before the day, entirely your own',
    description: 'Unhurried portraits made somewhere that means something to you.',
    cover: at(5),
    collections: [
      collection('photography', 'Photography', 'photography', 5, [
        { id: 'aravind-divya', name: 'Aravind & Divya', place: 'Coimbatore · 2024' },
        { id: 'manish-kavya', name: 'Manish & Kavya', place: 'Lucknow · 2025' },
      ]),
      collection('pre-wedding-film', 'Pre-wedding film', 'film', 8, [
        { id: 'harish-sneha', name: 'Harish & Sneha', place: 'Mysuru · 2023', size: 30, duration: '2:54' },
        { id: 'varun-ritika', name: 'Varun & Ritika', place: 'Chandigarh · 2024', size: 30, duration: '4:37' },
      ]),
      collection('candid', 'Candid', 'candid', 2, [
        { id: 'pranav-aishwarya', name: 'Pranav & Aishwarya', place: 'Thiruvananthapuram · 2025' },
      ]),
    ],
  },
  {
    id: 'engagement',
    label: 'Engagement',
    tagline: 'The yes, and everyone who watched',
    description: 'The ring, the faces around it, and the noise that follows.',
    cover: at(6),
    collections: [
      collection('photography', 'Photography', 'photography', 6, [
        { id: 'gautam-tanvi', name: 'Gautam & Tanvi', place: 'Bhopal · 2023' },
        { id: 'kabir-radhika', name: 'Kabir & Radhika', place: 'Amritsar · 2024' },
      ]),
      collection('candid', 'Candid', 'candid', 1, [
        { id: 'sandeep-aparna', name: 'Sandeep & Aparna', place: 'Visakhapatnam · 2025' },
      ]),
    ],
  },
  {
    id: 'haldi-mehendi',
    label: 'Haldi / Mehendi',
    tagline: 'Colour, laughter, beautiful chaos',
    description: 'The loudest, brightest, least posed day of the whole wedding.',
    cover: at(9),
    collections: [
      collection('photography', 'Photography', 'photography', 9, [
        { id: 'naveen-sruthi', name: 'Naveen & Sruthi', place: 'Madurai · 2023' },
        { id: 'yash-trisha', name: 'Yash & Trisha', place: 'Ahmedabad · 2024' },
      ]),
      collection('candid', 'Candid', 'candid', 3, [
        { id: 'abhinav-malini', name: 'Abhinav & Malini', place: 'Nagpur · 2025' },
      ]),
    ],
  },
  {
    id: 'maternity',
    label: 'Maternity',
    tagline: 'A new chapter, held in soft light',
    description: 'Quiet portraits for the months before everything changes.',
    cover: at(10),
    collections: [
      collection('photography', 'Photography', 'photography', 10, [
        { id: 'the-iyers', name: 'The Iyer Family', place: 'Bengaluru · 2024' },
      ]),
    ],
  },
  {
    id: 'portrait',
    label: 'Portrait',
    tagline: 'The person behind the moment',
    description: 'Editorial portraits with room to breathe.',
    cover: at(7),
    collections: [
      collection('photography', 'Photography', 'photography', 7, [
        { id: 'ira-krishnan', name: 'Ira Krishnan', place: 'Mumbai · 2024' },
        { id: 'devansh-rathore', name: 'Devansh Rathore', place: 'Jaisalmer · 2023' },
      ]),
    ],
  },
  {
    id: 'birthday-family',
    label: 'Birthday / Family',
    tagline: 'The years worth keeping',
    description: 'Birthdays, anniversaries, and everyone in one frame for once.',
    cover: at(13),
    collections: [
      collection('photography', 'Photography', 'photography', 13, [
        { id: 'the-deshpandes', name: 'The Deshpande Family', place: 'Nashik · 2023' },
      ]),
      collection('candid', 'Candid', 'candid', 4, [
        { id: 'the-chakrabortys', name: 'The Chakraborty Family', place: 'Kolkata · 2025' },
      ]),
    ],
  },
  {
    id: 'baby-shower',
    label: 'Baby shower',
    tagline: 'The sweetest kind of waiting',
    description: 'The afternoon before the family gets bigger.',
    cover: at(10),
    collections: [
      collection('photography', 'Photography', 'photography', 10, [
        { id: 'the-menons', name: 'The Menon Family', place: 'Kozhikode · 2024' },
      ]),
    ],
  },
];

/** Categories that actually contain a film collection — drives the Films page. */
export const filmCategories = categories
  .map((category) => ({
    category,
    collections: category.collections.filter((item) => item.kind === 'film'),
  }))
  .filter((entry) => entry.collections.length > 0);

export const findCategory = (id?: string) => categories.find((item) => item.id === id);

export const findCollection = (category: WorkCategory | undefined, id?: string) =>
  category?.collections.find((item) => item.id === id);

export const findStory = (collection: Collection | undefined, id?: string) =>
  collection?.stories.find((item) => item.id === id);

export const portfolioConfig = {
  clientName: "Nandan's Photography",
  shortName: "NANDAN'S",
  domain: 'NandansPhotography.com',
  /* The year the studio started — shown beside the wordmark in the hero. */
  established: 2015,
  logo: '/assets/images/image.png',

  /* Brief: he checks WhatsApp, phone calls and Instagram DMs every day. */
  email: 'nandansphotography25@gmail.com',
  /* Supplied by the client. One number serves both calls and WhatsApp; the +91
     matters because wa.me needs the country code in the dialling string. */
  phone: '+91 93475 22502' as string | null,
  whatsapp: '+91 93475 22502' as string | null,
  instagram: '@nandansphotography' as string | null,
  location: 'India',

  /* Brief: hero is a slideshow now; a looping clip cut from a film comes later. */
  heroVideo: null as string | null,
  /* The previous line here — "Preserving your special day for eternity" — was
     the reference site's own tagline, carried in from the Bolt demo. Replaced. */
  heroTagline: 'Every ritual, every glance, remembered',
  slideshowImages: [at(1), at(5), at(0), at(3), at(6), at(8), at(13), at(2)],

  categories,

  /* Brief: a team, but the client does not want members listed individually. */
  about: {
    eyebrow: 'ABOUT THE STUDIO',
    heading: 'Warm, traditional, and made to be looked at for years.',
    description:
      "Nandan's Photography is a small team photographing weddings and the celebrations around them. We work quietly, stay close to the family, and photograph the day as it actually happens.",
  },

  /* Brief: exactly what he needs to know from an enquiry. */
  enquiry: {
    eventTypes: [
      'Wedding',
      'Pre-wedding',
      'Engagement',
      'Haldi / Mehendi',
      'Maternity',
      'Portrait',
      'Birthday / Family',
      'Baby shower',
      'Wedding film',
    ],
    budgetRanges: [
      'Under ₹1,00,000',
      '₹1,00,000 – ₹2,00,000',
      '₹2,00,000 – ₹3,00,000',
      '₹3,00,000 – ₹5,00,000',
      'Above ₹5,00,000',
      'Not sure yet',
    ],
    referralSources: [
      'Instagram',
      'Google',
      'A friend or family',
      'A past client',
      'A wedding planner or venue',
      'Other',
    ],
  },

  /*
   * Brief: "Do you have written testimonials from past clients?" ->
   * "No — I will collect some." So this is deliberately empty. It is NOT a
   * placeholder to be filled with invented quotes: fabricated praise attributed
   * to couples who did not write it is a real problem on a real business's
   * site. The section renders an honest waiting state until these arrive, and
   * appears properly the moment one is added.
   */
  testimonials: [] as { quote: string; couple: string; place: string }[],

  /* Brief: watermark everything, and disable right-click / download. */
  protectImages: true,
  watermark: { enabled: true, text: "NANDAN'S PHOTOGRAPHY" },
};
