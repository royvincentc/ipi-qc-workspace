import {reportDateRange} from './report-dates.js';

export interface ReceptionDayCount {
  date: string;
  counts: Record<string, number>;
  total: number;
}

export interface ReceptionSample {
  id: string;
  ml: string;
  category: string;
  categoryLabel?: string;
  name: string;
  batch: string;
  received: string;
  status: string;
  receiptDate: string | null;
  section?: string;
  location?: string;
  remarks?: string;
  context?: string;
}

export interface ReceptionOverview {
  month: string;
  today: string;
  startDate: string;
  endDate: string;
  days: ReceptionDayCount[];
  totals: Record<string, number>;
  total: number;
  items: ReceptionSample[];
  tableTotal: number;
  page: number;
  pageSize: number;
  statuses: string[];
  /** Global count of sample records with missing or unparseable received dates. */
  undated: number;
}

export const RECEPTION_DISPLAY_CATEGORIES = ['SFG', 'FG', 'ST', 'MIS', 'WS'] as const;

export const RECEPTION_CATEGORY_LABELS: Record<string, string> = {
  SFG: 'SFG',
  FG: 'FG',
  ST: 'STAB',
  MIS: 'MISC',
  WS: 'WATER',
  RM: 'RM',
  EM: 'EM',
};

export const RECEPTION_CATEGORY_ALIASES: Record<string, string> = {
  STAB: 'ST',
  MISC: 'MIS',
  WATER: 'WS',
};

export function formatReceptionCategory(category: string): string {
  return RECEPTION_CATEGORY_LABELS[category] || category;
}

export function resolveReceptionCategory(input: string): string {
  const upper = input.trim().toUpperCase();
  return RECEPTION_CATEGORY_ALIASES[upper] || upper;
}

export function calculateReceptionWindow(month: string, today: string): {
  month: string;
  startDate: string;
  endDate: string;
  dateList: string[];
  monthStart: string;
  monthEnd: string;
} {
  const currentMonth = today.slice(0, 7);
  let targetMonth = /^\d{4}-\d{2}$/.test(month) ? month : currentMonth;
  const [targetY, targetM] = targetMonth.split('-').map(Number);
  if (isNaN(targetY) || isNaN(targetM) || targetM < 1 || targetM > 12) {
    targetMonth = currentMonth;
  }
  if (targetMonth > currentMonth) {
    targetMonth = currentMonth;
  }
  const [y, m] = targetMonth.split('-').map(Number);
  const lastDayOfMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const lastDayStr = `${targetMonth}-${String(lastDayOfMonth).padStart(2, '0')}`;
  const endDate = targetMonth === currentMonth ? today : lastDayStr;

  const [ey, em, ed] = endDate.split('-').map(Number);
  const dateList: string[] = [];
  for (let i = 30; i >= 0; i--) {
    const d = new Date(Date.UTC(ey, em - 1, ed - i));
    const yStr = d.getUTCFullYear();
    const mStr = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dStr = String(d.getUTCDate()).padStart(2, '0');
    dateList.push(`${yStr}-${mStr}-${dStr}`);
  }
  return {
    month: targetMonth,
    startDate: dateList[0],
    endDate,
    dateList,
    monthStart: `${targetMonth}-01`,
    monthEnd: lastDayStr,
  };
}

/**
 * Safely parse a received date string without throwing on invalid dates or out-of-range times.
 * Handles:
 * - ISO date/datetime: YYYY-MM-DD or YYYY-MM-DD[ T]HH:mm...
 * - US date/datetime: MM/DD/YYYY or MM/DD/YYYY @ HH:mm AM/PM
 * Rejects invalid calendar days (e.g. 2026-02-30) and malformed times (e.g. 25:99).
 * Unzoned times use UTC for stable sorting; the calendar date stays as recorded.
 */
export function parseReceivedDate(raw: unknown): { date: string; timestamp: number } | null {
  if (typeof raw !== "string") return null;
  const s = raw.trim();
  if (!s) return null;

  // Format 1: ISO YYYY-MM-DD
  const isoMatch = s.match(/^(\d{4}-\d{2}-\d{2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2})(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/);
  if (isoMatch) {
    const dateStr = isoMatch[1];
    const day = reportDateRange(dateStr);
    if (!day) return null;

    if (isoMatch[2] !== undefined) {
      const hh = Number(isoMatch[2]);
      const mm = Number(isoMatch[3]);
      const ss = isoMatch[4] ? Number(isoMatch[4]) : 0;
      if (hh < 0 || hh > 23 || mm < 0 || mm > 59 || ss < 0 || ss > 59) return null;
      const parsedMs = Date.parse(
        `${dateStr}T${isoMatch[2].padStart(2, "0")}:${isoMatch[3]}:${isoMatch[4] || "00"}${isoMatch[5] || ""}${isoMatch[6] || "Z"}`
      );
      return Number.isFinite(parsedMs) ? {date: dateStr, timestamp: parsedMs} : null;
    }
    return { date: dateStr, timestamp: day.start };
  }

  // Format 2: US MM/DD/YYYY
  const usMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s*@\s*(\d{1,2}):(\d{2})(?:\s*([APap][Mm]))?)?$/);
  if (usMatch) {
    const dateStr = `${usMatch[3]}-${usMatch[1].padStart(2, "0")}-${usMatch[2].padStart(2, "0")}`;
    const day = reportDateRange(dateStr);
    if (!day) return null;

    if (usMatch[4] !== undefined) {
      let hh = Number(usMatch[4]);
      const mm = Number(usMatch[5]);
      const ampm = usMatch[6]?.toUpperCase();
      if (ampm) {
        if (hh < 1 || hh > 12 || mm < 0 || mm > 59) return null;
        if (ampm === "PM" && hh < 12) hh += 12;
        if (ampm === "AM" && hh === 12) hh = 0;
      } else {
        if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
      }
      return { date: dateStr, timestamp: day.start + (hh * 60 + mm) * 60_000 };
    }
    return { date: dateStr, timestamp: day.start };
  }
  return null;
}
