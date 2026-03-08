"use client";

import { Camera, ImageIcon, List, ShoppingCart, Package, BarChart2, Plus, Minus, ChevronLeft, ChevronRight } from "lucide-react";
import {
  FormEvent,
  startTransition,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { snackCategoryLabels, snackCategoryOptions, snackCategoryEmojis } from "@/lib/category";

type Snack = {
  id: string;
  name: string;
  category: keyof typeof snackCategoryLabels;
  unit: string;
  packageSize: number;
  minStockLevel: number;
  currentStock: number;
  allergenNote: string | null;
  expirationDate: string | null;
  createdAt: string;
};

type ServingLog = {
  id: string;
  servings: number;
  childrenCount: number | null;
  servedDate: string;
  memo: string | null;
  snack: Snack;
};

type OrderBatch = {
  id: string;
  orderedDate: string;
  supplierName: string | null;
  requestedBy: string | null;
  status: string;
  memo: string | null;
  totalUnits: number;
  totalCost: number;
  items: Array<{
    id: string;
    quantity: number;
    unitPrice: number | null;
    snack: Snack;
  }>;
};

type Recommendation = {
  snackId: string;
  snackName: string;
  currentStock: number;
  minStockLevel: number;
  unit: string;
  recentServings: number;
  suggestedQty: number;
};

type OrderDraftItem = {
  id: string;
  snackId: string;
  quantity: number;
  unitPrice: string;
};

type Analytics = {
  period: "week" | "month";
  range: { label: string; start: string; end: string };
  summary: {
    totalServings: number;
    averageServingsPerDay: number;
    avgChildren: number;
    totalOrderedUnits: number;
    totalOrderCost: number;
    servingDays: number;
    uniqueSnackCount: number;
  };
  topSnacks: Array<{
    snackId: string;
    snackName: string;
    category: keyof typeof snackCategoryLabels;
    servings: number;
    logCount: number;
  }>;
  categoryBreakdown: Array<{ category: string; servings: number }>;
  dailyBreakdown: Array<{ date: string; servings: number }>;
};

type PredictionItem = {
  prediction: {
    name: string;
    category: keyof typeof snackCategoryLabels;
    confidence: number;
    provider: string;
    expirationDate?: string;
    ingredients?: string;
    allergens_major?: string[];
    contamination_info?: string;
    nutrition_info?: {
      weight?: number;
      calories?: number;
    };
  };
  matchedSnack?: {
    id: string;
    name: string;
    currentStock: number;
    minStockLevel: number;
    unit: string;
    expirationDate: string | null;
  } | null;
};

type ClassificationResult = {
  predictions: PredictionItem[];
  photo: {
    id: string;
    fileName: string;
    imageDataUrl: string;
  };
  error?: string;
};

const todayInput = new Date().toISOString().slice(0, 10);

export function SnackDashboard() {
  const [activeTab, setActiveTab] = useState<"register" | "inventory" | "order" | "intake" | "analytics">("register");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [snacks, setSnacks] = useState<Snack[]>([]);
  const [logs, setLogs] = useState<ServingLog[]>([]);
  const [orders, setOrders] = useState<OrderBatch[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [period, setPeriod] = useState<"week" | "month">("week");
  const [analysisDate, setAnalysisDate] = useState(todayInput);
  const [previewImage, setPreviewImage] = useState<string>("");
  const [classification, setClassification] =
    useState<ClassificationResult | null>(null);
  const [uploadFileName, setUploadFileName] = useState<string>("");
  const [uploadDataUrl, setUploadDataUrl] = useState<string>("");
  const [uploadFileName2, setUploadFileName2] = useState<string>("");
  const [uploadDataUrl2, setUploadDataUrl2] = useState<string>("");
  const [previewImage2, setPreviewImage2] = useState<string>("");
  const [cameraTarget, setCameraTarget] = useState<"front" | "back">("front");
  const [classifying, setClassifying] = useState(false);
  const [searching, setSearching] = useState(false);
  const [bulkIntakeLoading, setBulkIntakeLoading] = useState(false);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [snackForm, setSnackForm] = useState({
    name: "",
    category: "BISCUIT" as string,
    unit: "袋",
    packageSize: 10,
    minStockLevel: 2,
    currentStock: 1,
    allergenNote: "",
    expirationDate: todayInput,
  });

  const [intakeForm, setIntakeForm] = useState({
    snackId: "",
    servings: 20,
    childrenCount: 20,
    servedDate: todayInput,
    memo: "",
  });

  const [orderForm, setOrderForm] = useState({
    orderedDate: todayInput,
    supplierName: "",
    requestedBy: "",
    memo: "",
    status: "ORDERED",
    items: [
      { id: crypto.randomUUID(), snackId: "", quantity: 1, unitPrice: "" },
    ] as OrderDraftItem[],
  });

  async function loadAll() {
    setLoading(true);
    setError("");
    try {
      const [snacksRes, logsRes, ordersRes, recommendRes, analyticsRes] =
        await Promise.all([
          fetch("/api/snacks", { cache: "no-store" }),
          fetch("/api/intakes", { cache: "no-store" }),
          fetch("/api/orders", { cache: "no-store" }),
          fetch("/api/orders?mode=recommend", { cache: "no-store" }),
          fetch(`/api/analytics?period=${period}&date=${analysisDate}`, {
            cache: "no-store",
          }),
        ]);

      const [snacksJson, logsJson, ordersJson, recommendJson, analyticsJson] =
        await Promise.all([
          snacksRes.json(),
          logsRes.json(),
          ordersRes.json(),
          recommendRes.json(),
          analyticsRes.json(),
        ]);

      setSnacks(snacksJson.snacks ?? []);
      setLogs(logsJson.logs ?? []);
      setOrders(ordersJson.batches ?? []);
      setRecommendations(recommendJson.recommendations ?? []);
      setAnalytics(analyticsJson);

      setIntakeForm((prev) => ({
        ...prev,
        snackId: prev.snackId || snacksJson.snacks?.[0]?.id || "",
      }));
      setOrderForm((prev) => ({
        ...prev,
        items: prev.items.map((item) => ({
          ...item,
          snackId: item.snackId || snacksJson.snacks?.[0]?.id || "",
        })),
      }));
    } catch {
      setError(
        "データ取得に失敗しました。DB準備前の可能性があります。",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    startTransition(() => {
      void loadAll();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, analysisDate]);

  const lowStockSnacks = useMemo(
    () => snacks.filter((s) => s.currentStock <= s.minStockLevel),
    [snacks],
  );

  function getExpirationStatus(dateStr: string | null): {
    label: string;
    className: string;
  } {
    if (!dateStr) return { label: "未設定", className: "text-gray-400 text-xs" };
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const exp = new Date(dateStr);
    exp.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil(
      (exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (diffDays < 0)
      return {
        label: `期限切れ(${Math.abs(diffDays)}日超過)`,
        className: "text-red-600 font-bold text-xs",
      };
    if (diffDays <= 7)
      return { label: `あと${diffDays}日`, className: "text-orange-600 font-bold text-xs" };
    if (diffDays <= 30)
      return { label: `あと${diffDays}日`, className: "text-yellow-600 text-xs" };
    return { label: `あと${diffDays}日`, className: "text-green-600 text-xs" };
  }

  const expiringSnacks = useMemo(
    () =>
      snacks.filter((s) => {
        if (!s.expirationDate) return false;
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const exp = new Date(s.expirationDate);
        exp.setHours(0, 0, 0, 0);
        const diff = Math.ceil(
          (exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        );
        return diff <= 7;
      }),
    [snacks],
  );

  async function submitJson(url: string, body: unknown) {
    setError("");
    setMessage("");
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error || "保存に失敗しました");
    }
    return json;
  }

  async function handleSnackCreate(e: FormEvent) {
    e.preventDefault();
    try {
      await submitJson("/api/snacks", {
        ...snackForm,
        expirationDate: snackForm.expirationDate || null,
      });
      setMessage("おやつを登録しました ✅");
      setSnackForm((prev) => ({
        ...prev,
        name: "",
        allergenNote: "",
        expirationDate: todayInput,
        currentStock: 1,
      }));
      setPreviewImage("");
      setPreviewImage2("");
      setClassification(null);
      setUploadDataUrl("");
      setUploadFileName("");
      setUploadDataUrl2("");
      setUploadFileName2("");
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "おやつ登録に失敗しました");
    }
  }

  async function handleIntakeCreate(e: FormEvent) {
    e.preventDefault();
    try {
      await submitJson("/api/intakes", intakeForm);
      setMessage("配布記録を登録しました ✅");
      setIntakeForm((prev) => ({ ...prev, memo: "" }));
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "配布記録に失敗しました");
    }
  }

  async function handleOrderCreate(e: FormEvent) {
    e.preventDefault();
    try {
      await submitJson("/api/orders", {
        orderedDate: orderForm.orderedDate,
        supplierName: orderForm.supplierName,
        requestedBy: orderForm.requestedBy,
        memo: orderForm.memo,
        status: orderForm.status,
        items: orderForm.items.map((item) => ({
          snackId: item.snackId,
          quantity: Number(item.quantity),
          unitPrice: item.unitPrice === "" ? null : Number(item.unitPrice),
        })),
      });
      setMessage("発注データを登録しました ✅");
      setOrderForm((prev) => ({
        ...prev,
        memo: "",
        items: prev.items.map((item, index) => ({
          ...item,
          quantity: 1,
          unitPrice: "",
          snackId: index === 0 ? item.snackId : "",
        })),
      }));
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "発注登録に失敗しました");
    }
  }

  async function handleWebSearch() {
    if (!snackForm.name) {
      setError("商品名を入力してください");
      return;
    }

    setSearching(true);
    setMessage("");
    setError("");
    try {
      const res = await submitJson("/api/search-snack", { query: snackForm.name });
      if (res.info) {
        const info = res.info;
        setSnackForm(prev => ({
          ...prev,
          name: info.name || prev.name,
          category: info.category || prev.category, // categoryがあれば
          allergenNote: info.allergens_major ? info.allergens_major.join("、") : prev.allergenNote,
        }));
        
        // 補足情報の反映（原材料やコンタミなど）
        let memo = "";
        if (info.ingredients) memo += `【原材料】\n${info.ingredients}\n`;
        if (info.contamination_info) memo += `【注意】\n${info.contamination_info}\n`;
        if (info.nutrition_total) {
          memo += `【栄養】${info.nutrition_total.weight}g / ${info.nutrition_total.calories}kcal`;
        }
        
        // allergenNoteに統合するか、別の場所に置くか検討が必要だが、
        // 現状のSnack型にはallergenNoteがあるのでそこに追記する
        if (memo) {
          setSnackForm(prev => ({
            ...prev,
            allergenNote: (prev.allergenNote ? prev.allergenNote + "\n" : "") + memo
          }));
        }

        setMessage("Webから情報を取得しました ✅");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "情報の取得に失敗しました");
    } finally {
      setSearching(false);
    }
  }

  async function handleClassify() {
    if (!uploadDataUrl) {
      setError("少なくとも1枚目の画像を選択してください");
      return;
    }

    setClassifying(true);
    try {
      const payload: any = {
        fileName: uploadFileName || "snack-photo.jpg",
        imageDataUrl: uploadDataUrl,
      };
      if (uploadDataUrl2) {
        payload.imageDataUrl2 = uploadDataUrl2;
      }
      const res = await submitJson("/api/classify-snack", payload);
      setClassification(res);
      // AI判定結果（最初の1件）をフォームに自動反映
      if (res.predictions && res.predictions.length > 0) {
        const first = res.predictions[0].prediction;
        setSnackForm(prev => ({
          ...prev,
          name: first.name || prev.name,
          category: first.category || prev.category,
          expirationDate: first.expirationDate || prev.expirationDate,
        }));
      }
      setMessage("AI判別完了 ✅");
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "画像判別に失敗しました");
    } finally {
      setClassifying(false);
    }
  }

  async function handleBulkIntake() {
    if (!classification || !classification.predictions) return;

    // マッチしたスナックがあるものだけ抽出
    const validItems = classification.predictions.filter(p => p.matchedSnack);

    if (validItems.length === 0) {
      setError("未登録のおやつばかりです。まずはおやつを個別に登録してください。");
      return;
    }

    // 確認ダイアログを表示
    const snackNames = validItems.map(p => p.matchedSnack!.name).join("、");
    if (!window.confirm(`${snackNames} の配布記録（${intakeForm.servings}人分）を一括登録してもよろしいですか？`)) {
      return;
    }

    setBulkIntakeLoading(true);
    try {
      for (const item of validItems) {
        await submitJson("/api/intakes", {
          snackId: item.matchedSnack!.id,
          servings: intakeForm.servings,
          servedDate: intakeForm.servedDate,
        });
      }

      setMessage(`${validItems.length}件のおやつを配布記録に登録しました ✅`);
      setClassification(null);
      setPreviewImage("");
      setPreviewImage2("");
      setUploadDataUrl("");
      setUploadDataUrl2("");
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "一括配布登録に失敗しました");
    } finally {
      setBulkIntakeLoading(true);
      // ローディング終了を少し遅延させて完了メッセージを見やすくする
      setTimeout(() => setBulkIntakeLoading(false), 500);
    }
  }

  const [isResizing, setIsResizing] = useState(false);

  async function resizeImage(file: File, maxSide = 1024): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxSide) {
              height *= maxSide / width;
              width = maxSide;
            }
          } else {
            if (height > maxSide) {
              width *= maxSide / height;
              height = maxSide;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", 0.8));
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function onFileSelected(file: File | null) {
    if (!file) {
      if (cameraTarget === "front") {
        setPreviewImage("");
        setUploadDataUrl("");
        setUploadFileName("");
      } else {
        setPreviewImage2("");
        setUploadDataUrl2("");
        setUploadFileName2("");
      }
      return;
    }

    setIsResizing(true);
    try {
      if (cameraTarget === "front") {
        setUploadFileName(file.name);
      } else {
        setUploadFileName2(file.name);
      }

      const resizedDataUrl = await resizeImage(file);

      if (cameraTarget === "front") {
        setPreviewImage(resizedDataUrl);
        setUploadDataUrl(resizedDataUrl);
      } else {
        setPreviewImage2(resizedDataUrl);
        setUploadDataUrl2(resizedDataUrl);
      }
    } catch (err) {
      console.error("Resize error:", err);
      setError("画像の処理に失敗しました");
    } finally {
      setIsResizing(false);
    }
  }

  function triggerCamera(target: "front" | "back") {
    setCameraTarget(target);
    // setTimeout to ensure state is set before click is processed if needed
    setTimeout(() => cameraInputRef.current?.click(), 0);
  }

  function triggerGallery(target: "front" | "back") {
    setCameraTarget(target);
    setTimeout(() => galleryInputRef.current?.click(), 0);
  }

  function updateOrderItem(id: string, patch: Partial<OrderDraftItem>) {
    setOrderForm((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === id ? { ...item, ...patch } : item,
      ),
    }));
  }

  function addOrderItem() {
    setOrderForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          id: crypto.randomUUID(),
          snackId: snacks[0]?.id ?? "",
          quantity: 1,
          unitPrice: "",
        },
      ],
    }));
  }

  function removeOrderItem(id: string) {
    setOrderForm((prev) => {
      if (prev.items.length <= 1) return prev;
      return { ...prev, items: prev.items.filter((item) => item.id !== id) };
    });
  }

  function downloadAnalyticsCsv(targetPeriod: "week" | "month") {
    const url = `/api/analytics/csv?period=${targetPeriod}&date=${encodeURIComponent(analysisDate)}`;
    window.location.href = url;
  }

  /* ============================================= */
  /* ============ RENDER ========================= */
  /* ============================================= */
  return (
    <div className="flex flex-col min-h-dvh" style={{ background: "#FFF9F2" }}>
      {/* ── Orange Gradient Header ── */}
      <header
        className="relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #f97316 0%, #fb923c 50%, #fdba74 100%)",
          borderRadius: "0 0 24px 24px",
          padding: "20px 20px 18px",
        }}
      >
        {/* 装飾クッキー */}
        <span className="absolute top-3 right-4 text-5xl opacity-30 rotate-12">🍪</span>
        <span className="absolute top-8 right-16 text-3xl opacity-20 -rotate-12">🍩</span>
        <div className="flex items-center gap-3 relative z-10">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.25)" }}
          >
            <span className="text-xl">🍪</span>
          </div>
          <div>
            <h1 className="text-white font-bold text-lg" style={{ letterSpacing: "0.04em" }}>
              おやつ管理
            </h1>
            <p className="text-white text-xs" style={{ opacity: 0.85 }}>
              学童保育おやつ記録アプリ
            </p>
          </div>
        </div>
      </header>

      {/* ── Resizing Progress Overlay ── */}
      {isResizing && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center text-white px-6 text-center">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="font-bold text-lg mb-2">画像を最適化中...</p>
          <p className="text-sm opacity-80">スマホで撮影した大きな画像を、AIが読み取りやすいサイズに調整しています。そのままお待ちください。</p>
        </div>
      )}

      {/* ── Toast Messages ── */}
      {message && (
        <div className="mx-4 mt-3 px-4 py-2 rounded-xl text-sm font-bold text-green-700 bg-green-50 border border-green-200 text-center animate-fade-in">
          {message}
        </div>
      )}
      {error && (
        <div className="mx-4 mt-3 px-4 py-2 rounded-xl text-sm font-bold text-red-600 bg-red-50 border border-red-200 text-center animate-fade-in">
          {error}
        </div>
      )}

      {/* ── Main Content ── */}
      <main className="flex-1 overflow-y-auto pb-24">
        <div className="max-w-lg mx-auto px-4 pt-5 space-y-5">

          {/* ======== 登録 TAB ======== */}
          {activeTab === "register" && (
            <>
              {/* 賞味期限アラート (ホーム画面用) */}
              {expiringSnacks.length > 0 && (
                <section className="animate-fade-in">
                  <div className="rounded-2xl p-4 space-y-3 relative overflow-hidden" style={{ background: "linear-gradient(135deg, #FFF1F2 0%, #FFE4E6 100%)", border: "1px solid #FECACA" }}>
                    {/* 背景装飾 */}
                    <div className="absolute -top-2 -right-2 text-6xl opacity-10 pointer-events-none">⏰</div>

                    <h3 className="text-sm font-bold text-red-600 flex items-center gap-2 relative z-10">
                      <span className="animate-pulse">🚨</span> 賞味期限が近いおやつがあります！
                    </h3>
                    <div className="flex flex-wrap gap-2 relative z-10">
                      {expiringSnacks.map(s => {
                        const status = getExpirationStatus(s.expirationDate);
                        return (
                          <div key={s.id} className="bg-white/80 backdrop-blur-sm px-3 py-2 rounded-xl border flex items-center gap-2 shadow-sm" style={{ borderColor: "#FECACA" }}>
                            <span className="text-xs font-bold text-gray-800">{s.name}</span>
                            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${status.className}`} style={{ background: "#FEE2E2" }}>
                              {status.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </section>
              )}

              {/* おやつの写真 */}
              <section>
                <h2 className="flex items-center gap-1.5 text-sm font-bold text-gray-700 mb-2">
                  <span>📷</span> おやつの写真
                </h2>

                {!previewImage ? (
                  <div
                    className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed py-8"
                    style={{ borderColor: "#fdba74", background: "#FFF7ED" }}
                  >
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
                      style={{ background: "#fed7aa" }}
                    >
                      <Camera className="w-7 h-7" style={{ color: "#ea580c" }} />
                    </div>
                    <p className="text-sm text-gray-500 mb-1 px-4 text-center">
                      おやつのパッケージ<span className="font-bold text-orange-600">表面</span>を撮影してください
                    </p>
                    <p className="text-[10px] text-gray-400 mb-4 px-4 text-center">
                      ※裏面の「一括表示」や「賞味期限」は2枚目として撮影すると精度が上がります
                    </p>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => triggerCamera("front")}
                        className="flex items-center gap-2 px-5 py-3 rounded-full text-base font-bold text-white shadow-md active:scale-95 transition-all"
                        style={{ background: "linear-gradient(135deg, #f97316, #ea580c)" }}
                      >
                        <Camera className="w-5 h-5" />
                        写真を撮る
                      </button>
                      <button
                        type="button"
                        onClick={() => triggerGallery("front")}
                        className="flex items-center gap-2 px-5 py-3 rounded-full text-sm font-bold border-2 shadow-sm active:scale-95 transition-all"
                        style={{ color: "#f97316", borderColor: "#f97316", background: "white" }}
                      >
                        <ImageIcon className="w-5 h-5" />
                        選ぶ
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex gap-3">
                      {/* 1枚目プレビュー */}
                      <div className="relative rounded-2xl overflow-hidden shadow-md flex-1 aspect-square bg-gray-100 border">
                        <img className="w-full h-full object-cover" src={previewImage} alt="表面" />
                        <div className="absolute top-2 left-2 bg-orange-500 text-white text-[10px] font-bold px-2 py-1 rounded-lg">表面</div>
                        <button
                          type="button"
                          onClick={() => { setPreviewImage(""); setUploadDataUrl(""); setUploadFileName(""); setClassification(null); }}
                          className="absolute top-2 right-2 w-7 h-7 bg-white/80 rounded-full flex items-center justify-center shadow-sm text-gray-700"
                        >
                          ✕
                        </button>
                      </div>

                      {/* 2枚目プレビュー / 撮影ボタン */}
                      {previewImage2 ? (
                        <div className="relative rounded-2xl overflow-hidden shadow-md flex-1 aspect-square bg-gray-100 border">
                          <img className="w-full h-full object-cover" src={previewImage2} alt="裏面" />
                          <div className="absolute top-2 left-2 bg-blue-500 text-white text-[10px] font-bold px-2 py-1 rounded-lg">裏面・賞味期限</div>
                          <button
                            type="button"
                            onClick={() => { setPreviewImage2(""); setUploadDataUrl2(""); setUploadFileName2(""); setClassification(null); }}
                            className="absolute top-2 right-2 w-7 h-7 bg-white/80 rounded-full flex items-center justify-center shadow-sm text-gray-700"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <div className="flex-1 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center p-3 gap-2" style={{ borderColor: "#cbd5e1", background: "#f8fafc" }}>
                          <span className="text-xs text-gray-500 text-center">裏面や賞味期限を<br />追加撮影</span>
                          <button
                            type="button"
                            onClick={() => triggerCamera("back")}
                            className="bg-blue-500 text-white p-4 rounded-full active:scale-95 shadow-lg"
                          >
                            <Camera className="w-6 h-6" />
                          </button>
                          <button
                            type="button"
                            onClick={() => triggerGallery("back")}
                            className="text-[10px] text-gray-500 underline underline-offset-2"
                          >
                            フォルダから選ぶ
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Hidden file inputs */}
                <input ref={cameraInputRef} type="file" className="hidden" accept="image/*" capture="environment"
                  onChange={(e) => void onFileSelected(e.target.files?.[0] ?? null)} />
                <input ref={galleryInputRef} type="file" className="hidden" accept="image/*"
                  onChange={(e) => void onFileSelected(e.target.files?.[0] ?? null)} />

                {/* AI判別ボタン */}
                {uploadDataUrl && !classification?.predictions && (
                  <button
                    type="button"
                    onClick={() => void handleClassify()}
                    disabled={classifying}
                    className="w-full mt-3 py-3 rounded-xl font-bold text-white text-sm shadow-sm active:scale-95 transition-all disabled:opacity-50"
                    style={{ background: "linear-gradient(135deg, #f97316, #ea580c)" }}
                  >
                    {classifying ? "⏳ AI判別中..." : "🤖 AIでおやつを判別する"}
                  </button>
                )}

                {/* AI判別結果 */}
                {classification?.predictions && (
                  <div className="mt-3 space-y-3">
                    <div className="rounded-xl p-3 border text-sm" style={{ borderColor: "#fed7aa", background: "#FFFBF5" }}>
                      <div className="font-bold text-gray-800 mb-2 flex items-center gap-1">
                        <span>🤖</span> AI判定結果（{classification.predictions.length}件）
                      </div>
                      <div className="space-y-3">
                        {classification.predictions.map((item, idx) => (
                          <div key={idx} className="pb-3 border-b last:border-0" style={{ borderColor: "#fed7aa" }}>
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-gray-800">{item.prediction.name}</span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: "#FED7AA", color: "#9A3412" }}>
                                {(item.prediction.confidence * 100).toFixed(0)}%
                              </span>
                            </div>
                            <div className="text-[10px] text-gray-500 mt-1 flex flex-wrap gap-x-3">
                              <span>📁 {snackCategoryLabels[item.prediction.category] || item.prediction.category}</span>
                              {item.prediction.expirationDate && <span>📅 {item.prediction.expirationDate}</span>}
                              {item.prediction.nutrition_info?.weight && <span>⚖️ {item.prediction.nutrition_info.weight}g</span>}
                              {item.prediction.nutrition_info?.calories && <span>🔥 {item.prediction.nutrition_info.calories}kcal</span>}
                            </div>

                            {/* 詳細情報の表示 */}
                            <div className="mt-2 space-y-1">
                              {item.prediction.allergens_major && item.prediction.allergens_major.length > 0 && (
                                <div className="text-[10px] flex items-start gap-1">
                                  <span className="font-bold text-red-500 shrink-0">⚠️ アレルゲン:</span>
                                  <span className="text-gray-700">{item.prediction.allergens_major.join('、')}</span>
                                </div>
                              )}
                              {item.prediction.contamination_info && (
                                <div className="text-[9px] flex items-start gap-1 leading-tight">
                                  <span className="font-bold text-amber-600 shrink-0">🚩 注意:</span>
                                  <span className="text-gray-500 italic">{item.prediction.contamination_info}</span>
                                </div>
                              )}
                              {item.prediction.ingredients && (
                                <div className="text-[9px] flex items-start gap-1 leading-tight mt-1">
                                  <span className="font-bold text-gray-400 shrink-0">📜 原材料:</span>
                                  <span className="text-gray-400 line-clamp-2 hover:line-clamp-none transition-all">{item.prediction.ingredients}</span>
                                </div>
                              )}
                            </div>

                            {item.matchedSnack ? (
                              <div className="text-[10px] text-orange-600 font-bold mt-1">
                                ✅ 登録済み: {item.matchedSnack.currentStock}{item.matchedSnack.unit}
                              </div>
                            ) : (
                              <div className="text-[10px] text-red-400 mt-1">
                                ⚠️ 未登録（おやつ情報を入力して登録してください）
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 一括配布登録ボタン */}
                    {classification.predictions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => void handleBulkIntake()}
                        disabled={bulkIntakeLoading}
                        className="w-full py-3.5 rounded-2xl font-bold text-white text-sm shadow-md active:scale-[0.98] transition-all bg-green-500 hover:bg-green-600 disabled:opacity-50"
                        style={{ background: "linear-gradient(135deg, #10b981, #059669)" }}
                      >
                        {bulkIntakeLoading ? "⏳ 登録中..." : "🍱 これらをまとめて配布記録に登録"}
                      </button>
                    )}
                  </div>
                )}
              </section>

              {/* おやつの名前 */}
              <section>
                <h2 className="flex items-center gap-1.5 text-sm font-bold text-gray-700 mb-2">
                  <span>🍭</span> おやつの名前 <span className="text-red-500">*</span>
                </h2>
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <input
                      className="flex-1 px-4 py-3 rounded-xl border bg-white text-sm"
                      style={{ borderColor: "#e5e7eb" }}
                      value={snackForm.name}
                      onChange={(e) => setSnackForm((p) => ({ ...p, name: e.target.value }))}
                      placeholder="例: たべっ子どうぶつ"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => void handleWebSearch()}
                      disabled={searching || !snackForm.name}
                      className="px-4 rounded-xl font-bold text-white text-sm shadow-sm active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-1 shrink-0 bg-blue-600"
                      style={{ background: "linear-gradient(135deg, #3b82f6, #2563eb)", minWidth: "110px" }}
                    >
                      {searching ? "..." : "🔍 Web検索"}
                    </button>
                  </div>
                </div>
              </section>

              {/* カテゴリ */}
              <section>
                <h2 className="flex items-center gap-1.5 text-sm font-bold text-gray-700 mb-2">
                  <span>📁</span> カテゴリ
                </h2>
                <div className="grid grid-cols-3 gap-2">
                  {snackCategoryOptions.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSnackForm((p) => ({ ...p, category: cat }))}
                      className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-medium transition-all active:scale-95"
                      style={
                        snackForm.category === cat
                          ? { background: "white", border: "2px solid #f97316", color: "#ea580c", boxShadow: "0 1px 4px rgba(249,115,22,0.15)" }
                          : { background: "white", border: "2px solid #f3f4f6", color: "#6b7280" }
                      }
                    >
                      <span>{snackCategoryEmojis[cat as keyof typeof snackCategoryEmojis]}</span>
                      <span className="truncate">{snackCategoryLabels[cat as keyof typeof snackCategoryLabels]}</span>
                    </button>
                  ))}
                </div>
              </section>

              {/* 日付 & 数量 */}
              <section>
                <div className="flex flex-col gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-600 flex items-center gap-1">
                      <span>📅</span> 賞味期限 {snackForm.expirationDate === "" && <span className="text-[10px] text-red-500 font-bold">※手入力してください</span>}
                    </label>
                    <input
                      type="date"
                      className="w-full p-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all bg-white"
                      value={snackForm.expirationDate || ""}
                      onChange={(e) => setSnackForm({ ...snackForm, expirationDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <h2 className="flex items-center gap-1.5 text-sm font-bold text-gray-700 mb-2">
                      <span>🔢</span> 数量（在庫）
                    </h2>
                    <div className="flex items-center">
                      <button
                        type="button"
                        onClick={() => setSnackForm((p) => ({ ...p, currentStock: Math.max(0, p.currentStock - 1) }))}
                        className="w-12 h-12 rounded-l-2xl flex items-center justify-center font-bold text-lg active:scale-95 transition-transform border border-r-0"
                        style={{ background: "#f3f4f6", color: "#6b7280", borderColor: "#e5e7eb" }}
                      >
                        <Minus className="w-5 h-5" />
                      </button>
                      <input
                        type="number"
                        min={0}
                        className="w-20 h-12 text-center font-bold text-lg border bg-white focus:outline-none"
                        style={{ borderColor: "#e5e7eb" }}
                        value={snackForm.currentStock}
                        onChange={(e) => setSnackForm((p) => ({ ...p, currentStock: Math.max(0, Number(e.target.value)) }))}
                      />
                      <button
                        type="button"
                        onClick={() => setSnackForm((p) => ({ ...p, currentStock: p.currentStock + 1 }))}
                        className="w-12 h-12 rounded-r-2xl flex items-center justify-center font-bold text-lg active:scale-95 transition-transform border border-l-0"
                        style={{ background: "#f97316", color: "white", borderColor: "#f97316" }}
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </section>

              {/* 登録ボタン */}
              <button
                type="button"
                onClick={(e) => void handleSnackCreate(e as unknown as FormEvent)}
                className="w-full py-3.5 rounded-2xl font-bold text-white text-sm shadow-md active:scale-[0.98] transition-transform"
                style={{ background: "linear-gradient(135deg, #f97316, #ea580c)" }}
              >
                おやつを登録する
              </button>
            </>
          )}

          {/* ======== 一覧 TAB ======== */}
          {activeTab === "inventory" && (
            <>
              {/* Notification banner */}
              {(lowStockSnacks.length > 0 || expiringSnacks.length > 0) && (
                <div className="rounded-2xl p-3 space-y-2" style={{ background: "#FEF2F2", border: "1px solid #FECACA" }}>
                  {lowStockSnacks.length > 0 && (
                    <div className="text-xs font-bold text-red-600">
                      📦 在庫不足: {lowStockSnacks.map(s => s.name).join(", ")}
                    </div>
                  )}
                  {expiringSnacks.length > 0 && (
                    <div className="text-xs font-bold text-orange-600">
                      ⏰ 期限注意: {expiringSnacks.map(s => s.name).join(", ")}
                    </div>
                  )}
                </div>
              )}

              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-gray-700">📦 おやつ一覧（{snacks.length}件）</h2>
                  <button
                    onClick={() => void loadAll()}
                    disabled={loading}
                    className="text-xs px-3 py-1.5 rounded-lg active:scale-95 transition-transform"
                    style={{ background: "#FFF7ED", color: "#ea580c", fontWeight: 600 }}
                  >
                    {loading ? "..." : "更新"}
                  </button>
                </div>

                {snacks.length === 0 ? (
                  <div className="text-center py-12 text-gray-400 text-sm">おやつがまだ登録されていません</div>
                ) : (
                  <div className="space-y-2">
                    {snacks.map((snack) => {
                      const expStatus = getExpirationStatus(snack.expirationDate);
                      const isLow = snack.currentStock <= snack.minStockLevel;
                      return (
                        <div
                          key={snack.id}
                          className="flex items-center gap-3 p-3 rounded-xl bg-white shadow-sm"
                          style={{ border: isLow ? "1px solid #FECACA" : "1px solid #f3f4f6" }}
                        >
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0" style={{ background: "#FFF7ED" }}>
                            {snackCategoryEmojis[snack.category as keyof typeof snackCategoryEmojis] ?? "🍭"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-sm text-gray-800 truncate">{snack.name}</div>
                            <div className="text-xs text-gray-400">
                              {snackCategoryLabels[snack.category] ?? snack.category}
                              {snack.expirationDate && (
                                <span className={`ml-2 ${expStatus.className}`}>{expStatus.label}</span>
                              )}
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className={`font-bold text-sm ${isLow ? "text-red-500" : "text-gray-800"}`}>
                              {snack.currentStock} {snack.unit}
                            </div>
                            {isLow && <div className="text-[10px] text-red-400 font-bold">要発注</div>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </>
          )}

          {/* ======== 発注 TAB ======== */}
          {activeTab === "order" && (
            <>
              <section>
                <h2 className="text-sm font-bold text-gray-700 mb-3">🛒 発注登録</h2>
                <form onSubmit={handleOrderCreate} className="space-y-3">
                  {orderForm.items.map((item) => (
                    <div key={item.id} className="p-3 rounded-xl bg-white border" style={{ borderColor: "#f3f4f6" }}>
                      <select
                        className="w-full px-3 py-2 rounded-lg border text-sm mb-2"
                        style={{ borderColor: "#e5e7eb" }}
                        value={item.snackId}
                        onChange={(e) => updateOrderItem(item.id, { snackId: e.target.value })}
                      >
                        <option value="">おやつを選択</option>
                        {snacks.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                      <div className="grid grid-cols-2 gap-2">
                        <input type="number" min={1} className="px-3 py-2 rounded-lg border text-sm" style={{ borderColor: "#e5e7eb" }}
                          value={item.quantity} onChange={(e) => updateOrderItem(item.id, { quantity: Number(e.target.value) })} placeholder="数量" />
                        <input type="number" min={0} className="px-3 py-2 rounded-lg border text-sm" style={{ borderColor: "#e5e7eb" }}
                          value={item.unitPrice} onChange={(e) => updateOrderItem(item.id, { unitPrice: e.target.value })} placeholder="単価(任意)" />
                      </div>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <button type="button" onClick={addOrderItem} className="flex-1 py-2.5 rounded-xl text-sm font-bold active:scale-95 transition-transform"
                      style={{ background: "#f3f4f6", color: "#6b7280" }}>+ 追加</button>
                    <button type="submit" className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white active:scale-95 transition-transform"
                      style={{ background: "#f97316" }}>発注する</button>
                  </div>
                </form>
              </section>

              {recommendations.length > 0 && (
                <section>
                  <h2 className="text-sm font-bold text-gray-700 mb-2">💡 おすすめ発注候補</h2>
                  <div className="space-y-2">
                    {recommendations.map((r) => (
                      <div key={r.snackId} className="flex items-center justify-between p-3 rounded-xl bg-white border" style={{ borderColor: "#f3f4f6" }}>
                        <div>
                          <div className="text-sm font-bold text-gray-800">{r.snackName}</div>
                          <div className="text-xs text-gray-400">在庫: {r.currentStock}{r.unit}</div>
                        </div>
                        <div className="text-sm font-bold text-red-500">{r.suggestedQty} {r.unit}</div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}

          {/* ======== 納品 (intake) TAB ======== */}
          {activeTab === "intake" && (
            <>
              <section>
                <h2 className="text-sm font-bold text-gray-700 mb-3">📋 配布記録</h2>
                <form onSubmit={handleIntakeCreate} className="space-y-3">
                  <select className="w-full px-3 py-3 rounded-xl border bg-white text-sm" style={{ borderColor: "#e5e7eb" }}
                    value={intakeForm.snackId} onChange={(e) => setIntakeForm((p) => ({ ...p, snackId: e.target.value }))}>
                    <option value="">おやつを選択</option>
                    {snacks.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">配布日</label>
                      <input type="date" className="w-full px-3 py-2.5 rounded-xl border bg-white text-sm" style={{ borderColor: "#e5e7eb" }}
                        value={intakeForm.servedDate} onChange={(e) => setIntakeForm((p) => ({ ...p, servedDate: e.target.value }))} />
                    </div>
                    <div className="min-w-0 pr-1">
                      <label className="text-xs text-gray-500 mb-1 block">配布数（人分）</label>
                      <div className="flex items-center overflow-hidden rounded-xl border" style={{ borderColor: "#e5e7eb" }}>
                        <button type="button" onClick={() => setIntakeForm(p => ({ ...p, servings: Math.max(1, p.servings - 1) }))}
                          className="w-9 h-9 flex-shrink-0 flex items-center justify-center" style={{ background: "#f3f4f6" }}>
                          <Minus className="w-3.5 h-3.5 text-gray-500" />
                        </button>
                        <input type="number" min={1} className="flex-1 min-w-0 h-9 text-center font-bold text-sm bg-white border-0 outline-none"
                          value={intakeForm.servings} onChange={(e) => setIntakeForm(p => ({ ...p, servings: Number(e.target.value) }))} />
                        <button type="button" onClick={() => setIntakeForm(p => ({ ...p, servings: p.servings + 1 }))}
                          className="w-9 h-9 flex-shrink-0 flex items-center justify-center text-white" style={{ background: "#f97316" }}>
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                  <button type="submit" className="w-full py-3 rounded-xl font-bold text-white text-sm active:scale-[0.98] transition-transform"
                    style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)" }}>
                    配布を記録する
                  </button>
                </form>
              </section>

              {logs.length > 0 && (
                <section>
                  <h2 className="text-sm font-bold text-gray-700 mb-2">📝 直近の記録</h2>
                  <div className="space-y-2">
                    {logs.slice(0, 8).map((l) => (
                      <div key={l.id} className="flex items-center justify-between p-3 rounded-xl bg-white border" style={{ borderColor: "#f3f4f6" }}>
                        <div>
                          <div className="text-sm font-bold text-gray-800">{l.snack.name}</div>
                          <div className="text-xs text-gray-400">{formatDate(l.servedDate)}</div>
                        </div>
                        <div className="text-sm font-bold" style={{ color: "#f97316" }}>{l.servings}人分</div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}

          {/* ======== 集計 TAB ======== */}
          {activeTab === "analytics" && (
            <>
              {/* 月ナビゲーション */}
              <div className="flex items-center justify-between px-2">
                <button
                  onClick={() => {
                    const d = new Date(analysisDate);
                    d.setMonth(d.getMonth() - 1);
                    setAnalysisDate(d.toISOString().slice(0, 10));
                    setPeriod("month");
                  }}
                  className="w-8 h-8 rounded-full flex items-center justify-center active:scale-90 transition-transform"
                  style={{ background: "#FFF7ED" }}
                >
                  <ChevronLeft className="w-4 h-4" style={{ color: "#f97316" }} />
                </button>
                <h2 className="text-base font-bold text-gray-800">
                  📊 {new Date(analysisDate).getFullYear()}年{new Date(analysisDate).getMonth() + 1}月
                </h2>
                <button
                  onClick={() => {
                    const d = new Date(analysisDate);
                    d.setMonth(d.getMonth() + 1);
                    setAnalysisDate(d.toISOString().slice(0, 10));
                    setPeriod("month");
                  }}
                  className="w-8 h-8 rounded-full flex items-center justify-center active:scale-90 transition-transform"
                  style={{ background: "#FFF7ED" }}
                >
                  <ChevronRight className="w-4 h-4" style={{ color: "#f97316" }} />
                </button>
              </div>

              {/* サマリーカード3枚 */}
              {analytics && (
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-3 rounded-xl bg-white text-center border" style={{ borderColor: "#f3f4f6" }}>
                    <div className="text-xl font-bold" style={{ color: "#f97316" }}>{analytics.summary.totalServings}</div>
                    <div className="text-[10px] text-gray-400 mt-0.5">提供回数</div>
                  </div>
                  <div className="p-3 rounded-xl bg-white text-center border" style={{ borderColor: "#f3f4f6" }}>
                    <div className="text-xl font-bold" style={{ color: "#22c55e" }}>{analytics.summary.uniqueSnackCount ?? 0}</div>
                    <div className="text-[10px] text-gray-400 mt-0.5">種類</div>
                  </div>
                  <div className="p-3 rounded-xl bg-white text-center border" style={{ borderColor: "#f3f4f6" }}>
                    <div className="text-xl font-bold" style={{ color: "#f97316" }}>{analytics.summary.servingDays ?? 0}</div>
                    <div className="text-[10px] text-gray-400 mt-0.5">提供日数</div>
                  </div>
                </div>
              )}

              {/* カテゴリ別ドーナツチャート */}
              {analytics && (
                <section className="p-4 rounded-2xl bg-white border" style={{ borderColor: "#f3f4f6" }}>
                  <h3 className="text-xs font-bold text-gray-500 mb-3">🔄 カテゴリ別</h3>
                  {(analytics.categoryBreakdown ?? []).length === 0 ? (
                    <div className="text-center py-6 text-gray-400 text-sm">データなし</div>
                  ) : (
                    <DonutChart data={analytics.categoryBreakdown ?? []} total={analytics.summary.totalServings} />
                  )}
                </section>
              )}

              {/* 日別バーチャート */}
              {analytics && (
                <section className="p-4 rounded-2xl bg-white border" style={{ borderColor: "#f3f4f6" }}>
                  <h3 className="text-xs font-bold text-gray-500 mb-3">📊 日別提供回数</h3>
                  {(analytics.dailyBreakdown ?? []).length === 0 ? (
                    <div className="text-center py-6 text-gray-400 text-sm">データなし</div>
                  ) : (
                    <BarChart data={analytics.dailyBreakdown ?? []} />
                  )}
                </section>
              )}

              {/* 人気おやつ */}
              {analytics && (analytics.topSnacks ?? []).length > 0 && (
                <section className="p-4 rounded-2xl bg-white border" style={{ borderColor: "#f3f4f6" }}>
                  <h3 className="text-xs font-bold text-gray-500 mb-2">🏆 人気おやつ</h3>
                  <div className="space-y-2">
                    {analytics.topSnacks.map((row, i) => (
                      <div key={row.snackId} className="flex items-center gap-3 p-2 rounded-xl" style={{ background: i === 0 ? "#FFF7ED" : "transparent" }}>
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                          style={{ background: i === 0 ? "#f97316" : i === 1 ? "#fb923c" : "#fdba74" }}>
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold text-gray-800 truncate">{row.snackName}</div>
                        </div>
                        <div className="text-sm font-bold" style={{ color: "#f97316" }}>{row.servings}回</div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              <button onClick={() => downloadAnalyticsCsv("month")}
                className="w-full py-2.5 rounded-xl text-sm font-bold active:scale-95 transition-transform"
                style={{ background: "#f3f4f6", color: "#6b7280" }}>
                📥 CSV出力
              </button>
            </>
          )}

        </div>
      </main>

      {/* ── Bottom Navigation ── */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 bg-white"
        style={{ borderTop: "1px solid #f3f4f6", paddingBottom: "max(8px, env(safe-area-inset-bottom))" }}
      >
        <div className="max-w-lg mx-auto flex justify-around items-center" style={{ height: 56 }}>
          {([
            { key: "register" as const, icon: <Plus className="w-5 h-5" />, label: "登録", highlight: true },
            { key: "inventory" as const, icon: <List className="w-5 h-5" />, label: "一覧" },
            { key: "order" as const, icon: <ShoppingCart className="w-5 h-5" />, label: "発注" },
            { key: "intake" as const, icon: <Package className="w-5 h-5" />, label: "納品" },
            { key: "analytics" as const, icon: <BarChart2 className="w-5 h-5" />, label: "集計" },
          ]).map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className="flex flex-col items-center justify-center h-full gap-0.5 transition-colors"
                style={{ minWidth: 56, color: isActive ? "#f97316" : "#9ca3af" }}
              >
                {tab.highlight && isActive ? (
                  <div className="w-9 h-9 -mt-4 rounded-full flex items-center justify-center shadow-md" style={{ background: "#f97316" }}>
                    <Plus className="w-5 h-5 text-white" />
                  </div>
                ) : (
                  tab.icon
                )}
                <span className="text-[10px] font-medium leading-none">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

/* ── Chart Components ── */

const CHART_COLORS = ["#ec4899", "#f97316", "#22c55e", "#3b82f6", "#a855f7", "#eab308", "#14b8a6", "#ef4444", "#6366f1", "#84cc16", "#f43f5e"];

function DonutChart({ data, total }: { data: Array<{ category: string; servings: number }>; total: number }) {
  const size = 160;
  const strokeWidth = 28;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  let cumulativeOffset = 0;

  return (
    <div className="flex items-center gap-4">
      <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
        <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
          {data.map((item, i) => {
            const ratio = total > 0 ? item.servings / total : 0;
            const dashArray = ratio * circumference;
            const dashOffset = -cumulativeOffset * circumference;
            cumulativeOffset += ratio;
            return (
              <circle
                key={item.category}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={CHART_COLORS[i % CHART_COLORS.length]}
                strokeWidth={strokeWidth}
                strokeDasharray={`${dashArray} ${circumference - dashArray}`}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
                style={{ transition: "stroke-dasharray 0.5s ease" }}
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-gray-800">{total}</span>
          <span className="text-[10px] text-gray-400">回</span>
        </div>
      </div>
      <div className="flex-1 space-y-1.5">
        {data.map((item, i) => {
          const catLabel = (snackCategoryLabels as Record<string, string>)[item.category] ?? item.category;
          return (
            <div key={item.category} className="flex items-center gap-2 text-xs">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
              <span className="text-gray-600 truncate">{catLabel}</span>
              <span className="ml-auto font-bold text-gray-800">{item.servings}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BarChart({ data }: { data: Array<{ date: string; servings: number }> }) {
  const maxServings = Math.max(...data.map((d) => d.servings), 1);
  const barWidth = Math.max(16, Math.min(32, Math.floor(280 / data.length) - 4));

  return (
    <div className="overflow-x-auto">
      <div className="flex items-end gap-1 justify-center" style={{ minHeight: 140 }}>
        {data.map((item) => {
          const height = Math.max(4, (item.servings / maxServings) * 120);
          const day = new Date(item.date).getDate();
          return (
            <div key={item.date} className="flex flex-col items-center gap-1">
              <span className="text-[10px] font-bold text-gray-600">{item.servings}</span>
              <div
                className="rounded-t-md"
                style={{
                  width: barWidth,
                  height,
                  background: "linear-gradient(180deg, #f97316, #fdba74)",
                  transition: "height 0.4s ease",
                }}
              />
              <span className="text-[9px] text-gray-400">{day}日</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatDate(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    return value;
  }
  return d.toLocaleDateString("ja-JP");
}
/* ── CSS Animations ── */
const style = `
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-fade-in {
  animation: fadeIn 0.3s ease-out forwards;
}
`;

if (typeof document !== 'undefined') {
  const s = document.createElement('style');
  s.innerHTML = style;
  document.head.appendChild(s);
}
