"use client";

import { Session } from "@supabase/supabase-js";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type Closet = {
  id: string;
  user_id: string;
  name: string;
  timezone: string;
  currency: string;
  created_at: string;
};

type ClothingItem = {
  id: string;
  name: string;
  category: string;
  brand: string | null;
  color: string | null;
  status: string;
  season_tags: string[];
  wear_count: number;
  purchase_price: number | null;
};

type ClosetResponse = {
  closets: Closet[];
  error?: string;
};

type ItemResponse = {
  items: ClothingItem[];
  total: number;
  error?: string;
};

type ItemAnalysis = {
  name: string;
  category: string;
  brand: string | null;
  color: string | null;
  season_tags: string[];
  status: string;
  notes: string | null;
  confidence: number;
};

const storageKeys = {
  closetId: "closet_ai_closet_id",
};

function buildAuthHeaders(session: Session | null, closetId?: string) {
  const headers: Record<string, string> = {};

  if (session?.access_token) {
    headers.authorization = `Bearer ${session.access_token}`;
  }

  if (closetId) {
    headers["x-closet-id"] = closetId;
  }

  return headers;
}

export function ClosetApp() {
  const supabase = getSupabaseBrowserClient();
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [closets, setClosets] = useState<Closet[]>([]);
  const [selectedClosetId, setSelectedClosetId] = useState("");
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [closetName, setClosetName] = useState("My Closet");
  const [itemName, setItemName] = useState("");
  const [itemCategory, setItemCategory] = useState("tops");
  const [itemBrand, setItemBrand] = useState("");
  const [itemColor, setItemColor] = useState("");
  const [itemPrice, setItemPrice] = useState("");
  const [itemSeason, setItemSeason] = useState("all_season");
  const [itemStatus, setItemStatus] = useState("active");
  const [itemNotes, setItemNotes] = useState("");
  const [selectedImageName, setSelectedImageName] = useState("");
  const [imagePreviewUrl, setImagePreviewUrl] = useState("");
  const [imageDataUrl, setImageDataUrl] = useState("");
  const [analysis, setAnalysis] = useState<ItemAnalysis | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const user = session?.user ?? null;
  const selectedCloset = useMemo(
    () => closets.find((closet) => closet.id === selectedClosetId) ?? null,
    [closets, selectedClosetId],
  );

  async function loadClosets(activeSession: Session) {
    const response = await fetch("/api/closets", {
      headers: buildAuthHeaders(activeSession),
      cache: "no-store",
    });
    const data = (await response.json()) as ClosetResponse;

    if (!response.ok) {
      throw new Error(data.error ?? "クローゼット一覧の取得に失敗しました。");
    }

    setClosets(data.closets);

    const savedClosetId = window.localStorage.getItem(storageKeys.closetId);
    const fallbackClosetId = data.closets[0]?.id ?? "";
    const nextClosetId = data.closets.some((closet) => closet.id === savedClosetId)
      ? savedClosetId ?? ""
      : fallbackClosetId;

    setSelectedClosetId(nextClosetId);

    if (nextClosetId) {
      window.localStorage.setItem(storageKeys.closetId, nextClosetId);
    }
  }

  async function loadItems(activeSession: Session, closetId: string) {
    if (!closetId) {
      setItems([]);
      return;
    }

    const response = await fetch(`/api/items?closet_id=${closetId}`, {
      headers: buildAuthHeaders(activeSession, closetId),
      cache: "no-store",
    });
    const data = (await response.json()) as ItemResponse;

    if (!response.ok) {
      throw new Error(data.error ?? "アイテム一覧の取得に失敗しました。");
    }

    setItems(data.items);
  }

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

    const authListener = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      authListener.data.subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (!session) {
      setClosets([]);
      setItems([]);
      setSelectedClosetId("");
      return;
    }

    void (async () => {
      try {
        setBusy("loading");
        setError(null);
        await loadClosets(session);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "読み込みに失敗しました。");
      } finally {
        setBusy(null);
      }
    })();
  }, [session]);

  useEffect(() => {
    if (!session || !selectedClosetId) {
      if (!selectedClosetId) {
        setItems([]);
      }
      return;
    }

    window.localStorage.setItem(storageKeys.closetId, selectedClosetId);

    void (async () => {
      try {
        setBusy("items");
        setError(null);
        await loadItems(session, selectedClosetId);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "読み込みに失敗しました。");
      } finally {
        setBusy(null);
      }
    })();
  }, [selectedClosetId, session]);

  async function handleSignUp() {
    try {
      setBusy("signup");
      setError(null);
      setNotice(null);

      const result = await supabase.auth.signUp({
        email,
        password,
      });

      if (result.error) {
        throw result.error;
      }

      setNotice("新規登録を受け付けました。メール確認が有効な設定なら受信メールを確認してください。");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "新規登録に失敗しました。");
    } finally {
      setBusy(null);
    }
  }

  async function handleSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setBusy("signin");
      setError(null);
      setNotice(null);

      const result = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (result.error) {
        throw result.error;
      }

      setNotice("ログインしました。");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "ログインに失敗しました。");
    } finally {
      setBusy(null);
    }
  }

  async function handleSignOut() {
    try {
      setBusy("signout");
      setError(null);
      setNotice(null);

      const result = await supabase.auth.signOut();

      if (result.error) {
        throw result.error;
      }

      window.localStorage.removeItem(storageKeys.closetId);
      setNotice("ログアウトしました。");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "ログアウトに失敗しました。");
    } finally {
      setBusy(null);
    }
  }

  async function handleCreateCloset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!session) {
      setError("先にログインしてください。");
      return;
    }

    try {
      setBusy("create-closet");
      setError(null);
      setNotice(null);

      const response = await fetch("/api/closets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...buildAuthHeaders(session),
        },
        body: JSON.stringify({
          name: closetName,
          timezone: "Asia/Tokyo",
          currency: "JPY",
        }),
      });
      const data = (await response.json()) as { closet?: Closet; error?: string };

      if (!response.ok || !data.closet) {
        throw new Error(data.error ?? "クローゼット作成に失敗しました。");
      }

      setClosetName("My Closet");
      await loadClosets(session);
      setSelectedClosetId(data.closet.id);
      setNotice("クローゼットを作成しました。");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "クローゼット作成に失敗しました。");
    } finally {
      setBusy(null);
    }
  }

  async function handleCreateItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!session) {
      setError("先にログインしてください。");
      return;
    }

    if (!selectedClosetId) {
      setError("先にクローゼットを選択してください。");
      return;
    }

    try {
      setBusy("create-item");
      setError(null);
      setNotice(null);

      const response = await fetch("/api/items", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...buildAuthHeaders(session, selectedClosetId),
        },
        body: JSON.stringify({
          name: itemName,
          category: itemCategory,
          brand: itemBrand || undefined,
          color: itemColor || undefined,
          season_tags: [itemSeason],
          purchase_price: itemPrice ? Number(itemPrice) : undefined,
          status: itemStatus,
          notes: itemNotes || undefined,
        }),
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "アイテム登録に失敗しました。");
      }

      setItemName("");
      setItemBrand("");
      setItemColor("");
      setItemPrice("");
      setItemNotes("");
      setAnalysis(null);
      setSelectedImageName("");
      setImagePreviewUrl("");
      setImageDataUrl("");
      await loadItems(session, selectedClosetId);
      setNotice("アイテムを登録しました。");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "アイテム登録に失敗しました。");
    } finally {
      setBusy(null);
    }
  }

  async function handleImageSelected(file: File | null) {
    if (!file) {
      setSelectedImageName("");
      setImagePreviewUrl("");
      setImageDataUrl("");
      setAnalysis(null);
      return;
    }

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("画像の読み込みに失敗しました。"));
      reader.readAsDataURL(file);
    });

    setSelectedImageName(file.name);
    setImagePreviewUrl(dataUrl);
    setImageDataUrl(dataUrl);
    setAnalysis(null);
  }

  async function handleAnalyzeItem() {
    if (!session) {
      setError("先にログインしてください。");
      return;
    }

    if (!imageDataUrl) {
      setError("先に画像を選択してください。");
      return;
    }

    try {
      setBusy("analyze-item");
      setError(null);
      setNotice(null);

      const response = await fetch("/api/items/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...buildAuthHeaders(session),
        },
        body: JSON.stringify({
          image_data_url: imageDataUrl,
          filename: selectedImageName || undefined,
        }),
      });
      const data = (await response.json()) as { analysis?: ItemAnalysis; error?: string };

      if (!response.ok || !data.analysis) {
        throw new Error(data.error ?? "AI解析に失敗しました。");
      }

      setAnalysis(data.analysis);
      setItemName((current) => (current ? current : data.analysis!.name));
      setItemCategory(data.analysis.category);
      setItemBrand(data.analysis.brand ?? "");
      setItemColor(data.analysis.color ?? "");
      setItemSeason(data.analysis.season_tags[0] ?? "all_season");
      setItemStatus(data.analysis.status);
      setItemNotes(data.analysis.notes ?? "");
      setNotice("AIの候補をフォームに反映しました。必要に応じて修正して保存してください。");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "AI解析に失敗しました。");
    } finally {
      setBusy(null);
    }
  }

  return (
    <main className="shell">
      <section className="workspace-grid">
        <aside className="panel sidebar">
          <div className="sidebar-block">
            <span className="eyebrow">Closet OS</span>
            <h1 className="sidebar-title">Closet AI</h1>
            <p className="meta">
              認証、クローゼット管理、アイテム登録までをすぐ使える画面にまとめています。
            </p>
          </div>

          <nav className="sidebar-nav">
            <a href="#auth">認証</a>
            <a href="#closets">クローゼット</a>
            <a href="#items">アイテム</a>
          </nav>

          <div className="sidebar-stats">
            <div className="stat">
              <strong>{session ? "ON" : "OFF"}</strong>
              <span>認証</span>
            </div>
            <div className="stat">
              <strong>{closets.length}</strong>
              <span>クローゼット数</span>
            </div>
            <div className="stat">
              <strong>{items.length}</strong>
              <span>アイテム数</span>
            </div>
            <div className="stat">
              <strong>{busy ? "処理中" : "待機中"}</strong>
              <span>通信状態</span>
            </div>
          </div>
        </aside>

        <div className="workspace-main">
          <section className="panel section hero-section">
            <div className="kicker">
              <h2>現在の利用状況</h2>
              <span className="meta">{user?.email ?? "未ログイン"}</span>
            </div>
            <p className="hero-text">
              メールアドレスとパスワードでログインし、ユーザーごとに独立したクローゼットを作成できます。
              選択中のクローゼットに対してアイテムを登録し、一覧で確認できます。
            </p>
          </section>

          {error ? (
            <section className="panel section error-panel">
              <h2>エラー</h2>
              <p>{error}</p>
            </section>
          ) : null}

          {notice ? (
            <section className="panel section notice-panel">
              <h2>通知</h2>
              <p>{notice}</p>
            </section>
          ) : null}

          <section className="panel section" id="auth">
            <div className="kicker">
              <h2>認証</h2>
              <span className="meta">Supabase Auth</span>
            </div>
            <div className="two-column">
              <form className="stack-form" onSubmit={handleSignIn}>
                <label className="field">
                  <span>メールアドレス</span>
                  <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
                </label>
                <label className="field">
                  <span>パスワード</span>
                  <input
                    required
                    minLength={6}
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </label>
                <div className="actions">
                  <button className="button primary" disabled={busy === "signin"} type="submit">
                    {busy === "signin" ? "ログイン中..." : "ログイン"}
                  </button>
                  <button className="button" disabled={busy === "signup"} onClick={handleSignUp} type="button">
                    {busy === "signup" ? "登録中..." : "新規登録"}
                  </button>
                  <button className="button" disabled={!session || busy === "signout"} onClick={handleSignOut} type="button">
                    {busy === "signout" ? "ログアウト中..." : "ログアウト"}
                  </button>
                </div>
              </form>

              <div className="stack-list">
                <article className="feature">
                  <h3>現在のユーザー</h3>
                  <p>{user?.email ?? "ログインしていません。"}</p>
                </article>
                <article className="feature">
                  <h3>認証方式</h3>
                  <p>メールアドレスとパスワードを使った Supabase Auth を利用しています。</p>
                </article>
              </div>
            </div>
          </section>

          <section className="panel section" id="closets">
            <div className="kicker">
              <h2>クローゼット</h2>
              <span className="meta">{selectedCloset ? `選択中: ${selectedCloset.name}` : "未選択"}</span>
            </div>
            <div className="two-column">
              <form className="stack-form" onSubmit={handleCreateCloset}>
                <label className="field">
                  <span>クローゼット名</span>
                  <input required value={closetName} onChange={(event) => setClosetName(event.target.value)} />
                </label>
                <button className="button primary" disabled={!session || busy === "create-closet"} type="submit">
                  {busy === "create-closet" ? "作成中..." : "クローゼットを作成"}
                </button>
              </form>

              <div className="stack-list">
                {closets.length === 0 ? (
                  <p className="meta">まだクローゼットがありません。ログイン後に作成してください。</p>
                ) : (
                  closets.map((closet) => (
                    <button
                      key={closet.id}
                      className={`select-card${closet.id === selectedClosetId ? " is-active" : ""}`}
                      onClick={() => setSelectedClosetId(closet.id)}
                      type="button"
                    >
                      <strong>{closet.name}</strong>
                      <span>{closet.timezone}</span>
                      <span className="meta">{closet.id}</span>
                    </button>
                  ))
                )}
              </div>
            </div>
          </section>

          <section className="panel section" id="items">
            <div className="kicker">
              <h2>アイテム</h2>
              <span className="meta">{selectedCloset ? `対象: ${selectedCloset.name}` : "クローゼット未選択"}</span>
            </div>

            <div className="two-column">
              <section className="feature">
                <h3>AI 解析</h3>
                <p>画像からカテゴリ、色、ブランド候補、季節、メモを推定して入力補助します。</p>
                <label className="field">
                  <span>画像を選択</span>
                  <input
                    accept="image/*"
                    type="file"
                    onChange={(event) => {
                      const file = event.target.files?.[0] ?? null;
                      void handleImageSelected(file);
                    }}
                  />
                </label>
                {selectedImageName ? <p className="meta">選択中: {selectedImageName}</p> : null}
                {imagePreviewUrl ? <img alt="選択した衣類画像" className="analysis-preview" src={imagePreviewUrl} /> : null}
                <div className="actions">
                  <button
                    className="button"
                    disabled={!session || !imageDataUrl || busy === "analyze-item"}
                    onClick={handleAnalyzeItem}
                    type="button"
                  >
                    {busy === "analyze-item" ? "解析中..." : "AIで解析"}
                  </button>
                </div>
                {analysis ? (
                  <div className="analysis-result">
                    <strong>AI候補</strong>
                    <p className="meta">name: {analysis.name}</p>
                    <p className="meta">category: {analysis.category}</p>
                    <p className="meta">brand: {analysis.brand ?? "-"}</p>
                    <p className="meta">color: {analysis.color ?? "-"}</p>
                    <p className="meta">season: {analysis.season_tags.join(", ") || "-"}</p>
                    <p className="meta">confidence: {analysis.confidence}</p>
                  </div>
                ) : null}
              </section>

              <section className="feature">
                <h3>登録の流れ</h3>
                <p>1. 画像を選択</p>
                <p>2. AIで候補生成</p>
                <p>3. 内容を確認・修正</p>
                <p>4. アイテムを保存</p>
              </section>
            </div>

            <form className="item-form-grid" onSubmit={handleCreateItem}>
              <label className="field">
                <span>名前</span>
                <input required value={itemName} onChange={(event) => setItemName(event.target.value)} />
              </label>
              <label className="field">
                <span>カテゴリ</span>
                <select value={itemCategory} onChange={(event) => setItemCategory(event.target.value)}>
                  <option value="tops">tops</option>
                  <option value="bottoms">bottoms</option>
                  <option value="outer">outer</option>
                  <option value="shoes">shoes</option>
                  <option value="bag">bag</option>
                  <option value="accessory">accessory</option>
                </select>
              </label>
              <label className="field">
                <span>ブランド</span>
                <input value={itemBrand} onChange={(event) => setItemBrand(event.target.value)} />
              </label>
              <label className="field">
                <span>色</span>
                <input value={itemColor} onChange={(event) => setItemColor(event.target.value)} />
              </label>
              <label className="field">
                <span>価格</span>
                <input inputMode="numeric" value={itemPrice} onChange={(event) => setItemPrice(event.target.value)} />
              </label>
              <label className="field">
                <span>季節</span>
                <select value={itemSeason} onChange={(event) => setItemSeason(event.target.value)}>
                  <option value="all_season">all season</option>
                  <option value="spring">spring</option>
                  <option value="summer">summer</option>
                  <option value="autumn">autumn</option>
                  <option value="winter">winter</option>
                </select>
              </label>
              <label className="field">
                <span>状態</span>
                <select value={itemStatus} onChange={(event) => setItemStatus(event.target.value)}>
                  <option value="active">active</option>
                  <option value="stored">stored</option>
                  <option value="in_laundry">in_laundry</option>
                  <option value="in_cleaning">in_cleaning</option>
                </select>
              </label>
              <label className="field item-notes-field">
                <span>メモ</span>
                <input value={itemNotes} onChange={(event) => setItemNotes(event.target.value)} />
              </label>
              <div className="field action-cell">
                <span>&nbsp;</span>
                <button className="button primary" disabled={!session || busy === "create-item"} type="submit">
                  {busy === "create-item" ? "登録中..." : "アイテムを登録"}
                </button>
              </div>
            </form>

            {items.length === 0 ? (
              <p className="meta empty-state">まだアイテムがありません。クローゼットを選択して登録してください。</p>
            ) : (
              <div className="item-grid">
                {items.map((item) => (
                  <article className="item-card" key={item.id}>
                    <div className="item-card-head">
                      <strong>{item.name}</strong>
                      <span className={`status-pill status-${item.status}`}>{item.status}</span>
                    </div>
                    <p className="meta">
                      {item.category}
                      {item.brand ? ` / ${item.brand}` : ""}
                      {item.color ? ` / ${item.color}` : ""}
                    </p>
                    <p className="meta">season: {item.season_tags.join(", ") || "-"}</p>
                    <p className="meta">wear count: {item.wear_count}</p>
                    <p className="meta">
                      price: {item.purchase_price != null ? `${item.purchase_price.toLocaleString()} JPY` : "-"}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
