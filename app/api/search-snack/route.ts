import { NextResponse } from "next/server";
import { searchSnackInfo } from "@/lib/web-search-classifier";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const query = String(body.query || "");

    if (!query) {
      return NextResponse.json({ error: "商品名を入力してください" }, { status: 400 });
    }

    const info = await searchSnackInfo(query);

    return NextResponse.json({ info });
  } catch (error) {
    console.error("Search Snack Info Error:", error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "情報の取得に失敗しました" 
    }, { status: 500 });
  }
}
