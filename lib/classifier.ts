import { SnackCategory } from "@prisma/client";

type ClassifierResult = {
  provider: string;
  name: string;
  category: SnackCategory;
  confidence: number;
  expirationDate?: string;
  ingredients?: string;
  allergens_major?: string[];
  contamination_info?: string;
  nutrition_info?: {
    weight?: number;
    calories?: number;
  };
};

type ClassificationResponse = {
  predictions: ClassifierResult[];
};

const keywordRules: Array<{ keyword: string; name: string; category: SnackCategory; confidence: number }> = [
  { keyword: "せんべい", name: "しおせんべい", category: SnackCategory.SENBEI, confidence: 0.88 },
  { keyword: "senbei", name: "しおせんべい", category: SnackCategory.SENBEI, confidence: 0.84 },
  { keyword: "ビスケット", name: "どうぶつビスケット", category: SnackCategory.BISCUIT, confidence: 0.9 },
  { keyword: "biscuit", name: "どうぶつビスケット", category: SnackCategory.BISCUIT, confidence: 0.85 },
  { keyword: "ゼリー", name: "フルーツゼリー", category: SnackCategory.JELLY, confidence: 0.92 },
  { keyword: "jelly", name: "フルーツゼリー", category: SnackCategory.JELLY, confidence: 0.89 },
  { keyword: "グミ", name: "フルーツグミ", category: SnackCategory.GUMMY, confidence: 0.86 }
];

function toCategory(value: string): SnackCategory {
  const normalized = value.trim().toUpperCase();
  if (Object.values(SnackCategory).includes(normalized as SnackCategory)) {
    return normalized as SnackCategory;
  }
  return SnackCategory.OTHER;
}

function extractJsonObject(text: string) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("判別レスポンスからJSONを抽出できませんでした");
  }
  return text.slice(start, end + 1);
}

async function classifyWithMock(input: { fileName: string; imageDataUrl?: string }, provider = "mock"): Promise<ClassifierResult[]> {
  const target = `${input.fileName} ${input.imageDataUrl ?? ""}`.toLowerCase();

  const hit = keywordRules.find((r) => target.includes(r.keyword.toLowerCase()));
  if (hit) {
    return [{ provider, ...hit }];
  }

  return [{
    provider,
    name: "未分類おやつ",
    category: SnackCategory.OTHER,
    confidence: 0.4
  }];
}

