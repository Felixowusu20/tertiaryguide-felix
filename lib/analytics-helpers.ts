export type DayCount = { dayLabel: string; date: string; count: number };

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function dateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function buildLast7DaysSeries(
  countsByDate: Map<string, number>,
): DayCount[] {
  const series: DayCount[] = [];
  const today = startOfDay(new Date());

  for (let offset = 6; offset >= 0; offset -= 1) {
    const day = new Date(today);
    day.setDate(today.getDate() - offset);
    const key = dateKey(day);
    series.push({
      date: key,
      dayLabel: day.toLocaleDateString("en-US", { weekday: "short" }),
      count: countsByDate.get(key) ?? 0,
    });
  }

  return series;
}

export function peakFromSeries(series: DayCount[]): string | null {
  if (!series.length) return null;
  let peak: DayCount | null = null;
  for (const item of series) {
    if (!peak || item.count > peak.count) peak = item;
  }
  return peak && peak.count > 0 ? peak.dayLabel : null;
}
