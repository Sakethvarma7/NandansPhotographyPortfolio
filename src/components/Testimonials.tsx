import { portfolioConfig } from '@/data/portfolio';

/*
 * Client words.
 *
 * The brief asked "Do you have written testimonials from past clients?" and the
 * answer was "No — I will collect some". So portfolioConfig.testimonials is
 * empty, and this renders a waiting state rather than invented praise.
 *
 * That is a deliberate refusal, not an oversight. Made-up quotes attributed to
 * couples who never wrote them would be fabricated reviews on a real business's
 * site — the sort of thing that is embarrassing at best and actionable at
 * worst, and impossible to spot once it has been live for a month. The section
 * is built and styled; it fills itself the moment real quotes are added to the
 * config, and until then it says plainly that they are coming.
 */
export default function Testimonials({ navigate }: { navigate: (path: string) => void }) {
  const quotes = portfolioConfig.testimonials;

  return (
    <section className="voices">
      <div className="voices-head reveal">
        <h2>In their <em>words</em></h2>
        <p>From the families we photographed</p>
      </div>

      {quotes.length > 0 ? (
        <div className="voices-grid">
          {quotes.map((t, i) => (
            <figure className="voice reveal" key={t.couple + i} style={{ '--i': i } as React.CSSProperties}>
              <blockquote>{t.quote}</blockquote>
              <figcaption>
                <span className="voice-couple">{t.couple}</span>
                <span className="voice-place">{t.place}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      ) : (
        /*
         * Same convention as the About headshot: show the shape, mark it as
         * waiting. Placeholder photographs are fine — they read as placeholders.
         * Invented praise signed by a named couple would not, which is why the
         * cards carry a label instead of a quote.
         */
        <div className="voices-grid is-pending">
          {[0, 1, 2].map((i) => (
            <figure className="voice is-pending reveal" key={i} style={{ '--i': i } as React.CSSProperties}>
              <p className="voice-mark" aria-hidden="true">&ldquo;</p>
              <p className="voice-wait">Client words<small>To be collected</small></p>
            </figure>
          ))}
        </div>
      )}

      {quotes.length === 0 && (
        <p className="voices-note body-copy">
          Nandan is gathering these from couples he has photographed. Until they
          arrive the photographs speak for themselves —{' '}
          <button className="voices-link" onClick={() => navigate('/work')}>see the work</button>.
        </p>
      )}
    </section>
  );
}