async function classifyWithOpenAI(input: { fileName: string; imageDataUrl?: string; imageDataUrl2?: string }): Promise<ClassifierResult[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return classifyWithMock(input, "mock-fallback");
  }

  const model = process.env.OPENAI_VISION_MODEL ?? "gpt-4o"; // Use gpt-4o as default for higher accuracy
  const prompt = [
    "【役割設定】",
    "あなたは食品表示ラベルの解析に特化した高度な画像解析アシスタントです。アップロードされた画像から「学童保育の日誌」に必要な情報を正確に抽出し、データ化してください。",
    "必ずJSONのみを返してください。",
    '形式: {"predictions": [{"name":"商品名","category":"SENBEI|BISCUIT|CHOCOLATE|GUMMY|SNACK|FRUIT|BREAD|ICE|JELLY|DRINK|OTHER","confidence":0.0-1.0,"expirationDate":"YYYY-MM-DD","ingredients":"原材料全文","allergens_major":["小麦","卵"等],"contamination_info":"注意書き","nutrition_info":{"weight":数値,"calories":数値}}]}',
    "【抽出項目とルール】",
    "1. 商品名 (name): お菓子の名称（例：黒糖ちんすこう）。表面の大きな商品名を優先してください。",
    "2. 賞味期限 (expirationDate): 画像内の「賞味期限」の文字の横にある日付。形式: YYYY-MM-DD（例: 26.06.04 → 2026-06-04）に変換すること。",
    "3. 原材料名 (ingredients): 原材料名欄の内容をすべて書き出す。",
    "4. 特定原材料7品目 (allergens_major): 小麦、卵、乳、そば、落花生（ピーナッツ）、えび、かに、が含まれているか判定し配列で返す。",
    "5. コンタミネーション情報 (contamination_info): 「本品製造工場では...」「〇〇を含む製品と共通の設備で...」といった注意書きの内容を漏らさず抽出。",
    "6. 栄養成分 (nutrition_info): 重量はグラム(g)単位、カロリーはkcal単位で数値のみ抽出。",
    "【精度向上のための制約事項】",
    "- 推測禁止: 文字が潰れて読めない、または画像内に情報がない場合は、勝手に補完せず必ず null にしてください。",
    "- 単位の統一: 重量はグラム単位、カロリーはkcal単位で数値のみ抽出してください。",
    "- 優先順位: 表面の大きな文字よりも、裏面の「一括表示ラベル（枠線で囲まれた部分）」を優先的に解析してください。",
    "- 複数の画像が提供された場合は、情報を総合して判断してください。"
  ].join("\n");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      messages: [
        {
          role: "system",
          content: "あなたは食品表示ラベル解析のスペシャリストです。指定形式のJSONのみ返答してください。"
        },
        {
          role: "user",
          content: [
            { type: "text", text: `${prompt}\nファイル名: ${input.fileName}` },
            {
              type: "image_url",
              image_url: { url: input.imageDataUrl ?? "" }
            },
            ...(input.imageDataUrl2
              ? [{ type: "image_url", image_url: { url: input.imageDataUrl2 } }]
              : [])
          ]
        }
      ]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI判別APIエラー: ${response.status} ${errorText}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = data.choices?.[0]?.message?.content ?? "";
  const parsed = JSON.parse(extractJsonObject(text)) as {
    predictions?: Array<{
      name?: string;
      category?: string;
      confidence?: number;
      expirationDate?: string;
      ingredients?: string;
      allergens_major?: string[];
      contamination_info?: string;
      nutrition_info?: {
        weight?: number;
        calories?: number;
      };
    }>;
  };

  const predictions = (parsed.predictions ?? []).map(p => ({
    provider: "openai",
    name: String(p.name ?? "未分類おやつ"),
    category: toCategory(String(p.category ?? "OTHER")),
    confidence: Number.isFinite(p.confidence) ? Math.max(0, Math.min(1, Number(p.confidence))) : 0.5,
    ...(p.expirationDate ? { expirationDate: String(p.expirationDate) } : {}),
    ...(p.ingredients ? { ingredients: String(p.ingredients) } : {}),
    ...(p.allergens_major ? { allergens_major: p.allergens_major } : {}),
    ...(p.contamination_info ? { contamination_info: String(p.contamination_info) } : {}),
    ...(p.nutrition_info ? { nutrition_info: p.nutrition_info } : {})
  }));

  return predictions.length > 0 ? predictions : classifyWithMock(input, "openai-empty-fallback");
}

