export function formatBudapestDateTime(value?: string) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Budapest",
  }).format(date);
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

export function formatMemoryGigabytes(value?: string | null) {
  if (!value) return "—";

  const match = value.trim().match(/^([\d.]+)\s*([KMGTPE])?$/i);
  if (!match) return "—";

  const amount = Number.parseFloat(match[1]);
  if (!Number.isFinite(amount)) return "—";

  const unit = (match[2] ?? "G").toUpperCase();
  const powers = { K: -2, M: -1, G: 0, T: 1, P: 2, E: 3 } as const;
  const gigabytes = amount * 1024 ** powers[unit as keyof typeof powers];

  return `${gigabytes.toFixed(2)} GB`;
}
