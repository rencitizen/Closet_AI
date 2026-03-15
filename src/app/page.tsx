const apiCards = [
  {
    title: "Closet inventory",
    body: "Structured item registration with categories, seasons, purchase data, and lifecycle state.",
    href: "/api/items",
  },
  {
    title: "Outfit builder",
    body: "Create reusable outfits from existing items and store season and occasion intent.",
    href: "/api/outfits",
  },
  {
    title: "Wear and care logs",
    body: "Track what was worn, what needs washing, and when items return to active rotation.",
    href: "/api/wear-logs",
  },
];

export default function HomePage() {
  return (
    <main className="shell">
      <section className="hero">
        <div className="panel hero-copy">
          <span className="eyebrow">Closet Operating System</span>
          <h1>Closet AI</h1>
          <p>
            A mobile-first wardrobe system built around real item inventory, outfit reuse,
            wear logging, and garment care. The current build includes schema design,
            request validation, and API scaffolding ready for Supabase persistence.
          </p>
          <div className="actions">
            <a className="button primary" href="/api/items">
              Open items API
            </a>
            <a className="button" href="https://supabase.com/docs">
              Supabase docs
            </a>
          </div>
        </div>

        <aside className="panel hero-card">
          <div className="kicker">
            <h2>MVP status</h2>
            <span className="meta">March 15, 2026</span>
          </div>
          <div className="stat-grid">
            <div className="stat">
              <strong>14</strong>
              <span>core tables defined</span>
            </div>
            <div className="stat">
              <strong>6</strong>
              <span>API surfaces scaffolded</span>
            </div>
            <div className="stat">
              <strong>1</strong>
              <span>initial migration prepared</span>
            </div>
            <div className="stat">
              <strong>Next 15</strong>
              <span>runtime target</span>
            </div>
          </div>
        </aside>
      </section>

      <section className="panel section">
        <h2>Build Surfaces</h2>
        <div className="feature-grid">
          {apiCards.map((card) => (
            <article className="feature" key={card.title}>
              <h3>{card.title}</h3>
              <p>{card.body}</p>
              <a className="meta" href={card.href}>
                {card.href}
              </a>
            </article>
          ))}
        </div>
      </section>

      <section className="panel section">
        <h2>Next Implementation Steps</h2>
        <ul className="list">
          <li>Initialize Supabase project credentials and storage buckets.</li>
          <li>Attach authenticated server clients to the route handlers.</li>
          <li>Persist item, outfit, wear log, and care log records with RLS-safe queries.</li>
          <li>Generate dashboard queries for underused items and care queue status.</li>
        </ul>
      </section>
    </main>
  );
}
