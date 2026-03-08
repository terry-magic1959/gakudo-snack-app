import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildAnalytics } from "@/lib/analytics";
import { getPeriodRange } from "@/lib/date";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const period = (url.searchParams.get("period") === "month" ? "month" : "week") as "week" | "month";
  const baseDate = url.searchParams.get("date") ? new Date(String(url.searchParams.get("date"))) : new Date();
  const range = getPeriodRange(baseDate, period);

  const [logs, orders] = await Promise.all([
    prisma.servingLog.findMany({
      where: {
        servedDate: {
          gte: range.start,
          lte: range.end
        }
      },
      include: {
        snack: {
          select: { id: true, name: true, category: true }
        }
      },
      orderBy: { servedDate: "desc" }
    }),
    prisma.orderBatch.findMany({
      where: {
        orderedDate: {
          gte: range.start,
          lte: range.end
        }
      },
      include: {
        items: {
          include: {
            snack: { select: { id: true, name: true } }
          }
        }
      },
      orderBy: { orderedDate: "desc" }
    })
  ]);

  const analytics = buildAnalytics({ logs, orders });
  return NextResponse.json({
    period,
    range: {
      start: range.start,
      end: range.end,
      label: range.label
    },
    ...analytics
  });
}
