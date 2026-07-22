import type { HistoryPreset } from "../../shared/types/hpc";
import type { Language } from "./ui";

const dateLocales: Record<Language, string> = {
  en: "en-GB",
  de: "de-DE",
  hu: "hu-HU",
};

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

export function formatHistoryBucketLabel(value: string, preset: HistoryPreset, language: Language) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat(dateLocales[language], {
    month: preset === "24h" ? undefined : "short",
    day: preset === "1y" ? undefined : "2-digit",
    hour: preset === "30d" || preset === "1y" ? undefined : "2-digit",
    minute: preset === "30d" || preset === "1y" ? undefined : "2-digit",
    hour12: false,
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
