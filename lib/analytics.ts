type AnalyticsInput = {
  logs: Array<{
    servings: number;
    childrenCount: number | null;
    servedDate: Date;
    snack: { id: string; name: string; category: string };
  }>;
  orders: Array<{
    orderedDate: Date;
    items: Array<{ quantity: number; unitPrice: number | null; snack: { id: string; name: string } }>;
  }>;
};

export function buildAnalytics({ logs, orders }: AnalyticsInput) {
  const totalServings = logs.reduce((sum, l) => sum + l.servings, 0);
  const servingDays = new Set(logs.map((l) => l.servedDate.toISOString().slice(0, 10))).size;
  const averageServingsPerDay = servingDays ? Math.round((totalServings / servingDays) * 10) / 10 : 0;
  const totalChildren = logs.reduce((sum, l) => sum + (l.childrenCount ?? 0), 0);
  const avgChildren = logs.length ? Math.round((totalChildren / logs.length) * 10) / 10 : 0;

  const snackStats = new Map<
    string,
    { snackId: string; snackName: string; category: string; servings: number; logCount: number }
  >();

  for (const log of logs) {
    const current = snackStats.get(log.snack.id) ?? {
      snackId: log.snack.id,
      snackName: log.snack.name,
      category: log.snack.category,
      servings: 0,
      logCount: 0
    };
    current.servings += log.servings;
    current.logCount += 1;
    snackStats.set(log.snack.id, current);
  }

  // カテゴリ別集計
  const categoryStats = new Map<string, number>();
  for (const log of logs) {
    const cat = log.snack.category;
    categoryStats.set(cat, (categoryStats.get(cat) ?? 0) + log.servings);
  }
  const categoryBreakdown = [...categoryStats.entries()]
    .map(([category, servings]) => ({ category, servings }))
    .sort((a, b) => b.servings - a.servings);

  // 日別集計
  const dailyStats = new Map<string, number>();
  for (const log of logs) {
    const dayKey = log.servedDate.toISOString().slice(0, 10);
    dailyStats.set(dayKey, (dailyStats.get(dayKey) ?? 0) + log.servings);
  }
  const dailyBreakdown = [...dailyStats.entries()]
    .map(([date, servings]) => ({ date, servings }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const orderedItems = orders.flatMap((o) => o.items);
  const orderSummary = orderedItems.reduce(
    (acc, item) => {
      acc.totalUnits += item.quantity;
      acc.totalCost += (item.unitPrice ?? 0) * item.quantity;
      return acc;
    },
    { totalUnits: 0, totalCost: 0 }
  );

  const uniqueSnackCount = snackStats.size;

  return {
    summary: {
      totalServings,
      averageServingsPerDay,
      avgChildren,
      totalOrderedUnits: orderSummary.totalUnits,
      totalOrderCost: orderSummary.totalCost,
      servingDays,
      uniqueSnackCount
    },
    topSnacks: [...snackStats.values()].sort((a, b) => b.servings - a.servings).slice(0, 10),
    categoryBreakdown,
    dailyBreakdown,
    orders: orders.map((o) => ({
      orderedDate: o.orderedDate,
      itemCount: o.items.length,
      totalUnits: o.items.reduce((sum, item) => sum + item.quantity, 0),
      totalCost: o.items.reduce((sum, item) => sum + (item.unitPrice ?? 0) * item.quantity, 0)
    }))
  };
}
