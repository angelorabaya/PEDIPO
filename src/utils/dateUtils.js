/**
 * Format a date from the API for display in Manila timezone.
 *
 * SQL Server's GETDATE() returns local Manila time, but the mssql driver
 * serialises DATETIME values with a UTC "Z" suffix. If we pass that string
 * straight to `new Date()` the browser interprets it as UTC and the
 * subsequent Asia/Manila conversion adds another +8 h – doubling the offset.
 *
 * Stripping the trailing "Z" makes `new Date()` treat the value as local
 * time, which is correct because the server is in the same timezone as
 * the intended display (Asia/Manila).
 *
 * @param {string|Date|null} value  – date value from the API
 * @param {Intl.DateTimeFormatOptions} [opts] – extra options forwarded to
 *   `toLocaleString` (e.g. `{ month: "short", day: "numeric" }`)
 * @returns {string} formatted date string, or "-" when the input is empty
 */
export function formatDate(value, opts = {}) {
  if (!value) return "-";

  const raw = value instanceof Date ? value.toISOString() : String(value);
  const cleaned = raw.replace("Z", "");

  const date = new Date(cleaned);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("en-PH", {
    timeZone: "Asia/Manila",
    ...opts,
  });
}
