import { db } from "@workspace/db";
import { storeSettingsTable, type DayKey } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const CAIRO_TZ = "Africa/Cairo";

const DEFAULT_ENTRY = { enabled: true, startTime: "08:00", endTime: "22:00" };

function getCairoTimeParts(now: Date): { dayName: string; currentMinutes: number } {
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

  return { dayName: weekday, currentMinutes: hour * 60 + minute };
}

function isOpenBySchedule(
  daySchedule: { enabled: boolean; startTime: string; endTime: string },
  currentMinutes: number
): boolean {
  if (!daySchedule.enabled) return false;

  const [startH, startM] = daySchedule.startTime.split(":").map(Number);
  const [endH, endM] = daySchedule.endTime.split(":").map(Number);

  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  if (endMinutes > startMinutes) {
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }

  // Overnight schedule (e.g. 22:00 – 06:00)
  return currentMinutes >= startMinutes || currentMinutes < endMinutes;
}

export async function isStoreOpenNow(): Promise<boolean> {
  const rows = await db
    .select()
    .from(storeSettingsTable)
    .where(eq(storeSettingsTable.id, 1))
    .limit(1);

  const { dayName, currentMinutes } = getCairoTimeParts(new Date());

  if (rows.length === 0 || !rows[0].schedule) {
    // No saved schedule — apply the default (08:00–22:00 daily, matching UI defaults)
    return isOpenBySchedule(DEFAULT_ENTRY, currentMinutes);
  }

  const schedule = rows[0].schedule as Record<string, { enabled: boolean; startTime: string; endTime: string }>;

  // Use saved entry for the day, fall back to default if that day hasn't been configured yet
  const daySchedule = schedule[dayName] ?? DEFAULT_ENTRY;

  return isOpenBySchedule(daySchedule, currentMinutes);
}
