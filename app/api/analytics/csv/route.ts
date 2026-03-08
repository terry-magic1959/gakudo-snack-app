import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildAnalytics } from "@/lib/analytics";
import { getPeriodRange } from "@/lib/date";

function csvEscape(value: string | number | null | undefined) {
  const text = value === null || value === undefined ? "" : String(value);
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function buildCsv(rows: Array<Array<string | number | null | undefined>>) {
  return rows.map((row) => row.map(csvEscape).join(",")).join("\n");
}

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
      orderBy: { servedDate: "asc" }
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
          include: { snack: { select: { id: true, name: true } } },
          orderBy: { createdAt: "asc" }
        }
      },
      orderBy: { orderedDate: "asc" }
    })
  ]);

  const analytics = buildAnalytics({ logs, orders });
  const rows: Array<Array<string | number | null | undefined>> = [];

  rows.push(["学童クラブおやつレポート"]);
  rows.push(["集計単位", period === "week" ? "週別" : "月別"]);
  rows.push(["集計期間", range.label]);
  rows.push([]);

  rows.push(["サマリー"]);
  rows.push(["項目", "値"]);
  rows.push(["総配布数（人分）", analytics.summary.totalServings]);
  rows.push(["1日平均配布数", analytics.summary.averageServingsPerDay]);
  rows.push(["平均児童数（記録ベース）", analytics.summary.avgChildren]);
  rows.push(["発注合計（単位数）", analytics.summary.totalOrderedUnits]);
  rows.push(["発注金額合計", analytics.summary.totalOrderCost]);
  rows.push([]);

  rows.push(["人気おやつランキング"]);
  rows.push(["おやつ名", "分類", "配布数", "記録回数"]);
  for (const row of analytics.topSnacks) {
    rows.push([row.snackName, row.category, row.servings, row.logCount]);
  }
  rows.push([]);

  rows.push(["配布記録一覧"]);
  rows.push(["日付", "おやつ", "分類", "配布数", "児童数", "メモ"]);
  for (const log of logs) {
    rows.push([
      log.servedDate.toISOString().slice(0, 10),
      log.snack.name,
      log.snack.category,
      log.servings,
      log.childrenCount,
      log.memo ?? ""
    ]);
  }
  rows.push([]);

  rows.push(["発注一覧"]);
  rows.push(["発注日", "状態", "発注先", "依頼者", "おやつ", "数量", "単価", "小計"]);
  for (const order of orders) {
    for (const item of order.items) {
      rows.push([
        order.orderedDate.toISOString().slice(0, 10),
        order.status,
        order.supplierName ?? "",
        order.requestedBy ?? "",
        item.snack.name,
        item.quantity,
        item.unitPrice ?? "",
        (item.unitPrice ?? 0) * item.quantity
      ]);
    }
  }

  const csv = buildCsv(rows);
  const bom = "\uFEFF";
  const fileName = `snack-report-${period}-${baseDate.toISOString().slice(0, 10)}.csv`;

  return new NextResponse(`${bom}${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`
    }
  });
}