async function classifyWithGemini(input: { fileName: string; imageDataUrl?: string; imageDataUrl2?: string }): Promise<ClassifierResult[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return classifyWithMock(input, "mock-fallback");
  }

  const model = process.env.GEMINI_VISION_MODEL ?? "gemini-2.0-flash";
  const prompt = [
    "【役割設定】",
    "あなたは食品表示ラベルの解析に特化した高度な画像解析アシスタントです。アップロードされた画像から「学童保育の日誌」に必要な情報を正確に抽出し、データ化してください。",
    "必ずJSONのみを返してください。余計な説明は一切不要です。",
    '形式: {"predictions": [{"name":"商品名","category":"SENBEI|BISCUIT|CHOCOLATE|GUMMY|SNACK|FRUIT|BREAD|ICE|JELLY|DRINK|OTHER","confidence":0.0-1.0,"expirationDate":"YYYY-MM-DD","ingredients":"原材料全文","allergens_major":["小麦","卵"等],"contamination_info":"注意書き","nutrition_info":{"weight":数値,"calories":数値}}]}',
    "【画像構成】",
    "画像が1枚の場合: その画像から情報を抽出してください。",
    "画像が2枚の場合: 1枚目は商品の「表面（パッケージ）」、2枚目は「裏面（一括表示ラベル、賞味期限）」である可能性が高いです。両方の情報を統合して回答してください。",
    "【抽出項目とルール】",
    "1. 商品名 (name): お菓子の名称（例：黒糖ちんすこう）。表面の大きなロゴや文字を最優先してください。",
    "2. 賞味期限 (expirationDate): 画像内の「賞味期限」の文字付近にある日付。形式: YYYY-MM-DD に変換。例: 26.06.04 → 2026-06-04, 2025/12/31 → 2025-12-31。",
    "3. 原材料名 (ingredients): 「名称」「原材料名」等の欄にある内容をすべて正確に抽出。改行は不要です。",
    "4. 特定原材料7品目 (allergens_major): 小麦、卵、乳、そば、落花生、えび、かに、が原材料に含まれているか、または別途「アレルギー表示」として記載されているか確認し配列で返す。",
    "5. コンタミネーション (contamination_info): 「本品製造工場では...」「〇〇を含む製品と共通の設備で...」といった注意書きの内容を漏らさず抽出。",
    "6. 栄養成分 (nutrition_info): 重量は「内容量」から数値(g)を、熱量は「エネルギー」から数値(kcal)を抽出。不明ならnull。",
    "【精度向上のための制約】",
    "- 推測禁止: 文字が読めない、または画像内に情報がない場合は null にしてください。",
    "- 単位: 重量はg、カロリーはkcalの数値のみ。単位文字は含めないでください。",
    "- 優先順位: 商品名は表面、詳細情報（期限、原材料）は裏面を優先。"
  ].join("\n");

  const dataUrlMatch = (input.imageDataUrl ?? "").match(/^data:(.+?);base64,(.+)$/);
  const mimeType = dataUrlMatch?.[1] ?? "image/jpeg";
  const base64Data = dataUrlMatch?.[2] ?? "";

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const parts: any[] = [
    { text: `${prompt}\nファイル名: ${input.fileName}` },
    {
      inlineData: {
        mimeType,
        data: base64Data
      }
    }
  ];

  if (input.imageDataUrl2) {
    const dataUrlMatch2 = input.imageDataUrl2.match(/^data:(.+?);base64,(.+)$/);
    if (dataUrlMatch2) {
      parts.push({
        inlineData: {
          mimeType: dataUrlMatch2[1] || "image/jpeg",
          data: dataUrlMatch2[2]
        }
      });
    }
  }

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: parts
        }
      ],
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 1024
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini判別APIエラー: ${response.status} ${errorText}`);
  }

  const data = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  const parsed = JSON.parse(extractJsonObject(text)) as {
    predictions?: Array<{
      name?: string;
      category?: string;
      confidence?: number;
      expirationDate?: string;
      ingredients?: string;
      allergens_major?: string[];
      contamination_info?: string;
      nutrition_info?: {
        weight?: number;
        calories?: number;
      };
    }>;
  };

  const predictions = (parsed.predictions ?? []).map(p => ({
    provider: "gemini",
    name: String(p.name ?? "未分類おやつ"),
    category: toCategory(String(p.category ?? "OTHER")),
    confidence: Number.isFinite(p.confidence) ? Math.max(0, Math.min(1, Number(p.confidence))) : 0.5,
    ...(p.expirationDate ? { expirationDate: String(p.expirationDate) } : {}),
    ...(p.ingredients ? { ingredients: String(p.ingredients) } : {}),
    ...(p.allergens_major ? { allergens_major: p.allergens_major } : {}),
    ...(p.contamination_info ? { contamination_info: String(p.contamination_info) } : {}),
    ...(p.nutrition_info ? { nutrition_info: p.nutrition_info } : {})
  }));

  return predictions.length > 0 ? predictions : classifyWithMock(input, "gemini-empty-fallback");
}

export async function classifySnackImage(input: { fileName: string; imageDataUrl?: string; imageDataUrl2?: string }) {
  const provider = process.env.SNACK_CLASSIFIER_PROVIDER ?? "mock";

  if (provider === "gemini") {
    try {
      return await classifyWithGemini(input);
    } catch (error) {
      console.error(error);
      return classifyWithMock(input, "gemini-error-fallback");
    }
  }

  if (provider === "openai") {
    try {
      return await classifyWithOpenAI(input);
    } catch (error) {
      console.error(error);
      return classifyWithMock(input, "openai-error-fallback");
    }
  }

  return classifyWithMock(input, provider);
}
