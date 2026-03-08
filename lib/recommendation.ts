type SnackForRecommendation = {
  id: string;
  name: string;
  currentStock: number;
  minStockLevel: number;
  unit: string;
  packageSize: number;
  servingLogs: Array<{ servings: number; servedDate: Date }>;
};

export function buildOrderRecommendations(snacks: SnackForRecommendation[]) {
  const now = new Date();
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  return snacks
    .map((snack) => {
      const recentLogs = snack.servingLogs.filter((log) => log.servedDate >= twoWeeksAgo);
      const totalServings = recentLogs.reduce((sum, log) => sum + log.servings, 0);
      const estimatedPacksUsed = Math.ceil(totalServings / Math.max(snack.packageSize, 1));
      const suggestedQty = Math.max(0, snack.minStockLevel + estimatedPacksUsed - snack.currentStock);
      return {
        snackId: snack.id,
        snackName: snack.name,
        currentStock: snack.currentStock,
        minStockLevel: snack.minStockLevel,
        unit: snack.unit,
        recentServings: totalServings,
        suggestedQty
      };
    })
    .filter((row) => row.suggestedQty > 0)
    .sort((a, b) => b.suggestedQty - a.suggestedQty);
}
