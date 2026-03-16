"use client";

import { FormEvent, PointerEvent as ReactPointerEvent, useEffect, useMemo, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { usePathname, useRouter } from "next/navigation";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type Closet = {
  id: string;
  name: string;
  timezone: string;
  currency: string;
  created_at: string;
};

type Item = {
  id: string;
  name: string;
  category: string;
  brand: string | null;
  color: string | null;
  status: string;
  season_tags: string[];
  purchase_price: number | null;
  primary_image_url: string | null;
  notes: string | null;
  wear_count: number;
  last_worn_at: string | null;
};

type OutfitItem = {
  outfit_id: string;
  item_id: string;
  role: string | null;
  sort_order: number;
};

type Outfit = {
  id: string;
  name: string;
  notes: string | null;
  rating: number | null;
  is_favorite: boolean;
  outfit_items: OutfitItem[];
};

type WearLog = {
  id: string;
  worn_on: string;
  outfit_id: string | null;
  notes: string | null;
  wear_log_items: Array<{ item_id: string }>;
};

type CareLog = {
  id: string;
  item_id: string;
  care_type: string;
  status: string;
  cared_on: string;
  cost: number | null;
  vendor_name: string | null;
  notes: string | null;
};

type ItemDetail = Item & {
  clothing_item_images?: Array<{ id: string; image_url: string; is_primary: boolean }>;
  care_logs?: CareLog[];
  disposal_records?: Array<{
    id: string;
    disposed_on: string;
    disposal_type: string;
    recovered_amount: number | null;
    reason: string | null;
    notes: string | null;
  }>;
  purchase_records?: Array<{
    id: string;
    purchased_on: string | null;
    price: number | null;
    store_name: string | null;
  }>;
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

type ItemFormState = {
  name: string;
  category: string;
  brand: string;
  color: string;
  status: string;
  purchasePrice: string;
  notes: string;
  seasonTags: string[];
};

type Tag = {
  id: string;
  name: string;
  color: string | null;
};

type Location = {
  id: string;
  name: string;
  location_type: string;
  sort_order: number;
};

type SavedFilter = {
  id: string;
  name: string;
  filter_json: Record<string, unknown>;
};

type OutfitLayout = Record<
  string,
  {
    top: number;
    left: number;
    width: number;
  }
>;

const categoryOptions = ["tops", "bottoms", "outer", "shoes", "bag", "accessory", "dress", "other"];
const seasonOptions = ["spring", "summer", "autumn", "winter", "all_season"];
const statusOptions = ["active", "stored", "in_laundry", "in_cleaning"];
const colorOptions = [
  "black",
  "white",
  "gray",
  "navy",
  "blue",
  "beige",
  "brown",
  "green",
  "khaki",
  "yellow",
  "orange",
  "red",
  "pink",
  "purple",
  "silver",
  "gold",
  "multicolor",
];
const categoryLabels: Record<string, string> = {
  tops: "トップス",
  bottoms: "ボトムス",
  outer: "アウター",
  shoes: "シューズ",
  bag: "バッグ",
  accessory: "アクセサリー",
  dress: "ドレス",
  other: "その他",
};

const initialItemForm: ItemFormState = {
  name: "",
  category: "tops",
  brand: "",
  color: "",
  status: "active",
  purchasePrice: "",
  notes: "",
  seasonTags: [],
};

function formatCurrency(value: number | null) {
  if (value == null || Number.isNaN(value)) {
    return "価格未設定";
  }

  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
  }).format(value);
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("画像の読み込みに失敗しました"));
    };
    reader.onerror = () => reject(reader.error ?? new Error("画像の読み込みに失敗しました"));
    reader.readAsDataURL(file);
  });
}

function getOutfitPlacement(category: string) {
  switch (category) {
    case "outer":
      return { top: 7, left: 50, width: 38 };
    case "tops":
      return { top: 24, left: 50, width: 34 };
    case "dress":
      return { top: 22, left: 50, width: 34 };
    case "bottoms":
      return { top: 47, left: 50, width: 31 };
    case "shoes":
      return { top: 77, left: 50, width: 28 };
    case "bag":
      return { top: 41, left: 78, width: 22 };
    case "accessory":
      return { top: 16, left: 24, width: 18 };
    default:
      return { top: 66, left: 18, width: 24 };
  }
}

function statusClassName(status: string) {
  if (status === "active") {
    return "status-pill status-active";
  }

  return "status-pill status-stored";
}

