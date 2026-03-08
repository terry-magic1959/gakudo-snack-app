import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { classifySnackImage } from "@/lib/classifier";

export async function POST(request: Request) {
  const body = await request.json();
  const fileName = String(body.fileName ?? "unknown.jpg");
  const imageDataUrl = body.imageDataUrl ? String(body.imageDataUrl) : "";
  const imageDataUrl2 = body.imageDataUrl2 ? String(body.imageDataUrl2) : "";

  if (!imageDataUrl) {
    return NextResponse.json({ error: "画像データがありません" }, { status: 400 });
  }

  const predictions = await classifySnackImage({ fileName, imageDataUrl, imageDataUrl2 });
  const prediction = predictions[0]; // 最も確信度の高い結果を使用

  const matchedSnack = await prisma.snack.findFirst({
    where: {
      name: {
        contains: prediction.name.replace("未分類", "")
      }
    }
  });

  const photo = await prisma.snackPhoto.create({
    data: {
      fileName,
      imageDataUrl,
      imageDataUrl2,
      predictedName: prediction.name,
      predictedCategory: prediction.category,
      confidence: prediction.confidence,
      provider: prediction.provider,
      snackId: matchedSnack?.id
    }
  });

  return NextResponse.json({
    predictions,
    prediction,
    matchedSnack,
    photo
  });
}
