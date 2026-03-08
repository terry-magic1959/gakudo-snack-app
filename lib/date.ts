export function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function getPeriodRange(baseDate: Date, period: "week" | "month") {
  const start = startOfDay(baseDate);
  if (period === "week") {
    const day = start.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const weekStart = addDays(start, diff);
    const weekEnd = endOfDay(addDays(weekStart, 6));
    return { start: weekStart, end: weekEnd, label: `${weekStart.toLocaleDateString()} - ${weekEnd.toLocaleDateString()}` };
  }

  const monthStart = new Date(start.getFullYear(), start.getMonth(), 1);
  const monthEnd = endOfDay(new Date(start.getFullYear(), start.getMonth() + 1, 0));
  return { start: monthStart, end: monthEnd, label: `${monthStart.getFullYear()}年${monthStart.getMonth() + 1}月` };
}
