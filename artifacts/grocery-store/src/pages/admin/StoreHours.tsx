import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useStoreSettings, useUpdateStoreSettings } from "@/hooks/use-store-status";
import { useAdminTranslation as useTranslation } from '@/lib/portalI18n';
import { Loader2, Save, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

type Day = typeof DAYS[number];
type DayEntry = { enabled: boolean; startTime: string; endTime: string };

const DAY_KEYS: Record<string, string> = {
  monday: "adminDayMonday",
  tuesday: "adminDayTuesday",
  wednesday: "adminDayWednesday",
  thursday: "adminDayThursday",
  friday: "adminDayFriday",
  saturday: "adminDaySaturday",
  sunday: "adminDaySunday",
};

export default function StoreHours() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { data, isLoading } = useStoreSettings();
  const { mutateAsync, isPending } = useUpdateStoreSettings();

  const schedule = data?.schedule || {};

  const [edited, setEdited] = useState<Record<string, DayEntry>>({});

  useEffect(() => {
    const entries: Record<string, DayEntry> = {};
    for (const day of DAYS) {
      const existing = schedule[day];
      entries[day] = {
        enabled: existing?.enabled ?? true,
        startTime: existing?.startTime ?? "08:00",
        endTime: existing?.endTime ?? "22:00",
      };
    }
    setEdited(entries);
  }, [data?.schedule]);

  const update = (day: Day, field: keyof DayEntry, value: string | boolean) => {
    setEdited((prev) => ({
      ...prev,
      [day]: { ...prev[day], [field]: value },
    }));
  };

  const handleSave = async () => {
    try {
      await mutateAsync({ schedule: edited });
      toast({ title: t("storeHoursSaved"), variant: "default" });
    } catch (error) {
      const message = error instanceof Error ? error.message : t("storeHoursFailed");
      toast({ title: t("storeHoursFailed"), description: message, variant: "destructive" });
    }
  };

  if (isLoading || Object.keys(edited).length === 0) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-green-100 p-2.5 rounded-xl text-green-600">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold">{t("storeHoursTitle")}</h2>
            <p className="text-sm text-muted-foreground">
              {t("adminStoreHoursDesc")}
            </p>
          </div>
        </div>
        <Button
          onClick={handleSave}
          disabled={isPending}
          className="gap-2 rounded-xl bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600"
        >
          {isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {t("saveChanges")}
        </Button>
      </div>

      <div className="bg-card border border-border/60 rounded-2xl overflow-hidden shadow-sm">
        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center px-6 py-3 border-b border-border/60 bg-muted/20">
          <p className="font-semibold text-sm text-muted-foreground">
            {t("adminStoreHoursDay")}
          </p>
          <p className="font-semibold text-sm text-muted-foreground w-16 text-center">
            {t("adminStoreHoursOpen")}
          </p>
          <p className="font-semibold text-sm text-muted-foreground">
            {t("adminStoreHoursFrom")}
          </p>
          <p className="font-semibold text-sm text-muted-foreground">
            {t("adminStoreHoursTo")}
          </p>
        </div>

        {DAYS.map((day) => (
          <div
            key={day}
            className={`grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center px-6 py-4 border-b border-border/40 last:border-b-0 ${
              !edited[day].enabled ? "opacity-50" : ""
            }`}
          >
            <p className="font-medium text-foreground">{t(DAY_KEYS[day])}</p>

            <div className="w-16 flex justify-center">
              <Switch
                checked={edited[day].enabled}
                onCheckedChange={(v) => update(day, "enabled", v)}
              />
            </div>

            <Input
              type="time"
              value={edited[day].startTime}
              onChange={(e) => update(day, "startTime", e.target.value)}
              disabled={!edited[day].enabled}
              className="w-36 rounded-xl border-green-100 focus:border-green-500 focus:ring-green-200"
            />

            <Input
              type="time"
              value={edited[day].endTime}
              onChange={(e) => update(day, "endTime", e.target.value)}
              disabled={!edited[day].enabled}
              className="w-36 rounded-xl border-green-100 focus:border-green-500 focus:ring-green-200"
            />
          </div>
        ))}
      </div>
    </AdminLayout>
  );
}
