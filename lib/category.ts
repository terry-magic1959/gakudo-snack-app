export const snackCategoryOptions = [
  "SENBEI",
  "BISCUIT",
  "CHOCOLATE",
  "GUMMY",
  "SNACK",
  "FRUIT",
  "JELLY",
  "BREAD",
  "DRINK",
  "ICE",
  "OTHER"
] as const;

export const snackCategoryLabels: Record<(typeof snackCategoryOptions)[number], string> = {
  SENBEI: "せんべい",
  BISCUIT: "クッキー・ビスケット",
  CHOCOLATE: "チョコレート",
  GUMMY: "グミ・キャンディ",
  SNACK: "スナック菓子",
  FRUIT: "果物",
  JELLY: "ゼリー・プリン",
  BREAD: "パン・ケーキ",
  DRINK: "飲み物",
  ICE: "アイス",
  OTHER: "その他"
};

export const snackCategoryEmojis: Record<(typeof snackCategoryOptions)[number], string> = {
  SENBEI: "🍘",
  BISCUIT: "🍪",
  CHOCOLATE: "🍫",
  GUMMY: "🍬",
  SNACK: "🍩",
  FRUIT: "🍎",
  JELLY: "🍮",
  BREAD: "🍞",
  DRINK: "🧃",
  ICE: "🍦",
  OTHER: "🗂️"
};