export function ClosetApp() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  const [closets, setClosets] = useState<Closet[]>([]);
  const [selectedClosetId, setSelectedClosetId] = useState<string>("");
  const [closetName, setClosetName] = useState("");

  const [items, setItems] = useState<Item[]>([]);
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [wearLogs, setWearLogs] = useState<WearLog[]>([]);
  const [careLogs, setCareLogs] = useState<CareLog[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const [selectedItemDetail, setSelectedItemDetail] = useState<ItemDetail | null>(null);
  const [itemForm, setItemForm] = useState<ItemFormState>(initialItemForm);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedImageDataUrl, setSelectedImageDataUrl] = useState<string | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<ItemAnalysis | null>(null);

  const [selectedOutfitItemIds, setSelectedOutfitItemIds] = useState<string[]>([]);
  const [outfitLayout, setOutfitLayout] = useState<OutfitLayout>({});
  const [outfitName, setOutfitName] = useState("");
  const [outfitNotes, setOutfitNotes] = useState("");
  const [wearDate, setWearDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [wearNotes, setWearNotes] = useState("");
  const [careItemId, setCareItemId] = useState("");
  const [careType, setCareType] = useState("wash");
  const [careStatus, setCareStatus] = useState("done");
  const [careDate, setCareDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [careCost, setCareCost] = useState("");
  const [careVendor, setCareVendor] = useState("");
  const [careNotes, setCareNotes] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [itemEditForm, setItemEditForm] = useState<ItemFormState>(initialItemForm);
  const [editSelectedFile, setEditSelectedFile] = useState<File | null>(null);
  const [editSelectedImageDataUrl, setEditSelectedImageDataUrl] = useState<string | null>(null);
  const [editImagePreviewUrl, setEditImagePreviewUrl] = useState<string | null>(null);
  const [disposalDate, setDisposalDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [disposalType, setDisposalType] = useState("sold");
  const [disposalReason, setDisposalReason] = useState("");
  const [disposalAmount, setDisposalAmount] = useState("");
  const [tagName, setTagName] = useState("");
  const [tagColor, setTagColor] = useState("");
  const [locationName, setLocationName] = useState("");
  const [locationType, setLocationType] = useState("closet");
  const [savedFilterName, setSavedFilterName] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterColor, setFilterColor] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [screenError, setScreenError] = useState<string | null>(null);
  const [screenMessage, setScreenMessage] = useState<string | null>(null);
  const boardRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{
    itemId: string;
    offsetX: number;
    offsetY: number;
    pieceWidth: number;
    pieceHeight: number;
  } | null>(null);

  const selectedCloset = closets.find((closet) => closet.id === selectedClosetId) ?? null;
  const selectedOutfitItems = items.filter((item) => selectedOutfitItemIds.includes(item.id));
  const unwornItems = items.filter((item) => !item.last_worn_at);
  const activeItems = items.filter((item) => item.status === "active");
  const careQueuedItems = items.filter((item) => item.status === "in_cleaning" || item.status === "in_laundry");
  const expensiveItems = [...items]
    .filter((item) => item.purchase_price != null)
    .sort((a, b) => Number(b.purchase_price ?? 0) - Number(a.purchase_price ?? 0))
    .slice(0, 5);
  const totalSpent = items.reduce((sum, item) => sum + Number(item.purchase_price ?? 0), 0);
  const filteredItems = items.filter((item) => {
    if (filterCategory && item.category !== filterCategory) return false;
    if (filterStatus && item.status !== filterStatus) return false;
    if (filterColor && !(item.color ?? "").toLowerCase().includes(filterColor.toLowerCase())) return false;
    return true;
  });
  const groupedFilteredItems = categoryOptions
    .map((category) => ({
      category,
      items: filteredItems.filter((item) => item.category === category),
    }))
    .filter((group) => group.items.length > 0);
  const groupedClosetItems = categoryOptions
    .map((category) => ({
      category,
      items: items.filter((item) => item.category === category),
    }))
    .filter((group) => group.items.length > 0);
  const currentRoute = pathname === "/" ? "/dashboard" : pathname;

  function isRoute(route: string) {
    return currentRoute === route;
  }

  function navClassName(route: string) {
    return isRoute(route) ? "is-active" : "";
  }

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) {
        return;
      }

      setSession(data.session ?? null);
      setAuthLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthLoading(false);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (!session) {
      setClosets([]);
      setItems([]);
      setOutfits([]);
      setWearLogs([]);
      setCareLogs([]);
      setTags([]);
      setLocations([]);
      setSavedFilters([]);
      setSelectedClosetId("");
      return;
    }

    void loadClosets(session);
  }, [session]);

  useEffect(() => {
    if (!session || !selectedClosetId) {
      setItems([]);
      setOutfits([]);
      setWearLogs([]);
      setCareLogs([]);
      setTags([]);
      setLocations([]);
      setSavedFilters([]);
      return;
    }

    void Promise.all([
      loadItems(session, selectedClosetId),
      loadOutfits(session, selectedClosetId),
      loadWearLogs(session, selectedClosetId),
      loadCareLogs(session, selectedClosetId),
      loadTags(session, selectedClosetId),
      loadLocations(session, selectedClosetId),
      loadSavedFilters(session, selectedClosetId),
    ]);
  }, [session, selectedClosetId]);

  useEffect(() => {
    if (!session || !selectedItemId) {
      setSelectedItemDetail(null);
      setEditMode(false);
      setEditSelectedFile(null);
      setEditSelectedImageDataUrl(null);
      setEditImagePreviewUrl(null);
      return;
    }

    void loadItemDetail(selectedItemId);
  }, [session, selectedItemId]);

  useEffect(() => {
    setOutfitLayout((current) => {
      const next: OutfitLayout = {};

      selectedOutfitItems.forEach((item) => {
        next[item.id] = current[item.id] ?? getOutfitPlacement(item.category);
      });

      return next;
    });
  }, [selectedOutfitItems]);

  async function authorizedFetch(input: string, init?: RequestInit) {
    if (!session?.access_token) {
      throw new Error("認証セッションが見つかりません");
    }

    const headers = new Headers(init?.headers);
    headers.set("Authorization", `Bearer ${session.access_token}`);

    if (selectedClosetId) {
      headers.set("x-closet-id", selectedClosetId);
    }

    return fetch(input, {
      ...init,
      headers,
    });
  }

  async function loadClosets(currentSession: Session) {
    const response = await fetch("/api/closets", {
      headers: {
        Authorization: `Bearer ${currentSession.access_token}`,
      },
    });
    const payload = (await response.json()) as { closets?: Closet[]; error?: string };

    if (!response.ok) {
      throw new Error(payload.error ?? "クローゼットの取得に失敗しました");
    }

    const nextClosets = payload.closets ?? [];
    setClosets(nextClosets);

    if (!nextClosets.length) {
      setSelectedClosetId("");
      return;
    }

    setSelectedClosetId((current) => {
      if (current && nextClosets.some((closet) => closet.id === current)) {
        return current;
      }

      return nextClosets[0].id;
    });
  }

  async function loadItems(currentSession: Session, closetId: string) {
    const response = await fetch(`/api/items?closet_id=${closetId}&limit=100`, {
      headers: {
        Authorization: `Bearer ${currentSession.access_token}`,
        "x-closet-id": closetId,
      },
    });
    const payload = (await response.json()) as { items?: Item[]; error?: string };

    if (!response.ok) {
      throw new Error(payload.error ?? "アイテムの取得に失敗しました");
    }

    setItems(payload.items ?? []);
  }

  async function loadOutfits(currentSession: Session, closetId: string) {
    const response = await fetch(`/api/outfits?closet_id=${closetId}`, {
      headers: {
        Authorization: `Bearer ${currentSession.access_token}`,
        "x-closet-id": closetId,
      },
    });
    const payload = (await response.json()) as { outfits?: Outfit[]; error?: string };

    if (!response.ok) {
      throw new Error(payload.error ?? "コーデの取得に失敗しました");
    }

    setOutfits(payload.outfits ?? []);
  }

  async function loadWearLogs(currentSession: Session, closetId: string) {
    const response = await fetch(`/api/wear-logs?closet_id=${closetId}`, {
      headers: {
        Authorization: `Bearer ${currentSession.access_token}`,
        "x-closet-id": closetId,
      },
    });
    const payload = (await response.json()) as { wear_logs?: WearLog[]; error?: string };

    if (!response.ok) {
      throw new Error(payload.error ?? "Failed to fetch wear logs");
    }

    setWearLogs(payload.wear_logs ?? []);
  }

  async function loadCareLogs(currentSession: Session, closetId: string) {
    const response = await fetch(`/api/care-logs?closet_id=${closetId}`, {
      headers: {
        Authorization: `Bearer ${currentSession.access_token}`,
        "x-closet-id": closetId,
      },
    });
    const payload = (await response.json()) as { care_logs?: CareLog[]; error?: string };

    if (!response.ok) {
      throw new Error(payload.error ?? "Failed to fetch care logs");
    }

    setCareLogs(payload.care_logs ?? []);
  }

  async function loadItemDetail(itemId: string) {
    setIsDetailLoading(true);

    try {
      const response = await authorizedFetch(`/api/items/${itemId}`);
      const payload = (await response.json()) as { item?: ItemDetail; error?: string };

      if (!response.ok || !payload.item) {
        throw new Error(payload.error ?? "Failed to fetch item detail");
      }

      setSelectedItemDetail(payload.item);
      setItemEditForm({
        name: payload.item.name ?? "",
        category: payload.item.category ?? "tops",
        brand: payload.item.brand ?? "",
        color: payload.item.color ?? "",
        status: payload.item.status ?? "active",
        purchasePrice: payload.item.purchase_price?.toString() ?? "",
        notes: payload.item.notes ?? "",
        seasonTags: payload.item.season_tags ?? [],
      });
      setEditSelectedFile(null);
      setEditSelectedImageDataUrl(null);
      setEditImagePreviewUrl(payload.item.primary_image_url ?? null);
    } catch (error) {
      setScreenError(error instanceof Error ? error.message : "Failed to fetch item detail");
    } finally {
      setIsDetailLoading(false);
    }
  }

  async function loadTags(currentSession: Session, closetId: string) {
    const response = await fetch(`/api/tags?closet_id=${closetId}`, {
      headers: {
        Authorization: `Bearer ${currentSession.access_token}`,
        "x-closet-id": closetId,
      },
    });
    const payload = (await response.json()) as { tags?: Tag[]; error?: string };

    if (!response.ok) {
      throw new Error(payload.error ?? "Failed to fetch tags");
    }

    setTags(payload.tags ?? []);
  }

  async function loadLocations(currentSession: Session, closetId: string) {
    const response = await fetch(`/api/locations?closet_id=${closetId}`, {
      headers: {
        Authorization: `Bearer ${currentSession.access_token}`,
        "x-closet-id": closetId,
      },
    });
    const payload = (await response.json()) as { locations?: Location[]; error?: string };

    if (!response.ok) {
      throw new Error(payload.error ?? "Failed to fetch locations");
    }

    setLocations(payload.locations ?? []);
  }

  async function loadSavedFilters(currentSession: Session, closetId: string) {
    const response = await fetch(`/api/saved-filters?closet_id=${closetId}`, {
      headers: {
        Authorization: `Bearer ${currentSession.access_token}`,
        "x-closet-id": closetId,
      },
    });
    const payload = (await response.json()) as { saved_filters?: SavedFilter[]; error?: string };

    if (!response.ok) {
      throw new Error(payload.error ?? "Failed to fetch saved filters");
    }

    setSavedFilters(payload.saved_filters ?? []);
  }

  async function handleAuthSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthError(null);
    setAuthMessage(null);

    const action =
      authMode === "signup"
        ? supabase.auth.signUp({ email, password })
        : supabase.auth.signInWithPassword({ email, password });

    const { error } = await action;

    if (error) {
      setAuthError(error.message);
      return;
    }

    if (authMode === "signup") {
      setAuthMessage("登録しました。メール確認が必要な設定の場合は受信ボックスを確認してください。");
    } else {
      setAuthMessage("ログインしました。");
    }

    setPassword("");
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    setScreenMessage(null);
    setScreenError(null);
  }

  async function handleCreateCloset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setScreenError(null);
    setScreenMessage(null);

    try {
      const response = await authorizedFetch("/api/closets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: closetName || "My Closet",
          timezone: "Asia/Tokyo",
          currency: "JPY",
        }),
      });
      const payload = (await response.json()) as { closet?: Closet; error?: string };

      if (!response.ok || !payload.closet) {
        throw new Error(payload.error ?? "クローゼットの作成に失敗しました");
      }

      setClosets((current) => [payload.closet as Closet, ...current]);
      setSelectedClosetId(payload.closet.id);
      setClosetName("");
      setScreenMessage("クローゼットを作成しました。");
    } catch (error) {
      setScreenError(error instanceof Error ? error.message : "クローゼットの作成に失敗しました");
    }
  }

  function toggleSeasonTag(tag: string) {
    setItemForm((current) => ({
      ...current,
      seasonTags: current.seasonTags.includes(tag)
        ? current.seasonTags.filter((value) => value !== tag)
        : [...current.seasonTags, tag],
    }));
  }

  function toggleOutfitItem(itemId: string) {
    setSelectedOutfitItemIds((current) =>
      current.includes(itemId) ? current.filter((value) => value !== itemId) : [...current, itemId],
    );
  }

  function openItemEditor(itemId: string) {
    setSelectedItemId(itemId);
    setEditMode(true);

    if (typeof window !== "undefined") {
      window.setTimeout(() => {
        document.getElementById("detail")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 0);
    }
  }

  function renderItemCard(item: Item, options?: { showEdit?: boolean }) {
    const isSelected = selectedOutfitItemIds.includes(item.id);

    return (
      <article className={`visual-card ${isSelected ? "is-selected" : ""}`} key={item.id}>
        <div className="visual-card-media">
          {item.primary_image_url ? (
            <img alt={item.name} className="visual-card-image" src={item.primary_image_url} />
          ) : (
            <div className="visual-card-fallback">{item.category}</div>
          )}
        </div>
        <div className="visual-card-body">
          <div className="item-card-head">
            <strong>{item.name}</strong>
            <span className={statusClassName(item.status)}>{item.status}</span>
          </div>
          <p className="meta">
            {item.brand || "No brand"} / {item.color || "No color"}
          </p>
          <p className="meta">{formatCurrency(item.purchase_price)}</p>
          <div className="actions compact-actions">
            {options?.showEdit ? (
              <button className="button" onClick={() => openItemEditor(item.id)} type="button">
                編集
              </button>
            ) : null}
            <button className={`button ${isSelected ? "primary" : ""}`} onClick={() => toggleOutfitItem(item.id)} type="button">
              {isSelected ? "コーデから外す" : "コーデに追加"}
            </button>
          </div>
        </div>
      </article>
    );
  }

  function handleOutfitPiecePointerDown(itemId: string, event: ReactPointerEvent<HTMLDivElement>) {
    const board = boardRef.current;

    if (!board) {
      return;
    }

    const pieceRect = event.currentTarget.getBoundingClientRect();
    dragRef.current = {
      itemId,
      offsetX: event.clientX - pieceRect.left,
      offsetY: event.clientY - pieceRect.top,
      pieceWidth: pieceRect.width,
      pieceHeight: pieceRect.height,
    };

    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleOutfitPiecePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const board = boardRef.current;
    const drag = dragRef.current;

    if (!board || !drag) {
      return;
    }

    const boardRect = board.getBoundingClientRect();
    const nextLeftPx = event.clientX - boardRect.left - drag.offsetX + drag.pieceWidth / 2;
    const nextTopPx = event.clientY - boardRect.top - drag.offsetY;
    const clampedLeft = Math.min(Math.max(nextLeftPx, drag.pieceWidth / 2), boardRect.width - drag.pieceWidth / 2);
    const clampedTop = Math.min(Math.max(nextTopPx, 0), boardRect.height - drag.pieceHeight);

    setOutfitLayout((current) => ({
      ...current,
      [drag.itemId]: {
        ...(current[drag.itemId] ?? getOutfitPlacement("other")),
        left: (clampedLeft / boardRect.width) * 100,
        top: (clampedTop / boardRect.height) * 100,
      },
    }));
  }

  function handleOutfitPiecePointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    dragRef.current = null;
  }

  async function handleFileChange(file: File | null) {
    setSelectedFile(file);
    setAnalysis(null);

    if (!file) {
      setImagePreviewUrl(null);
      setSelectedImageDataUrl(null);
      return;
    }

    const dataUrl = await readFileAsDataUrl(file);
    setImagePreviewUrl(dataUrl);
    setSelectedImageDataUrl(dataUrl);
  }

  async function handleEditFileChange(file: File | null) {
    setEditSelectedFile(file);

    if (!file) {
      setEditSelectedImageDataUrl(null);
      setEditImagePreviewUrl(selectedItemDetail?.primary_image_url ?? null);
      return;
    }

    const dataUrl = await readFileAsDataUrl(file);
    setEditSelectedImageDataUrl(dataUrl);
    setEditImagePreviewUrl(dataUrl);
  }

  async function uploadItemImage() {
    if (!selectedImageDataUrl || !selectedFile) {
      return null;
    }

    setIsUploading(true);

    try {
      const response = await authorizedFetch("/api/items/upload-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image_data_url: selectedImageDataUrl,
          filename: selectedFile.name,
        }),
      });
      const payload = (await response.json()) as { public_url?: string; error?: string };

      if (!response.ok || !payload.public_url) {
        throw new Error(payload.error ?? "画像アップロードに失敗しました");
      }

      return payload.public_url;
    } finally {
      setIsUploading(false);
    }
  }

  async function uploadReplacementImage() {
    if (!editSelectedImageDataUrl || !editSelectedFile) {
      return null;
    }

    setIsUploading(true);

    try {
      const response = await authorizedFetch("/api/items/upload-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image_data_url: editSelectedImageDataUrl,
          filename: editSelectedFile.name,
        }),
      });
      const payload = (await response.json()) as { public_url?: string; error?: string };

      if (!response.ok || !payload.public_url) {
        throw new Error(payload.error ?? "画像差し替えアップロードに失敗しました");
      }

      return payload.public_url;
    } finally {
      setIsUploading(false);
    }
  }

  async function handleAnalyzeImage() {
    if (!selectedImageDataUrl) {
      setScreenError("先に画像を選択してください。");
      return;
    }

    setIsAnalyzing(true);
    setScreenError(null);
    setScreenMessage(null);

    try {
      const response = await authorizedFetch("/api/items/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image_data_url: selectedImageDataUrl,
          filename: selectedFile?.name,
        }),
      });
      const payload = (await response.json()) as { analysis?: ItemAnalysis; error?: string };

      if (!response.ok || !payload.analysis) {
        throw new Error(payload.error ?? "AI解析に失敗しました");
      }

      setAnalysis(payload.analysis);
      setItemForm((current) => ({
        ...current,
        name: payload.analysis?.name ?? current.name,
        category: payload.analysis?.category ?? current.category,
        brand: payload.analysis?.brand ?? current.brand,
        color: payload.analysis?.color ?? current.color,
        status: payload.analysis?.status ?? current.status,
        notes: payload.analysis?.notes ?? current.notes,
        seasonTags: payload.analysis?.season_tags?.length ? payload.analysis.season_tags : current.seasonTags,
      }));
      setScreenMessage("AI候補をフォームに反映しました。必要ならそのまま手で直してください。");
    } catch (error) {
      setScreenError(error instanceof Error ? error.message : "AI解析に失敗しました");
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function handleCreateItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setScreenError(null);
    setScreenMessage(null);
    setIsSubmitting(true);

    try {
      let primaryImageUrl: string | null = null;

      if (selectedFile && selectedImageDataUrl) {
        primaryImageUrl = await uploadItemImage();
      }

      const response = await authorizedFetch("/api/items", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: itemForm.name,
          category: itemForm.category,
          brand: itemForm.brand || undefined,
          color: itemForm.color || undefined,
          status: itemForm.status,
          season_tags: itemForm.seasonTags,
          notes: itemForm.notes || undefined,
          purchase_price: itemForm.purchasePrice ? Number(itemForm.purchasePrice) : undefined,
          primary_image_url: primaryImageUrl ?? undefined,
        }),
      });
      const payload = (await response.json()) as { item?: Item; error?: string };

      if (!response.ok || !payload.item) {
        throw new Error(payload.error ?? "アイテムの保存に失敗しました");
      }

      setItems((current) => [payload.item as Item, ...current]);
      setItemForm(initialItemForm);
      setSelectedFile(null);
      setSelectedImageDataUrl(null);
      setImagePreviewUrl(null);
      setAnalysis(null);
      setScreenMessage("アイテムを追加しました。");
    } catch (error) {
      setScreenError(error instanceof Error ? error.message : "アイテムの保存に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCreateOutfit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setScreenError(null);
    setScreenMessage(null);

    if (!selectedOutfitItemIds.length) {
      setScreenError("コーデに入れるアイテムを1点以上選んでください。");
      return;
    }

    try {
      const response = await authorizedFetch("/api/outfits", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: outfitName || "New Outfit",
          item_ids: selectedOutfitItemIds,
          notes: outfitNotes || undefined,
        }),
      });
      const payload = (await response.json()) as {
        outfit?: Outfit;
        outfit_items?: OutfitItem[];
        error?: string;
      };

      if (!response.ok || !payload.outfit) {
        throw new Error(payload.error ?? "コーデの保存に失敗しました");
      }

      const nextOutfit: Outfit = {
        ...(payload.outfit as Outfit),
        outfit_items: payload.outfit_items ?? [],
      };

      setOutfits((current) => [nextOutfit, ...current]);
      setOutfitName("");
      setOutfitNotes("");
      setSelectedOutfitItemIds([]);
      setScreenMessage("コーデを保存しました。");
    } catch (error) {
      setScreenError(error instanceof Error ? error.message : "コーデの保存に失敗しました");
    }
  }

  async function handleCreateWearLog(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setScreenError(null);
    setScreenMessage(null);

    if (!selectedOutfitItemIds.length) {
      setScreenError("着用記録に入れるアイテムを選択してください。");
      return;
    }

    try {
      const response = await authorizedFetch("/api/wear-logs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          worn_on: wearDate,
          item_ids: selectedOutfitItemIds,
          notes: wearNotes || undefined,
        }),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "着用記録の保存に失敗しました");
      }

      if (session && selectedClosetId) {
        await Promise.all([loadItems(session, selectedClosetId), loadWearLogs(session, selectedClosetId)]);
      }

      setWearNotes("");
      setScreenMessage("着用記録を保存しました。");
    } catch (error) {
      setScreenError(error instanceof Error ? error.message : "着用記録の保存に失敗しました");
    }
  }

  async function handleCreateCareLog(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setScreenError(null);
    setScreenMessage(null);

    if (!careItemId) {
      setScreenError("ケア対象のアイテムを選択してください。");
      return;
    }

    try {
      const response = await authorizedFetch("/api/care-logs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          item_id: careItemId,
          care_type: careType,
          status: careStatus,
          cared_on: careDate,
          cost: careCost ? Number(careCost) : undefined,
          vendor_name: careVendor || undefined,
          notes: careNotes || undefined,
        }),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "ケア記録の保存に失敗しました");
      }

      if (session && selectedClosetId) {
        await Promise.all([loadItems(session, selectedClosetId), loadCareLogs(session, selectedClosetId)]);
      }

      if (selectedItemId === careItemId) {
        await loadItemDetail(careItemId);
      }

      setCareCost("");
      setCareVendor("");
      setCareNotes("");
      setScreenMessage("ケア記録を保存しました。");
    } catch (error) {
      setScreenError(error instanceof Error ? error.message : "ケア記録の保存に失敗しました");
    }
  }

  async function handleUpdateItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedItemId) {
      return;
    }

    setScreenError(null);
    setScreenMessage(null);

    try {
      let replacementImageUrl: string | null = null;

      if (editSelectedFile && editSelectedImageDataUrl) {
        replacementImageUrl = await uploadReplacementImage();
      }

      const response = await authorizedFetch(`/api/items/${selectedItemId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: itemEditForm.name,
          category: itemEditForm.category,
          brand: itemEditForm.brand || undefined,
          color: itemEditForm.color || undefined,
          status: itemEditForm.status,
          season_tags: itemEditForm.seasonTags,
          notes: itemEditForm.notes || undefined,
          purchase_price: itemEditForm.purchasePrice ? Number(itemEditForm.purchasePrice) : undefined,
          primary_image_url: replacementImageUrl ?? undefined,
        }),
      });
      const payload = (await response.json()) as { item?: Item; error?: string };

      if (!response.ok || !payload.item) {
        throw new Error(payload.error ?? "アイテム更新に失敗しました");
      }

      setItems((current) => current.map((item) => (item.id === payload.item?.id ? (payload.item as Item) : item)));
      await loadItemDetail(selectedItemId);
      setEditMode(false);
      setEditSelectedFile(null);
      setEditSelectedImageDataUrl(null);
      setScreenMessage("アイテムを更新しました。");
    } catch (error) {
      setScreenError(error instanceof Error ? error.message : "アイテム更新に失敗しました");
    }
  }

  async function handleDisposeItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedItemId) {
      return;
    }

    setScreenError(null);
    setScreenMessage(null);

    try {
      const response = await authorizedFetch(`/api/items/${selectedItemId}/dispose`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          disposed_on: disposalDate,
          disposal_type: disposalType,
          recovered_amount: disposalAmount ? Number(disposalAmount) : undefined,
          reason: disposalReason || undefined,
        }),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "手放し処理に失敗しました");
      }

      if (session && selectedClosetId) {
        await loadItems(session, selectedClosetId);
      }

      await loadItemDetail(selectedItemId);
      setScreenMessage("アイテムを手放し済みにしました。");
    } catch (error) {
      setScreenError(error instanceof Error ? error.message : "手放し処理に失敗しました");
    }
  }

  async function handleCreateTag(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setScreenError(null);

    try {
      const response = await authorizedFetch("/api/tags", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: tagName,
          color: tagColor || undefined,
        }),
      });
      const payload = (await response.json()) as { tag?: Tag; error?: string };

      if (!response.ok || !payload.tag) {
        throw new Error(payload.error ?? "タグ作成に失敗しました");
      }

      setTags((current) => [...current, payload.tag as Tag]);
      setTagName("");
      setTagColor("");
      setScreenMessage("タグを追加しました。");
    } catch (error) {
      setScreenError(error instanceof Error ? error.message : "タグ作成に失敗しました");
    }
  }

  async function handleCreateLocation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setScreenError(null);

    try {
      const response = await authorizedFetch("/api/locations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: locationName,
          location_type: locationType,
        }),
      });
      const payload = (await response.json()) as { location?: Location; error?: string };

      if (!response.ok || !payload.location) {
        throw new Error(payload.error ?? "保管場所の作成に失敗しました");
      }

      setLocations((current) => [...current, payload.location as Location]);
      setLocationName("");
      setLocationType("closet");
      setScreenMessage("保管場所を追加しました。");
    } catch (error) {
      setScreenError(error instanceof Error ? error.message : "保管場所の作成に失敗しました");
    }
  }

  async function handleCreateSavedFilter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setScreenError(null);

    try {
      const response = await authorizedFetch("/api/saved-filters", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: savedFilterName,
          filter_json: {
            category: filterCategory,
            status: filterStatus,
            color: filterColor,
          },
        }),
      });
      const payload = (await response.json()) as { saved_filter?: SavedFilter; error?: string };

      if (!response.ok || !payload.saved_filter) {
        throw new Error(payload.error ?? "保存フィルタの作成に失敗しました");
      }

      setSavedFilters((current) => [payload.saved_filter as SavedFilter, ...current]);
      setSavedFilterName("");
      setScreenMessage("保存フィルタを追加しました。");
    } catch (error) {
      setScreenError(error instanceof Error ? error.message : "保存フィルタの作成に失敗しました");
    }
  }

  function applySavedFilter(savedFilter: SavedFilter) {
    const filterJson = savedFilter.filter_json;
    setFilterCategory(typeof filterJson.category === "string" ? filterJson.category : "");
    setFilterStatus(typeof filterJson.status === "string" ? filterJson.status : "");
    setFilterColor(typeof filterJson.color === "string" ? filterJson.color : "");
    setScreenMessage(`保存フィルタ「${savedFilter.name}」を適用しました。`);
  }

  if (authLoading) {
    return (
      <main className="shell auth-shell">
        <section className="panel auth-panel">
          <p className="hero-text">セッションを確認しています...</p>
        </section>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="shell auth-shell">
        <section className="panel auth-panel">
          <div className="auth-header">
            <span className="eyebrow">Closet AI</span>
            <h1>服画像を集めて、服だけでコーデを組む。</h1>
            <p className="hero-text">
              先にログインしてください。ログイン後にクローゼット作成、アイテム登録、画像ベースのコーデ作成に進めます。
            </p>
          </div>

          <div className="auth-columns two-column">
            <section className="panel section hero-section">
              <h2>できること</h2>
              <div className="feature-grid">
                <article className="feature">
                  <h3>画像で管理</h3>
                  <p>作成済みの服画像をそのまま登録して、カード一覧で確認できます。</p>
                </article>
                <article className="feature">
                  <h3>服だけでコーデ</h3>
                  <p>人物なしのボード上に服画像を置いて、見た目のまま保存できます。</p>
                </article>
                <article className="feature">
                  <h3>AI解析は任意</h3>
                  <p>必要なときだけ属性候補を出して、手入力を少しだけ軽くできます。</p>
                </article>
              </div>
            </section>

            <section className="panel section">
              <div className="actions compact-actions">
                <button
                  className={`button ${authMode === "signin" ? "primary" : ""}`}
                  onClick={() => setAuthMode("signin")}
                  type="button"
                >
                  ログイン
                </button>
                <button
                  className={`button ${authMode === "signup" ? "primary" : ""}`}
                  onClick={() => setAuthMode("signup")}
                  type="button"
                >
                  新規登録
                </button>
              </div>

              <form className="stack-form" onSubmit={handleAuthSubmit}>
                <label className="field">
                  <span>メールアドレス</span>
                  <input
                    autoComplete="email"
                    onChange={(event) => setEmail(event.target.value)}
                    type="email"
                    value={email}
                  />
                </label>
                <label className="field">
                  <span>パスワード</span>
                  <input
                    autoComplete={authMode === "signup" ? "new-password" : "current-password"}
                    minLength={6}
                    onChange={(event) => setPassword(event.target.value)}
                    type="password"
                    value={password}
                  />
                </label>
                <button className="button primary" type="submit">
                  {authMode === "signup" ? "アカウントを作成" : "ログインする"}
                </button>
              </form>

              {authMessage ? <div className="analysis-result">{authMessage}</div> : null}
              {authError ? <div className="analysis-result error-panel">{authError}</div> : null}
            </section>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="shell">
      <div className="workspace-grid">
        <aside className="panel sidebar">
          <div className="sidebar-block">
            <span className="eyebrow">Closet AI</span>
            <h1 className="sidebar-title">服だけで組むコーデ帳</h1>
            <p className="hero-text">人物なしで、登録済みアイテム画像をそのまま並べて保存します。</p>
          </div>

          <nav className="sidebar-nav">
            <button className={navClassName("/dashboard")} onClick={() => router.push("/dashboard")} type="button">ダッシュボード</button>
            <button className={navClassName("/closets")} onClick={() => router.push("/closets")} type="button">クローゼット</button>
            <button className={navClassName("/items")} onClick={() => router.push("/items")} type="button">アイテム管理</button>
            <button className={navClassName("/outfits")} onClick={() => router.push("/outfits")} type="button">コーデ作成</button>
            <button className={navClassName("/wear-log")} onClick={() => router.push("/wear-log")} type="button">着用ログ</button>
            <button className={navClassName("/care")} onClick={() => router.push("/care")} type="button">ケア管理</button>
            <button className={navClassName("/analytics")} onClick={() => router.push("/analytics")} type="button">分析</button>
          </nav>

          <div className="sidebar-stats">
            <div className="stat">
              <strong>{closets.length}</strong>
              <span>クローゼット</span>
            </div>
            <div className="stat">
              <strong>{items.length}</strong>
              <span>アイテム</span>
            </div>
            <div className="stat">
              <strong>{outfits.length}</strong>
              <span>コーデ</span>
            </div>
          </div>

          <button className="button" onClick={handleSignOut} type="button">
            ログアウト
          </button>
        </aside>

        <div className="workspace-main">
          <section className="hero">
            <article className="panel hero-copy">
              <span className="eyebrow">Graphic Closet</span>
              <h1>服画像を集めて、並べて、保存する。</h1>
              <p>
                先に服画像を登録し、その後にトップス、ボトムス、シューズ、バッグを服だけのボードに配置してコーデを作ります。
              </p>
            </article>

            <article className="panel hero-card">
              <h2>現在の状況</h2>
              <div className="stat-grid">
                <div className="stat">
                  <strong>{selectedCloset?.name ?? "未選択"}</strong>
                  <span>選択中のクローゼット</span>
                </div>
                <div className="stat">
                  <strong>{selectedOutfitItemIds.length}</strong>
                  <span>コーデ候補に追加中</span>
                </div>
                <div className="stat">
                  <strong>{items.filter((item) => item.primary_image_url).length}</strong>
                  <span>画像付きアイテム</span>
                </div>
                <div className="stat">
                  <strong>{outfits.length}</strong>
                  <span>保存済みコーデ</span>
                </div>
              </div>
            </article>
          </section>

          {isRoute("/dashboard") ? (
          <section className="panel section" id="dashboard">
            <div className="kicker">
              <h2>ダッシュボード</h2>
              <span className="meta">今のクローゼット状況を一目で確認します。</span>
            </div>
            <div className="stat-grid">
              <div className="stat">
                <strong>{activeItems.length}</strong>
                <span>すぐ着られる服</span>
              </div>
              <div className="stat">
                <strong>{careQueuedItems.length}</strong>
                <span>ケア中の服</span>
              </div>
              <div className="stat">
                <strong>{unwornItems.length}</strong>
                <span>未着用アイテム</span>
              </div>
              <div className="stat">
                <strong>{formatCurrency(totalSpent)}</strong>
                <span>合計購入額</span>
              </div>
            </div>
          </section>
          ) : null}

          {screenMessage ? (
            <section className="panel section notice-panel">
              <p className="hero-text">{screenMessage}</p>
            </section>
          ) : null}

          {screenError ? (
            <section className="panel section error-panel">
              <p className="hero-text">{screenError}</p>
            </section>
          ) : null}

          {isRoute("/closets") ? (
          <section className="panel section" id="closets">
            <div className="kicker">
              <h2>クローゼット</h2>
              <span className="meta">ユーザーごとに分離された保存先です。</span>
            </div>

            <div className="two-column">
              <form className="stack-form" onSubmit={handleCreateCloset}>
                <label className="field">
                  <span>新しいクローゼット名</span>
                  <input
                    onChange={(event) => setClosetName(event.target.value)}
                    placeholder="Main Closet"
                    value={closetName}
                  />
                </label>
                <button className="button primary" type="submit">
                  クローゼットを作成
                </button>
              </form>

              <div className="stack-list">
                {closets.length ? (
                  closets.map((closet) => (
                    <button
                      className={`select-card ${selectedClosetId === closet.id ? "is-active" : ""}`}
                      key={closet.id}
                      onClick={() => setSelectedClosetId(closet.id)}
                      type="button"
                    >
                      <strong>{closet.name}</strong>
                      <span>
                        {closet.currency} / {closet.timezone}
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="analysis-result">まだクローゼットがありません。先に1つ作成してください。</div>
                )}
              </div>
            </div>
          </section>
          ) : null}

          {isRoute("/closets") ? (
          <section className="panel section" id="filters">
            <div className="kicker">
              <h2>検索と保存フィルタ</h2>
              <span className="meta">カテゴリ、状態、色で絞り込み、条件を保存できます。</span>
            </div>
            <div className="two-column">
              <div className="stack-form">
                <label className="field">
                  <span>カテゴリ</span>
                  <select onChange={(event) => setFilterCategory(event.target.value)} value={filterCategory}>
                    <option value="">すべて</option>
                    {categoryOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>状態</span>
                  <select onChange={(event) => setFilterStatus(event.target.value)} value={filterStatus}>
                    <option value="">すべて</option>
                    {statusOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>色</span>
                  <select onChange={(event) => setFilterColor(event.target.value)} value={filterColor}>
                    <option value="">すべて</option>
                    {colorOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="actions compact-actions">
                  <button className="button" onClick={() => {
                    setFilterCategory("");
                    setFilterStatus("");
                    setFilterColor("");
                  }} type="button">
                    クリア
                  </button>
                </div>
              </div>

              <div className="stack-form">
                <form className="stack-form" onSubmit={handleCreateSavedFilter}>
                  <label className="field">
                    <span>保存フィルタ名</span>
                    <input onChange={(event) => setSavedFilterName(event.target.value)} value={savedFilterName} />
                  </label>
                  <button className="button primary" type="submit">
                    条件を保存
                  </button>
                </form>

                <div className="saved-outfits">
                  {savedFilters.map((savedFilter) => (
                    <button className="saved-outfit-card" key={savedFilter.id} onClick={() => applySavedFilter(savedFilter)} type="button">
                      <strong>{savedFilter.name}</strong>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>
          ) : null}

          {isRoute("/closets") ? (
          <section className="panel section" id="masters">
            <div className="kicker">
              <h2>タグと保管場所</h2>
              <span className="meta">クローゼット内の補助データを先に整えておけます。</span>
            </div>
            <div className="two-column">
              <div className="stack-form">
                <form className="stack-form" onSubmit={handleCreateTag}>
                  <label className="field">
                    <span>タグ名</span>
                    <input onChange={(event) => setTagName(event.target.value)} value={tagName} />
                  </label>
                  <label className="field">
                    <span>色</span>
                    <input onChange={(event) => setTagColor(event.target.value)} value={tagColor} />
                  </label>
                  <button className="button primary" type="submit">
                    タグを追加
                  </button>
                </form>
                <div className="saved-outfits">
                  {tags.map((tag) => (
                    <article className="saved-outfit-card" key={tag.id}>
                      <strong>{tag.name}</strong>
                      <p className="meta">{tag.color || "color unset"}</p>
                    </article>
                  ))}
                </div>
              </div>

              <div className="stack-form">
                <form className="stack-form" onSubmit={handleCreateLocation}>
                  <label className="field">
                    <span>保管場所名</span>
                    <input onChange={(event) => setLocationName(event.target.value)} value={locationName} />
                  </label>
                  <label className="field">
                    <span>種別</span>
                    <select onChange={(event) => setLocationType(event.target.value)} value={locationType}>
                      <option value="closet">closet</option>
                      <option value="drawer">drawer</option>
                      <option value="rack">rack</option>
                      <option value="box">box</option>
                      <option value="other">other</option>
                    </select>
                  </label>
                  <button className="button primary" type="submit">
                    保管場所を追加
                  </button>
                </form>
                <div className="saved-outfits">
                  {locations.map((location) => (
                    <article className="saved-outfit-card" key={location.id}>
                      <strong>{location.name}</strong>
                      <p className="meta">{location.location_type}</p>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          </section>
          ) : null}

          {isRoute("/items") ? (
          <section className="panel section" id="items">
            <div className="kicker">
              <h2>アイテム登録</h2>
              <span className="meta">画像は外部で作成したものをそのまま登録できます。</span>
            </div>

            <form className="stack-form" onSubmit={handleCreateItem}>
              <div className="item-form-grid">
                <label className="field">
                  <span>画像</span>
                  <input
                    accept="image/*"
                    onChange={(event) => {
                      const file = event.target.files?.[0] ?? null;
                      void handleFileChange(file);
                    }}
                    type="file"
                  />
                </label>
                <label className="field">
                  <span>名前</span>
                  <input
                    onChange={(event) => setItemForm((current) => ({ ...current, name: event.target.value }))}
                    placeholder="Black Wool Coat"
                    value={itemForm.name}
                  />
                </label>
                <label className="field">
                  <span>カテゴリ</span>
                  <select
                    onChange={(event) => setItemForm((current) => ({ ...current, category: event.target.value }))}
                    value={itemForm.category}
                  >
                    {categoryOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>状態</span>
                  <select
                    onChange={(event) => setItemForm((current) => ({ ...current, status: event.target.value }))}
                    value={itemForm.status}
                  >
                    {statusOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>ブランド</span>
                  <input
                    onChange={(event) => setItemForm((current) => ({ ...current, brand: event.target.value }))}
                    value={itemForm.brand}
                  />
                </label>
                <label className="field">
                  <span>色</span>
                  <select
                    onChange={(event) => setItemForm((current) => ({ ...current, color: event.target.value }))}
                    value={itemForm.color}
                  >
                    <option value="">選択してください</option>
                    {colorOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>価格</span>
                  <input
                    inputMode="numeric"
                    onChange={(event) => setItemForm((current) => ({ ...current, purchasePrice: event.target.value }))}
                    placeholder="12900"
                    value={itemForm.purchasePrice}
                  />
                </label>
                <div className="field action-cell">
                  <span>補助</span>
                  <div className="actions compact-actions">
                    <button
                      className="button"
                      disabled={!selectedImageDataUrl || isAnalyzing}
                      onClick={handleAnalyzeImage}
                      type="button"
                    >
                      {isAnalyzing ? "解析中..." : "AIで補助入力"}
                    </button>
                    <button className="button primary" disabled={!selectedClosetId || isSubmitting || isUploading} type="submit">
                      {isSubmitting || isUploading ? "保存中..." : "アイテムを追加"}
                    </button>
                  </div>
                </div>
                <label className="field item-notes-field">
                  <span>メモ</span>
                  <input
                    onChange={(event) => setItemForm((current) => ({ ...current, notes: event.target.value }))}
                    value={itemForm.notes}
                  />
                </label>
              </div>

              <div className="actions compact-actions">
                {seasonOptions.map((tag) => (
                  <button
                    className={`button ${itemForm.seasonTags.includes(tag) ? "primary" : ""}`}
                    key={tag}
                    onClick={() => toggleSeasonTag(tag)}
                    type="button"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </form>

            <div className="two-column">
              <div className="stack-form">
                <h3>プレビュー</h3>
                {imagePreviewUrl ? (
                  <img alt="preview" className="analysis-preview" src={imagePreviewUrl} />
                ) : (
                  <div className="analysis-result">画像を選択するとここに表示されます。</div>
                )}
                {analysis ? (
                  <div className="analysis-result">
                    <strong>AI候補</strong>
                    <p className="hero-text">
                      {analysis.name} / {analysis.category} / 信頼度 {Math.round(analysis.confidence * 100)}%
                    </p>
                  </div>
                ) : null}
              </div>

              <div className="stack-form">
                <h3>登録の考え方</h3>
                <ul className="list">
                  <li>人物画像ではなく、服単体の画像を基本にします。</li>
                  <li>背景は透明か薄い無地の方がコーデボードで見やすくなります。</li>
                  <li>カテゴリと季節だけは先に入れておくと後の絞り込みが楽です。</li>
                </ul>
              </div>
            </div>
          </section>
          ) : null}

          {isRoute("/items") ? (
          <section className="panel section" id="gallery">
            <div className="kicker">
              <h2>アイテム一覧</h2>
              <span className="meta">コーデに使いたい服を下のカードから選びます。</span>
            </div>

            {groupedFilteredItems.length ? (
              <div className="category-sections">
                {groupedFilteredItems.map((group) => (
                  <section className="category-section" key={group.category}>
                    <div className="kicker">
                      <h3>{categoryLabels[group.category] ?? group.category}</h3>
                      <span className="meta">{group.items.length} items</span>
                    </div>
                    <div className="visual-grid">
                      {group.items.map((item) => renderItemCard(item, { showEdit: true }))}
                    </div>
                  </section>
                ))}
              </div>
            ) : (
              <div className="analysis-result empty-state">条件に合うアイテムがありません。</div>
            )}
          </section>
          ) : null}

          {isRoute("/items") ? (
          <section className="panel section" id="detail">
            <div className="kicker">
              <h2>アイテム詳細</h2>
              <span className="meta">一覧から 1 件選んで、詳細確認と編集、手放す処理を行います。</span>
            </div>
            <div className="two-column">
              <div className="stack-list">
                {items.map((item) => (
                  <button
                    className={`select-card ${selectedItemId === item.id ? "is-active" : ""}`}
                    key={item.id}
                    onClick={() => setSelectedItemId(item.id)}
                    type="button"
                  >
                    <strong>{item.name}</strong>
                    <span>
                      {item.category} / {formatCurrency(item.purchase_price)}
                    </span>
                  </button>
                ))}
              </div>

              <div className="stack-form">
                {isDetailLoading ? (
                  <div className="analysis-result">読み込み中...</div>
                ) : selectedItemDetail ? (
                  <>
                    <div className="item-card">
                      {selectedItemDetail.primary_image_url ? (
                        <img
                          alt={selectedItemDetail.name}
                          className="analysis-preview"
                          src={selectedItemDetail.primary_image_url}
                        />
                      ) : null}
                      <div className="item-card-head">
                        <strong>{selectedItemDetail.name}</strong>
                        <span className={statusClassName(selectedItemDetail.status)}>{selectedItemDetail.status}</span>
                      </div>
                      <p className="meta">
                        {selectedItemDetail.category} / {selectedItemDetail.brand || "No brand"} / {selectedItemDetail.color || "No color"}
                      </p>
                      <p className="meta">
                        着用回数 {selectedItemDetail.wear_count} / 最終着用{" "}
                        {selectedItemDetail.last_worn_at || "未記録"}
                      </p>
                    </div>

                    <div className="actions compact-actions">
                      <button className={`button ${editMode ? "primary" : ""}`} onClick={() => setEditMode((current) => !current)} type="button">
                        {editMode ? "編集を閉じる" : "編集する"}
                      </button>
                    </div>

                    {editMode ? (
                      <form className="stack-form" onSubmit={handleUpdateItem}>
                        <label className="field">
                          <span>差し替え画像</span>
                          <input
                            accept="image/*"
                            onChange={(event) => {
                              const file = event.target.files?.[0] ?? null;
                              void handleEditFileChange(file);
                            }}
                            type="file"
                          />
                        </label>
                        {editImagePreviewUrl ? (
                          <img alt="replacement preview" className="analysis-preview" src={editImagePreviewUrl} />
                        ) : null}
                        <label className="field">
                          <span>名前</span>
                          <input
                            onChange={(event) => setItemEditForm((current) => ({ ...current, name: event.target.value }))}
                            value={itemEditForm.name}
                          />
                        </label>
                        <label className="field">
                          <span>カテゴリ</span>
                          <select
                            onChange={(event) => setItemEditForm((current) => ({ ...current, category: event.target.value }))}
                            value={itemEditForm.category}
                          >
                            {categoryOptions.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="field">
                          <span>ブランド</span>
                          <input
                            onChange={(event) => setItemEditForm((current) => ({ ...current, brand: event.target.value }))}
                            value={itemEditForm.brand}
                          />
                        </label>
                        <label className="field">
                          <span>色</span>
                          <select
                            onChange={(event) => setItemEditForm((current) => ({ ...current, color: event.target.value }))}
                            value={itemEditForm.color}
                          >
                            <option value="">選択してください</option>
                            {colorOptions.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="field">
                          <span>状態</span>
                          <select
                            onChange={(event) => setItemEditForm((current) => ({ ...current, status: event.target.value }))}
                            value={itemEditForm.status}
                          >
                            {statusOptions.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="field">
                          <span>価格</span>
                          <input
                            inputMode="numeric"
                            onChange={(event) => setItemEditForm((current) => ({ ...current, purchasePrice: event.target.value }))}
                            value={itemEditForm.purchasePrice}
                          />
                        </label>
                        <label className="field">
                          <span>メモ</span>
                          <input
                            onChange={(event) => setItemEditForm((current) => ({ ...current, notes: event.target.value }))}
                            value={itemEditForm.notes}
                          />
                        </label>
                        <button className="button primary" type="submit">
                          更新する
                        </button>
                      </form>
                    ) : null}

                    <form className="stack-form" onSubmit={handleDisposeItem}>
                      <h3>手放す</h3>
                      <label className="field">
                        <span>日付</span>
                        <input onChange={(event) => setDisposalDate(event.target.value)} type="date" value={disposalDate} />
                      </label>
                      <label className="field">
                        <span>方法</span>
                        <select onChange={(event) => setDisposalType(event.target.value)} value={disposalType}>
                          <option value="sold">sold</option>
                          <option value="donated">donated</option>
                          <option value="discarded">discarded</option>
                          <option value="gifted">gifted</option>
                        </select>
                      </label>
                      <label className="field">
                        <span>理由</span>
                        <input onChange={(event) => setDisposalReason(event.target.value)} value={disposalReason} />
                      </label>
                      <label className="field">
                        <span>回収額</span>
                        <input inputMode="numeric" onChange={(event) => setDisposalAmount(event.target.value)} value={disposalAmount} />
                      </label>
                      <button className="button" type="submit">
                        手放し済みにする
                      </button>
                    </form>
                  </>
                ) : (
                  <div className="analysis-result">左側のアイテムを選ぶと詳細が表示されます。</div>
                )}
              </div>
            </div>
          </section>
          ) : null}

          {isRoute("/outfits") ? (
          <section className="panel section" id="outfits">
            <div className="kicker">
              <h2>コーデ作成</h2>
              <span className="meta">人物なしで、服画像だけをキャンバスに置いて保存します。</span>
            </div>

              <div className="outfit-columns">
                <div className="outfit-board" ref={boardRef}>
                  {selectedOutfitItems.length ? (
                    selectedOutfitItems.map((item) => {
                      const placement = outfitLayout[item.id] ?? getOutfitPlacement(item.category);

                      return (
                        <div
                          className="outfit-piece"
                          key={item.id}
                          onPointerDown={(event) => handleOutfitPiecePointerDown(item.id, event)}
                          onPointerMove={handleOutfitPiecePointerMove}
                          onPointerUp={handleOutfitPiecePointerUp}
                          onPointerCancel={handleOutfitPiecePointerUp}
                          style={{
                            top: `${placement.top}%`,
                            left: `${placement.left}%`,
                            width: `${placement.width}%`,
                            transform: "translateX(-50%)",
                          }}
                        >
                          {item.primary_image_url ? (
                            <img alt={item.name} className="outfit-piece-image" src={item.primary_image_url} />
                          ) : (
                          <div className="outfit-piece-fallback">{item.name}</div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="outfit-board-empty">
                    アイテム一覧から服を追加すると、ここでコーデの見た目を確認できます。
                  </div>
                )}
              </div>

              <div className="stack-form">
                <form className="stack-form" onSubmit={handleCreateOutfit}>
                  <label className="field">
                    <span>コーデ名</span>
                    <input
                      onChange={(event) => setOutfitName(event.target.value)}
                      placeholder="Office Monochrome"
                      value={outfitName}
                    />
                  </label>
                  <label className="field">
                    <span>メモ</span>
                    <input
                      onChange={(event) => setOutfitNotes(event.target.value)}
                      placeholder="打ち合わせ用、軽めの雨の日"
                      value={outfitNotes}
                    />
                  </label>
                  <button className="button primary" type="submit">
                    このコーデを保存
                  </button>
                </form>

                <div className="analysis-result">
                  <strong>選択中のアイテム</strong>
                  <p className="hero-text">{selectedOutfitItems.map((item) => item.name).join(" / ") || "まだ選択されていません。"}</p>
                </div>

                <div className="saved-outfits">
                  {outfits.map((outfit) => (
                    <article className="saved-outfit-card" key={outfit.id}>
                      <strong>{outfit.name}</strong>
                      <p className="meta">
                        {outfit.outfit_items.length} items
                        {outfit.notes ? ` / ${outfit.notes}` : ""}
                      </p>
                    </article>
                  ))}
                </div>
              </div>
            </div>

            <div className="category-sections">
              {groupedClosetItems.map((group) => (
                <section className="category-section" key={`outfit-${group.category}`}>
                  <div className="kicker">
                    <h3>{categoryLabels[group.category] ?? group.category}</h3>
                    <span className="meta">クローゼット内 {group.items.length} 点</span>
                  </div>
                  <div className="visual-grid">
                    {group.items.map((item) => renderItemCard(item))}
                  </div>
                </section>
              ))}
            </div>
          </section>
          ) : null}

          {isRoute("/wear-log") ? (
          <section className="panel section" id="wear-log">
            <div className="kicker">
              <h2>着用ログ</h2>
              <span className="meta">選択中のコーデ候補をそのまま着用記録にできます。</span>
            </div>
            <div className="two-column">
              <form className="stack-form" onSubmit={handleCreateWearLog}>
                <label className="field">
                  <span>着用日</span>
                  <input onChange={(event) => setWearDate(event.target.value)} type="date" value={wearDate} />
                </label>
                <label className="field">
                  <span>メモ</span>
                  <input onChange={(event) => setWearNotes(event.target.value)} value={wearNotes} />
                </label>
                <button className="button primary" type="submit">
                  着用記録を追加
                </button>
              </form>

              <div className="stack-list">
                {wearLogs.slice(0, 8).map((wearLog) => (
                  <article className="item-card" key={wearLog.id}>
                    <div className="item-card-head">
                      <strong>{wearLog.worn_on}</strong>
                      <span>{wearLog.wear_log_items.length} items</span>
                    </div>
                    <p className="meta">{wearLog.notes || "メモなし"}</p>
                  </article>
                ))}
              </div>
            </div>
          </section>
          ) : null}

          {isRoute("/care") ? (
          <section className="panel section" id="care">
            <div className="kicker">
              <h2>ケア管理</h2>
              <span className="meta">洗濯、クリーニング、修理を記録します。</span>
            </div>
            <div className="two-column">
              <form className="stack-form" onSubmit={handleCreateCareLog}>
                <label className="field">
                  <span>対象アイテム</span>
                  <select onChange={(event) => setCareItemId(event.target.value)} value={careItemId}>
                    <option value="">選択してください</option>
                    {items.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>ケア種別</span>
                  <select onChange={(event) => setCareType(event.target.value)} value={careType}>
                    <option value="wash">wash</option>
                    <option value="dry_clean">dry_clean</option>
                    <option value="repair">repair</option>
                    <option value="brushing">brushing</option>
                    <option value="airing">airing</option>
                  </select>
                </label>
                <label className="field">
                  <span>状態</span>
                  <select onChange={(event) => setCareStatus(event.target.value)} value={careStatus}>
                    <option value="queued">queued</option>
                    <option value="in_progress">in_progress</option>
                    <option value="done">done</option>
                  </select>
                </label>
                <label className="field">
                  <span>日付</span>
                  <input onChange={(event) => setCareDate(event.target.value)} type="date" value={careDate} />
                </label>
                <label className="field">
                  <span>費用</span>
                  <input inputMode="numeric" onChange={(event) => setCareCost(event.target.value)} value={careCost} />
                </label>
                <label className="field">
                  <span>業者</span>
                  <input onChange={(event) => setCareVendor(event.target.value)} value={careVendor} />
                </label>
                <label className="field">
                  <span>メモ</span>
                  <input onChange={(event) => setCareNotes(event.target.value)} value={careNotes} />
                </label>
                <button className="button primary" type="submit">
                  ケア記録を追加
                </button>
              </form>

              <div className="stack-list">
                {careLogs.slice(0, 8).map((careLog) => (
                  <article className="item-card" key={careLog.id}>
                    <div className="item-card-head">
                      <strong>{careLog.cared_on}</strong>
                      <span>{careLog.care_type}</span>
                    </div>
                    <p className="meta">
                      {careLog.status} / {careLog.vendor_name || "self"} / {formatCurrency(careLog.cost)}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          </section>
          ) : null}

          {isRoute("/analytics") ? (
          <section className="panel section" id="analytics">
            <div className="kicker">
              <h2>分析</h2>
              <span className="meta">金額、未着用、コーデ数の偏りを簡易表示します。</span>
            </div>
            <div className="two-column">
              <div className="stack-list">
                <article className="item-card">
                  <div className="item-card-head">
                    <strong>高額アイテム</strong>
                    <span>{expensiveItems.length}件</span>
                  </div>
                  {expensiveItems.map((item) => (
                    <p className="meta" key={item.id}>
                      {item.name} / {formatCurrency(item.purchase_price)}
                    </p>
                  ))}
                </article>
              </div>
              <div className="stack-list">
                <article className="item-card">
                  <div className="item-card-head">
                    <strong>コスト効率の低い候補</strong>
                    <span>{unwornItems.length}件</span>
                  </div>
                  {unwornItems.slice(0, 6).map((item) => (
                    <p className="meta" key={item.id}>
                      {item.name} / {formatCurrency(item.purchase_price)}
                    </p>
                  ))}
                </article>
              </div>
            </div>
          </section>
          ) : null}
        </div>
      </div>
    </main>
  );
}
