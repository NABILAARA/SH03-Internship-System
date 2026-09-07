/**
 * Format program period dari startDate + endDate ke string yang terbaca manusia.
 * Contoh: "1 Jul 2026 – 31 Des 2026"
 */
export function formatPeriod(
  startDate: Date | string | null | undefined,
  endDate: Date | string | null | undefined
): string {
  const fmt = (d: Date | string) =>
    new Date(d).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  if (startDate && endDate) return `${fmt(startDate)} – ${fmt(endDate)}`;
  if (startDate) return `Mulai ${fmt(startDate)}`;
  if (endDate)   return `s.d. ${fmt(endDate)}`;
  return "Periode belum ditentukan";
}
