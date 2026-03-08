import { NextResponse } from "next/server";
import { OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { buildOrderRecommendations } from "@/lib/recommendation";
import { endOfDay, startOfDay } from "@/lib/date";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("mode");

  if (mode === "recommend") {
    const snacks = await prisma.snack.findMany({
      where: { active: true },
      include: {
        servingLogs: {
          where: { servedDate: { gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) } }
        }
      }
    });
    const recommendations = buildOrderRecommendations(snacks);
    return NextResponse.json({ recommendations });
  }

  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const where =
    from || to
      ? {
        orderedDate: {
          gte: from ? startOfDay(new Date(from)) : undefined,
          lte: to ? endOfDay(new Date(to)) : undefined
        }
      }
      : {};

  const batches = await prisma.orderBatch.findMany({
    where,
    include: {
      items: {
        include: { snack: true },
        orderBy: { createdAt: "asc" }
      }
    },
    orderBy: { orderedDate: "desc" }
  });

  const summary = batches.map((batch) => ({
    ...batch,
    totalUnits: batch.items.reduce((sum, item) => sum + item.quantity, 0),
    totalCost: batch.items.reduce((sum, item) => sum + item.quantity * (item.unitPrice ?? 0), 0)
  }));

  return NextResponse.json({ batches: summary });
}

export async function POST(request: Request) {
  const body = await request.json();
  const orderedDate = body.orderedDate ? new Date(String(body.orderedDate)) : new Date();
  const supplierName = body.supplierName ? String(body.supplierName) : null;
  const requestedBy = body.requestedBy ? String(body.requestedBy) : null;
  const memo = body.memo ? String(body.memo) : null;
  const status = (String(body.status ?? "ORDERED") as OrderStatus) || OrderStatus.ORDERED;
  const items = Array.isArray(body.items) ? body.items : [];

  if (items.length === 0) {
    return NextResponse.json({ error: "発注明細がありません" }, { status: 400 });
  }

  const cleanedItems = items
    .map((item: unknown) => {
      const row = item as Record<string, unknown>;
      return {
        snackId: String(row.snackId ?? ""),
        quantity: Math.max(1, Math.floor(Number(row.quantity ?? 0))),
        unitPrice:
          row.unitPrice === null || row.unitPrice === undefined || row.unitPrice === ""
            ? null
            : Math.max(0, Math.floor(Number(row.unitPrice)))
      };
    })
    .filter((row: { snackId: string; quantity: number; unitPrice: number | null }) => row.snackId);

  if (cleanedItems.length === 0) {
    return NextResponse.json({ error: "有効な発注明細がありません" }, { status: 400 });
  }

  const batch = await prisma.$transaction(async (tx) => {
    const created = await tx.orderBatch.create({
      data: {
        orderedDate,
        supplierName,
        requestedBy,
        memo,
        status,
        items: {
          create: cleanedItems
        }
      },
      include: {
        items: { include: { snack: true } }
      }
    });

    if (status === OrderStatus.RECEIVED) {
      for (const item of cleanedItems) {
        const snack = await tx.snack.findUnique({ where: { id: item.snackId } });
        if (!snack) {
          continue;
        }
        await tx.stockMovement.create({
          data: {
            snackId: item.snackId,
            movementType: "IN",
            quantity: item.quantity,
            reason: "発注入荷",
            movedAt: orderedDate
          }
        });
        await tx.snack.update({
          where: { id: item.snackId },
          data: { currentStock: snack.currentStock + item.quantity }
        });
      }
    }

    return created;
  });

  return NextResponse.json({ batch }, { status: 201 });
}
