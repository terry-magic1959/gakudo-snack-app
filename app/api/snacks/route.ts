import { NextResponse } from "next/server";
import { SnackCategory } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const snacks = await prisma.snack.findMany({
    where: { active: true },
    orderBy: { createdAt: "desc" }
  });
  return NextResponse.json({ snacks });
}

export async function POST(request: Request) {
  const body = await request.json();
  const name = String(body.name ?? "").trim();
  const category = String(body.category ?? "OTHER") as SnackCategory;
  const unit = String(body.unit ?? "袋").trim() || "袋";
  const packageSize = Number(body.packageSize ?? 1);
  const minStockLevel = Number(body.minStockLevel ?? 0);
  const currentStock = Number(body.currentStock ?? 0);
  const allergenNote = body.allergenNote ? String(body.allergenNote) : null;
  const expirationDate = body.expirationDate ? new Date(String(body.expirationDate)) : null;

  if (!name) {
    return NextResponse.json({ error: "おやつ名は必須です" }, { status: 400 });
  }

  const snack = await prisma.snack.create({
    data: {
      name,
      category,
      unit,
      packageSize: Number.isFinite(packageSize) ? Math.max(1, Math.floor(packageSize)) : 1,
      minStockLevel: Number.isFinite(minStockLevel) ? Math.max(0, Math.floor(minStockLevel)) : 0,
      currentStock: Number.isFinite(currentStock) ? Math.max(0, Math.floor(currentStock)) : 0,
      allergenNote,
      expirationDate
    }
  });

  return NextResponse.json({ snack }, { status: 201 });
}

export async function PATCH(request: Request) {
  const body = await request.json();
  const id = String(body.id ?? "");

  if (!id) {
    return NextResponse.json({ error: "IDが必要です" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (body.expirationDate !== undefined) {
    data.expirationDate = body.expirationDate ? new Date(String(body.expirationDate)) : null;
  }
  if (body.name !== undefined) data.name = String(body.name).trim();
  if (body.allergenNote !== undefined) data.allergenNote = body.allergenNote ? String(body.allergenNote) : null;

  const snack = await prisma.snack.update({
    where: { id },
    data
  });

  return NextResponse.json({ snack });
}
