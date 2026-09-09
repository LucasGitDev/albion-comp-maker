const DIVISIONS: ReadonlyArray<{ amount: number; unit: Intl.RelativeTimeFormatUnit }> = [
  { amount: 60, unit: "seconds" },
  { amount: 60, unit: "minutes" },
  { amount: 24, unit: "hours" },
  { amount: 7, unit: "days" },
  { amount: 4.34524, unit: "weeks" },
  { amount: 12, unit: "months" },
  { amount: Number.POSITIVE_INFINITY, unit: "years" },
];

/**
 * Formats `date` relative to `now` in pt-BR ("há 3 dias", "há 2 horas").
 * Hardcoded to `pt-BR` because the rest of the home dashboard copy is also
 * hardcoded PT-BR — proper locale-awareness is ACM-101's i18n follow-up,
 * out of scope here (see ACM-096 restrictions).
 */
export function formatRelativeTime(date: Date, now: Date = new Date()): string {
  const rtf = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });
  let duration = (date.getTime() - now.getTime()) / 1000;

  for (const division of DIVISIONS) {
    if (Math.abs(duration) < division.amount) {
      return rtf.format(Math.round(duration), division.unit);
    }
    duration /= division.amount;
  }

  return rtf.format(Math.round(duration), "years");
}
