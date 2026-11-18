/**
 * Local Date Formatting Utilities
 *
 * Ensures date operations respect local device time (or Indian Standard Time, IST)
 * so daily counters, food logs, water logs, and health telemetry reset cleanly at
 * midnight local time instead of UTC midnight (which is 05:30 AM in IST).
 */

/**
 * Returns a "YYYY-MM-DD" date string in local device calendar time.
 * Avoids the UTC skew caused by .toISOString().split('T')[0].
 */
export function getLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formats a given date to local time string e.g. "08:30 AM"
 */
export function getLocalTimeString(d: Date = new Date()): string {
  const hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const formattedHours = hours % 12 || 12;
  return `${formattedHours}:${minutes} ${ampm}`;
}

