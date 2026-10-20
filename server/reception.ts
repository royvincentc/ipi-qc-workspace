import type {Express} from "express";
import type {DB} from "./db.js";
import {
  type ReceptionOverview,
  type ReceptionSample,
  calculateReceptionWindow,
  parseReceivedDate,
  resolveReceptionCategory,
} from "../shared/reception.js";

const CATEGORY_PRIORITY = ["SFG", "FG", "ST", "MIS", "WS", "RM", "EM"];

function categoryOrder(cat: string): number {
  const idx = CATEGORY_PRIORITY.indexOf(cat);
  if (idx !== -1) return idx;
  if (cat === "UNKNOWN") return 999;
  return 100;
}

export function registerReception(
  app: Express,
  receptionDb?: DB,
  dependencies: {timezone?: string; now?: () => Date} = {},
) {
  app.get("/api/reception", async (req, res) => {
    const timezone = (dependencies.timezone ??
      (await (await import("./configuration.js")).getConfiguration()).value.general.timezone) || "Asia/Manila";

    const today = new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(dependencies.now?.() ?? new Date());
    const currentMonth = today.slice(0, 7);

    // Validate month query parameter if present
    const rawMonth = typeof req.query.month === "string" ? req.query.month.trim() : "";
    if (rawMonth) {
      if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(rawMonth)) {
        return res.status(400).json({ error: "Invalid month format, expected YYYY-MM" });
      }
      if (rawMonth > currentMonth) {
        return res.status(400).json({ error: "Future month queries are not supported" });
      }
    }
    const targetMonth = rawMonth || currentMonth;

    // Validate date query parameter if present
    const rawDate = typeof req.query.date === "string" ? req.query.date.trim() : "";
    let selectedDate: string | null = null;
    if (rawDate) {
      if (!/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(rawDate) || !parseReceivedDate(rawDate)) {
        return res.status(400).json({ error: "Invalid date parameter" });
      }
      if (rawDate > today) {
        return res.status(400).json({ error: "Future date queries are not supported" });
      }
      selectedDate = rawDate;
    }

    const win = calculateReceptionWindow(targetMonth, today);
    // Month totals current cap at today to exclude future receipt dates
    const monthEndForTotals = targetMonth === currentMonth ? today : win.monthEnd;

    // shortcut: scan compact rows to tolerate mixed receipt formats; index normalized dates when volume causes latency.
    const queryDb = receptionDb ?? (await import("./db.js")).db;
    const rows = (await queryDb.query(
      `SELECT 
        samples.id,
        COALESCE(data->>'ml', '') AS ml,
        COALESCE(NULLIF(data->>'category', ''), 'UNKNOWN') AS category,
        COALESCE(data->>'categoryLabel', '') AS "categoryLabel",
        COALESCE(data->>'name', '') AS name,
        COALESCE(data->>'batch', '') AS batch,
        COALESCE(data->>'received', '') AS received,
        COALESCE(NULLIF(data->>'status', ''), 'Not recorded') AS status,
        data->'source'->>'section' AS section,
        COALESCE(data->'fields'->>'area', data->'fields'->>'facility', '') AS location,
        COALESCE(data->>'remarks', '') AS remarks,
        COALESCE(data->>'context', '') AS context
       FROM samples`
    )).rows;

    const daysMap = new Map<string, { counts: Record<string, number>; total: number }>();
    for (const d of win.dateList) {
      daysMap.set(d, { counts: {}, total: 0 });
    }

    const totals: Record<string, number> = {};
    let total = 0;
    let undated = 0;
    const statusSet = new Set<string>();

    interface EnrichedSample extends ReceptionSample {
      receiptTimestamp: number | null;
    }

    const allSamples: EnrichedSample[] = [];

    for (const row of rows) {
      statusSet.add(row.status);

      const parsed = parseReceivedDate(row.received);
      const receiptDate = parsed?.date ?? null;
      const receiptTimestamp = parsed?.timestamp ?? null;

      const sample: EnrichedSample = {
        id: row.id,
        ml: row.ml,
        category: resolveReceptionCategory(row.category) || "UNKNOWN",
        categoryLabel: row.categoryLabel || undefined,
        name: row.name,
        batch: row.batch,
        received: row.received,
        status: row.status,
        receiptDate,
        receiptTimestamp,
        section: row.section || undefined,
        location: row.location || undefined,
        remarks: row.remarks || undefined,
        context: row.context || undefined,
      };

      if (!parsed) {
        undated++;
      } else {
        // Chart aggregation: 31-day window
        if (parsed.date >= win.startDate && parsed.date <= win.endDate) {
          const dayEntry = daysMap.get(parsed.date);
          if (dayEntry) {
            dayEntry.counts[sample.category] = (dayEntry.counts[sample.category] || 0) + 1;
            dayEntry.total += 1;
          }
        }

        // Selected month totals (capped at today for current month)
        if (parsed.date >= win.monthStart && parsed.date <= monthEndForTotals) {
          totals[sample.category] = (totals[sample.category] || 0) + 1;
          total += 1;
        }
      }

      allSamples.push(sample);
    }

    const days = win.dateList.map(date => ({
      date,
      counts: daysMap.get(date)!.counts,
      total: daysMap.get(date)!.total,
    }));

    const statuses = Array.from(statusSet).sort();

    // Table filtering
    const rawCategory = typeof req.query.category === "string" ? req.query.category.trim() : "";
    const resolvedCategory = rawCategory ? resolveReceptionCategory(rawCategory) : "";
    const rawStatus = typeof req.query.status === "string" ? req.query.status.trim() : "";
    const rawQ = typeof req.query.q === "string" ? req.query.q.trim().slice(0, 200).toLowerCase() : "";

    const filtered = allSamples.filter(item => {
      // Date filter: if selectedDate specified, match that day; otherwise default to selected month
      if (selectedDate) {
        if (item.receiptDate !== selectedDate) return false;
      } else {
        if (!item.receiptDate || item.receiptDate < win.monthStart || item.receiptDate > monthEndForTotals) {
          return false;
        }
      }

      // Category filter
      if (rawCategory) {
        if (rawCategory === "UNKNOWN") {
          if (item.category !== "UNKNOWN") return false;
        } else {
          if (item.category !== resolvedCategory && item.category !== rawCategory) return false;
        }
      }

      // Status filter
      if (rawStatus) {
        if (item.status !== rawStatus) return false;
      }

      // Query filter
      if (rawQ) {
        const text = [item.ml, item.name, item.batch, item.section, item.location, item.remarks, item.context, item.id]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!text.includes(rawQ)) return false;
      }

      return true;
    });

    // Table sorting: category ordering with newest within each group across pages
    filtered.sort((a, b) => {
      const catDiff = categoryOrder(a.category) - categoryOrder(b.category);
      if (catDiff !== 0) return catDiff;
      const catAlpha = a.category.localeCompare(b.category);
      if (catAlpha !== 0) return catAlpha;

      // Newest within each category group
      const timeDiff = (b.receiptTimestamp ?? -Infinity) - (a.receiptTimestamp ?? -Infinity);
      if (timeDiff !== 0) return timeDiff;

      const mlDiff = (b.ml || "").localeCompare(a.ml || "");
      if (mlDiff !== 0) return mlDiff;
      return (b.id || "").localeCompare(a.id || "");
    });

    // Pagination
    const pageSize = 30;
    const tableTotal = filtered.length;
    const maxPage = Math.max(1, Math.ceil(tableTotal / pageSize));
    const rawPage = Math.floor(Number(req.query.page)) || 1;
    const page = Math.max(1, Math.min(rawPage, maxPage));
    const offset = (page - 1) * pageSize;

    const items: ReceptionSample[] = filtered.slice(offset, offset + pageSize).map(
      ({ receiptTimestamp, ...item }) => item
    );

    const response: ReceptionOverview = {
      month: win.month,
      today,
      startDate: win.startDate,
      endDate: win.endDate,
      days,
      totals,
      total,
      items,
      tableTotal,
      page,
      pageSize,
      statuses,
      undated,
    };

    res.json(response);
  });
}
