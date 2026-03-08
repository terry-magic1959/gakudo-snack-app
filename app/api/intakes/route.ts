import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { endOfDay, startOfDay } from "@/lib/date";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const where =
    from || to
      ? {
          servedDate: {
            gte: from ? startOfDay(new Date(from)) : undefined,
            lte: to ? endOfDay(new Date(to)) : undefined
          }
        }
      : {};

  const logs = await prisma.servingLog.findMany({
    where,
    include: { snack: true },
    orderBy: { servedDate: "desc" }
  });

  return NextResponse.json({ logs });
}

export async function POST(request: Request) {
  const body = await request.json();
  const snackId = String(body.snackId ?? "");
  const servings = Math.max(1, Math.floor(Number(body.servings ?? 0)));
  const childrenCount =
    body.childrenCount === null || body.childrenCount === undefined || body.childrenCount === ""
      ? null
      : Math.max(0, Math.floor(Number(body.childrenCount)));
  const servedDate = body.servedDate ? new Date(String(body.servedDate)) : new Date();
  const memo = body.memo ? String(body.memo) : null;

  if (!snackId) {
    return NextResponse.json({ error: "おやつを選択してください" }, { status: 400 });
  }
  if (!Number.isFinite(servings) || servings < 1) {
    return NextResponse.json({ error: "配布数が不正です" }, { status: 400 });
  }

  const result = await prisma.$transaction(async (tx) => {
    const snack = await tx.snack.findUnique({ where: { id: snackId } });
    if (!snack) {
      throw new Error("SNACK_NOT_FOUND");
    }

    const packsUsed = Math.ceil(servings / Math.max(snack.packageSize, 1));

    const log = await tx.servingLog.create({
      data: { snackId, servings, childrenCount, servedDate, memo }
    });

    await tx.stockMovement.create({
      data: {
        snackId,
        movementType: "OUT",
        quantity: packsUsed,
        reason: `配布(${servings}人分)`,
        movedAt: servedDate
      }
    });

    const updatedSnack = await tx.snack.update({
      where: { id: snackId },
      data: { currentStock: Math.max(0, snack.currentStock - packsUsed) }
    });

    return { log, updatedSnack, packsUsed };
  });

  return NextResponse.json(result, { status: 201 });
}
