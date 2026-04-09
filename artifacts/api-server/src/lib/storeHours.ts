import { db } from "@workspace/db";
import { storeSettingsTable, type DayKey } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const DAY_MAP = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

export async function isStoreOpenNow(): Promise<boolean> {
  const rows = await db
    .select()
    .from(storeSettingsTable)
    .where(eq(storeSettingsTable.id, 1))
    .limit(1);

  if (rows.length === 0) return true;

  const { schedule } = rows[0];
  if (!schedule) return true;

  const now = new Date();
  const dayName = DAY_MAP[now.getDay()] as DayKey;
  const daySchedule = schedule[dayName as string];

  if (!daySchedule || !daySchedule.enabled) return false;

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
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
