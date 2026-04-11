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

export default function StoreHours() {
  const { t, lang } = useTranslation();
  const { toast } = useToast();
  const { data, isLoading } = useStoreSettings();
  const { mutateAsync, isPending } = useUpdateStoreSettings();

  const schedule = data?.schedule || {};

  const [edited, setEdited] = useState<Record<string, DayEntry>>({});

  // Sync edited state when data arrives from the server
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

  const dayLabel = (day: string) => {
    if (lang === "ar") {
      const arLabels: Record<string, string> = {
        monday: "\u0627\u0644\u0627\u062B\u0646\u064A\u0646",
        tuesday: "\u0627\u0644\u062B\u0644\u0627\u062B\u0627\u0621",
        wednesday: "\u0627\u0644\u0623\u0631\u0628\u0639\u0627\u0621",
        thursday: "\u0627\u0644\u062E\u0645\u064A\u0633",
        friday: "\u0627\u0644\u062C\u0645\u0639\u0629",
        saturday: "\u0627\u0644\u0633\u0628\u062A",
        sunday: "\u0627\u0644\u0623\u062D\u062F",
      };
      return arLabels[day] || day;
    }
    return day.charAt(0).toUpperCase() + day.slice(1);
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
              {lang === "ar"
                ? "\u062A\u062D\u062F\u064A\u062F \u0633\u0627\u0639\u0627\u062A \u0627\u0644\u0639\u0645\u0644 \u0644\u0644\u0645\u062A\u062C\u0631"
                : "Set the store's working hours and days. Orders placed outside these times will be rejected."}
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

      <div className="bg-white border border-green-100/60 rounded-2xl overflow-hidden shadow-sm">
        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center px-6 py-3 border-b border-green-100/60 bg-muted/20">
          <p className="font-semibold text-sm text-muted-foreground">
            {lang === "ar" ? "\u0627\u0644\u064A\u0648\u0645" : "Day"}
          </p>
          <p className="font-semibold text-sm text-muted-foreground w-16 text-center">
            {lang === "ar" ? "\u0645\u0641\u062A\u0648\u062D" : "Open"}
          </p>
          <p className="font-semibold text-sm text-muted-foreground">
            {lang === "ar" ? "\u0645\u0646" : "From"}
          </p>
          <p className="font-semibold text-sm text-muted-foreground">
            {lang === "ar" ? "\u0625\u0644\u0649" : "To"}
          </p>
        </div>

        {DAYS.map((day, i) => (
          <div
            key={day}
            className={`grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center px-6 py-4 border-b border-green-100/40 last:border-b-0 ${
              !edited[day].enabled ? "opacity-50" : ""
            }`}
          >
            <p className="font-medium text-foreground">{dayLabel(day)}</p>

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
