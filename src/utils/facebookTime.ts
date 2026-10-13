/**
 * Facebook-style time formatting utility for posts and comments.
 * Emulates the exact display and tooltip behavior of Facebook timestamps:
 * - "Just now" for recent items (< 1 min)
 * - "1m", "5m", "45m" for minutes ago
 * - "1h", "2h", "18h" for hours ago
 * - "Yesterday at 3:45 PM" for yesterday
 * - "2d", "3d", "5d" for recent days
 * - "Oct 12 at 3:45 PM" for current year
 * - "Oct 12, 2024 at 3:45 PM" for past years
 *
 * Also provides full localized timestamp for Facebook-style hover tooltips.
 */

function parseDateInput(input: string | number | Date | undefined | null): Date | null {
  if (!input) return null;
  if (input instanceof Date) {
    return isNaN(input.getTime()) ? null : input;
  }
  if (typeof input === 'number') {
    const d = new Date(input);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (!trimmed) return null;
    if (trimmed.toLowerCase() === 'just now') return new Date();

    // Check if it's a numeric timestamp string
    if (/^\d{10,13}$/.test(trimmed)) {
      const num = Number(trimmed);
      const d = new Date(num > 1e11 ? num : num * 1000);
      if (!isNaN(d.getTime())) return d;
    }

    // Try standard Date parsing (ISO 8601, RFC2822, etc.)
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) return parsed;

    // Handle MM/DD/YYYY or DD/MM/YYYY
    const parts = trimmed.split(/[/.-]/);
    if (parts.length === 3) {
      const p1 = parseInt(parts[0], 10);
      const p2 = parseInt(parts[1], 10);
      const p3 = parseInt(parts[2], 10);
      if (!isNaN(p1) && !isNaN(p2) && !isNaN(p3)) {
        // Assume MM/DD/YYYY if p1 <= 12, or YYYY-MM-DD if p1 > 1000
        let year = p3;
        let month = p1 - 1;
        let day = p2;
        if (p1 > 1000) {
          year = p1;
          month = p2 - 1;
          day = p3;
        }
        const d = new Date(year, month, day);
        if (!isNaN(d.getTime())) return d;
      }
    }
  }
  return null;
}

/**
 * Formats a timestamp into an authentic Facebook-style post time string.
 */
export function formatFacebookTime(input: string | number | Date | undefined | null): string {
  if (!input) return 'Just now';
  if (typeof input === 'string' && input.trim().toLowerCase() === 'just now') {
    return 'Just now';
  }

  const date = parseDateInput(input);
  if (!date) {
    return typeof input === 'string' ? input : 'Just now';
  }

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();

  // If clock skew into future or within last 45 seconds
  if (diffMs < 45 * 1000) {
    return 'Just now';
  }

  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  // Under 60 minutes: e.g. "1m", "5m", "45m"
  if (diffMin < 60) {
    return `${Math.max(1, diffMin)}m`;
  }

  // Format time portion: e.g. "3:45 PM"
  const timeStr = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  // Under 24 hours
  if (diffHours < 24) {
    // If it was today
    if (date.getDate() === now.getDate() && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()) {
      return `${diffHours}h`;
    }
  }

  // Check if yesterday
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  if (isYesterday) {
    return `Yesterday at ${timeStr}`;
  }

  // Between 2 and 6 days: Facebook uses e.g. "2d", "3d", "5d"
  if (diffDays < 7) {
    return `${Math.max(1, diffDays)}d`;
  }

  const monthShort = date.toLocaleDateString('en-US', { month: 'short' });
  const day = date.getDate();

  // Current year: e.g. "Oct 12 at 3:45 PM"
  if (date.getFullYear() === now.getFullYear()) {
    // If it was midnight without explicit time info (e.g. from a raw date string)
    if (date.getHours() === 0 && date.getMinutes() === 0 && date.getSeconds() === 0) {
      return `${monthShort} ${day}`;
    }
    return `${monthShort} ${day} at ${timeStr}`;
  }

  // Past years: e.g. "Oct 12, 2024 at 3:45 PM" or "Oct 12, 2024"
  if (date.getHours() === 0 && date.getMinutes() === 0 && date.getSeconds() === 0) {
    return `${monthShort} ${day}, ${date.getFullYear()}`;
  }
  return `${monthShort} ${day}, ${date.getFullYear()} at ${timeStr}`;
}

/**
 * Returns a full Facebook-style localized timestamp for mouse hover tooltips (title attribute).
 * e.g. "Monday, October 12, 2026 at 4:32:15 PM"
 */
export function getFullFacebookTimestamp(input: string | number | Date | undefined | null): string {
  if (!input) return new Date().toLocaleString();
  if (typeof input === 'string' && input.trim().toLowerCase() === 'just now') {
    return `${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} at ${new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true })}`;
  }

  const date = parseDateInput(input);
  if (!date) return typeof input === 'string' ? input : '';

  const datePart = date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const timePart = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  return `${datePart} at ${timePart}`;
}
