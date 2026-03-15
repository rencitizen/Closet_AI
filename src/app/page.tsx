const apiCards = [
  {
    title: "クローゼット台帳",
    body: "カテゴリ、季節、購入情報、状態まで含めて服を構造化して管理します。",
    href: "/api/items",
  },
  {
    title: "コーデ管理",
    body: "登録済みアイテムを組み合わせて、再利用できるコーデを保存します。",
    href: "/api/outfits",
  },
  {
    title: "着用・ケア記録",
    body: "いつ着たか、いつ洗ったか、いつ通常運用に戻したかを追跡します。",
    href: "/api/wear-logs",
  },
];

export default function HomePage() {
  return (
    <main className="shell">
      <section className="hero">
        <div className="panel hero-copy">
          <span className="eyebrow">クローゼットOS</span>
          <h1>Closet AI</h1>
          <p>
            実在する服の在庫管理を中心に、コーデ再利用、着用ログ、ケア管理までを
            一つの流れで扱うモバイルファーストなクローゼット管理アプリです。
            現在は Supabase を前提に、スキーマ設計、入力バリデーション、API の土台まで実装しています。
          </p>
          <div className="actions">
            <a className="button primary" href="/api/items">
              Items API を開く
            </a>
            <a className="button" href="https://supabase.com/docs">
              Supabase ドキュメント
            </a>
          </div>
        </div>

        <aside className="panel hero-card">
          <div className="kicker">
            <h2>MVP 進捗</h2>
            <span className="meta">2026年3月15日</span>
          </div>
          <div className="stat-grid">
            <div className="stat">
              <strong>14</strong>
              <span>主要テーブル定義済み</span>
            </div>
            <div className="stat">
              <strong>6</strong>
              <span>API エンドポイント実装済み</span>
            </div>
            <div className="stat">
              <strong>1</strong>
              <span>初期 migration 作成済み</span>
            </div>
            <div className="stat">
              <strong>Next 15</strong>
              <span>採用ランタイム</span>
            </div>
          </div>
        </aside>
      </section>

      <section className="panel section">
        <h2>現在の実装範囲</h2>
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
        <h2>次に進める実装</h2>
        <ul className="list">
          <li>Supabase の本番接続情報と Storage バケットを整備する。</li>
          <li>認証済みユーザーと closet の紐付けを実装する。</li>
          <li>items、outfits、wear logs、care logs の永続化を安定化する。</li>
          <li>未着用アイテムやケア待ち件数を返すダッシュボード集計を追加する。</li>
        </ul>
      </section>
    </main>
  );
}
