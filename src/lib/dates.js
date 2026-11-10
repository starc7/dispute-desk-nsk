// Small helpers for dates and money. All dates are "YYYY-MM-DD" strings in UTC,
// so day counts never shift with time zones or daylight saving.

// The clock is frozen so the demo behaves the same on any day.
export const DEMO_TODAY = "2026-11-09";

const DAY = 86400000;
export const toMs = (d) => Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10));
export const diff = (a, b) => Math.round((toMs(b) - toMs(a)) / DAY); // days from a to b
export const addDays = (d, n) => new Date(toMs(d) + n * DAY).toISOString().slice(0, 10);
export const fmt = (d) =>
  new Date(toMs(d)).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
export const money = (n) => "$" + Math.round(n).toLocaleString("en-US");
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const now = () =>
  new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
