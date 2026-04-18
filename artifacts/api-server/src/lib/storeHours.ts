import { db } from "@workspace/db";
import { storeSettingsTable, type DayKey } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const CAIRO_TZ = "Africa/Cairo";
const DAY_MAP = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

function getCairoTimeParts(now: Date): { dayName: DayKey; currentMinutes: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: CAIRO_TZ,
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);

  const weekday = parts.find((p) => p.type === "weekday")?.value?.toLowerCase() ?? "sunday";
  const hourRaw = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10);
  const minute = parseInt(parts.find((p) => p.type === "minute")?.value ?? "0", 10);
  const hour = hourRaw === 24 ? 0 : hourRaw;

  return {
    dayName: weekday as DayKey,
    currentMinutes: hour * 60 + minute,
  };
}

export async function isStoreOpenNow(): Promise<boolean> {
  const rows = await db
    .select()
    .from(storeSettingsTable)
    .where(eq(storeSettingsTable.id, 1))
    .limit(1);

  if (rows.length === 0) return true;

  const { schedule } = rows[0];
  if (!schedule) return true;

  const { dayName, currentMinutes } = getCairoTimeParts(new Date());
  const daySchedule = schedule[dayName as string];

  if (!daySchedule || !daySchedule.enabled) return false;

  const [startH, startM] = daySchedule.startTime.split(":").map(Number);
  const [endH, endM] = daySchedule.endTime.split(":").map(Number);

  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  if (endMinutes > startMinutes) {
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }

  // Overnight schedule (e.g. 22:00 - 06:00)
  return currentMinutes >= startMinutes || currentMinutes < endMinutes;
}
