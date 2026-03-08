export type SnackInfo = {
  name: string;
  manufacturer?: string;
  ingredients?: string;
  allergens_major?: string[];
  contamination_info?: string;
  nutrition_total?: {
    weight?: number;
    calories?: number;
  };
  details_url?: string;
};

export async function searchSnackInfo(query: string): Promise<SnackInfo> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set");
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

  const prompt = `
あなたは食品安全と商品情報のスペシャリストです。
提供された商品名とメーカー名について、Google検索を使用して最新かつ正確な情報を調査し、以下のJSON形式で回答してください。
必ず、日本国内で販売されている商品の公式情報または信頼できるデータベースを参考にしてください。

調査対象: 「${query}」

【返却形式】
JSONのみを返してください。余計な説明文は一切含めないでください。
{
  "name": "正式な商品名",
  "manufacturer": "メーカー名",
  "ingredients": "原材料名の全文（判明する場合）",
  "allergens_major": ["小麦", "卵", "乳", "そば", "落花生", "えび", "かに" の中から含まれるものを配列で],
  "contamination_info": "コンタミネーション情報（例：本品製造工場では小麦を含む製品を生産しています等）",
  "nutrition_total": {
    "weight": 数値(g),
    "calories": 数値(kcal)
  },
  "details_url": "参考にした公式URL"
}

【注意事項】
- 確証が持てない項目は null にしてください。
- 特定原材料7品目（allergens_major）は極めて重要です。慎重に判断してください。
- 重量は「内容量」から数値(g)を、熱量は「エネルギー」から数値(kcal)を抽出してください。
`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      tools: [{ googleSearch: {} }],
      generationConfig: {
        temperature: 0,
        responseMimeType: "application/json"
      }
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API Error: ${response.status} ${error}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
  
  try {
    return JSON.parse(text) as SnackInfo;
  } catch (e) {
    console.error("JSON Parse Error:", text);
    throw new Error("AIからの回答を正しく解析できませんでした。");
  }
}
