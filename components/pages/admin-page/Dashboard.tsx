"use client";

import * as React from "react";
import {
  AlertCircle,
  Cpu,
  Database,
  History,
  Layers,
  MapPin,
  Upload,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabase/client";
import { useAdminAuth } from "@/components/pages/admin-page/AdminAuthContext";

interface DistrictRef {
  id: string
  district_code: string
  name: string
}

interface KsaRow {
  segment_id: string
  periode: string
}

interface ActivityLogRow {
  id: string
  actor_id: string | null
  actor_name: string | null
  action_type: string | null
  module: string | null
  description: string | null
  created_at: string | null
}
function formatPeriodLabel(periode: string) {
  const [year, month] = periode.split("-").map(Number);
  if (!year || !month) return periode;
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
}

function getProgressColor(percent: number) {
  if (percent >= 80) return "bg-emerald-500";
  if (percent >= 40) return "bg-amber-500";
  return "bg-destructive";
}

function getActivityIcon(module: string | null) {
  switch (module) {
    case "import_data":
      return Upload;
    case "kelola_data":
      return Database;
    case "referensi_wilayah":
      return MapPin;
    case "model_prediksi":
      return Cpu;
    default:
      return Database;
  }
}

function formatRelativeTime(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "Baru saja";
  if (diffMin < 60) return `${diffMin} menit lalu`;

  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} jam lalu`;

  const diffDay = Math.floor(diffHour / 24);
  if (diffDay === 1) return "Kemarin";
  if (diffDay < 7) return `${diffDay} hari lalu`;

  return date.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

function getCardAccent(
  title: string,
  value?: string
): { iconBg: string; iconColor: string; borderColor: string } {
  switch (title) {
    case "Total segmen":
      return {
        iconBg: "bg-blue-100 dark:bg-blue-900/20",
        iconColor: "text-blue-700 dark:text-blue-200",
        borderColor: "border-l-blue-400",
      };
    case "Observasi periode aktif":
      return {
        iconBg: "bg-emerald-100 dark:bg-emerald-900/20",
        iconColor: "text-emerald-700 dark:text-emerald-200",
        borderColor: "border-l-emerald-400",
      };
    case "Kecamatan terdata": {
      const [done, total] = (value ?? "").split("/");
      const allComplete = done === total && total !== undefined;
      if (allComplete) {
        return {
          iconBg: "bg-emerald-100 dark:bg-emerald-900/20",
          iconColor: "text-emerald-700 dark:text-emerald-200",
          borderColor: "border-l-emerald-400",
        };
      }
      return {
        iconBg: "bg-amber-100 dark:bg-amber-900/20",
        iconColor: "text-amber-700 dark:text-amber-200",
        borderColor: "border-l-amber-400",
      };
    }
    default:
      return {
        iconBg: "bg-emerald-100 dark:bg-emerald-900/20",
        iconColor: "text-emerald-700 dark:text-emerald-200",
        borderColor: "border-l-emerald-400",
      };
  }
}

interface DistrictProgressItem {
  name: string
  active: number
  baseline: number
  percent: number
}

/** Percent of observed segments in the active period vs the best baseline period, per district */
function computeDistrictProgress(
  districtList: DistrictRef[],
  ksaRows: KsaRow[],
  baselineRows: KsaRow[]
): DistrictProgressItem[] {
  return districtList
    .map((district) => {
      const byPeriod = new Map<string, Set<string>>();
      baselineRows.forEach((row) => {
        if (!row.segment_id.startsWith(district.district_code)) return;
        const set = byPeriod.get(row.periode) ?? new Set<string>();
        set.add(row.segment_id);
        byPeriod.set(row.periode, set);
      });

      let baseline = 0;
      byPeriod.forEach((set) => {
        if (set.size > baseline) baseline = set.size;
      });

      const activeSet = new Set(
        ksaRows
          .filter((row) => row.segment_id.startsWith(district.district_code))
          .map((row) => row.segment_id)
      );
      const active = activeSet.size;
      const effectiveBaseline = baseline === 0 && active > 0 ? active : baseline;
      const percent =
        effectiveBaseline > 0
          ? Math.min(100, Math.round((active / effectiveBaseline) * 100))
          : 0;

      return { name: district.name, active, baseline: effectiveBaseline, percent };
    })
    .sort((a, b) => b.percent - a.percent);
}

async function fetchLatestPeriod(): Promise<string | null> {
  const { data } = await supabase
    .from("data_ksa")
    .select("periode")
    .order("periode", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.periode ?? null;
}

export default function Dashboard() {
  const [districtList, setDistrictList] = React.useState<DistrictRef[]>([]);
  const [ksaRows, setKsaRows] = React.useState<KsaRow[]>([]);
  const [baselineRows, setBaselineRows] = React.useState<KsaRow[]>([]);
  const [activityLogs, setActivityLogs] = React.useState<ActivityLogRow[]>([]);
  const [activePeriod, setActivePeriode] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(true);
  const [isLogLoading, setIsLogLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [logError, setLogError] = React.useState<string | null>(null);

  const fetchLatestPeriodCb = React.useCallback(async () => {
    const periode = await fetchLatestPeriod();
    if (periode) setActivePeriode(periode);
  }, []);

  const fetchSummaryData = React.useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);

    let district: { id: string; district_code: string; name: string }[] | null;
    let ksa: { segment_id: string; periode: string }[] | null;
    let baseline: { segment_id: string; periode: string }[] | null;

    try {
      const results = await Promise.all([
        supabase.from("districts").select("id, district_code, name"),
        supabase
          .from("data_ksa")
          .select("segment_id, periode")
          .eq("periode", activePeriod),
        supabase
          .from("data_ksa")
          .select("segment_id, periode")
          .order("periode", { ascending: false })
          .range(0, 999),
        supabase
          .from("data_ksa")
          .select("segment_id, periode")
          .order("periode", { ascending: false })
          .range(1000, 1999),
      ]);

      if (results.some((result) => result.error)) {
        setLoadError("Gagal memuat data ringkasan dari database.");
        setIsLoading(false);
        return;
      }

      district = results[0].data;
      ksa = results[1].data;
      baseline = [...(results[2].data ?? []), ...(results[3].data ?? [])];
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : "Gagal memuat data ringkasan dari database."
      );
      setIsLoading(false);
      return;
    }

    setDistrictList(district ?? []);
    setKsaRows(ksa ?? []);
    setBaselineRows(baseline ?? []);
    setIsLoading(false);
  }, [activePeriod]);

  const fetchActivityLogs = React.useCallback(async () => {
    setIsLogLoading(true);
    setLogError(null);
    try {
      const { data, error } = await supabase
        .from("activity_log")
        .select("id, actor_id, actor_name, action_type, module, description, created_at")
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) {
        setLogError("Gagal memuat aktivitas terbaru dari database.");
        setIsLogLoading(false);
        return;
      }

      setActivityLogs(data ?? []);
    } catch (error) {
      setLogError(
        error instanceof Error
          ? error.message
          : "Gagal memuat aktivitas terbaru dari database."
      );
    }
    setIsLogLoading(false);
  }, []);

  React.useEffect(() => {
    fetchLatestPeriodCb();
    fetchActivityLogs();
  }, [fetchLatestPeriodCb, fetchActivityLogs]);

  React.useEffect(() => {
    fetchSummaryData();
  }, [fetchSummaryData]);

  React.useEffect(() => {
    const channel = supabase
      .channel("dashboard-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "data_ksa" },
        () => {
          fetchLatestPeriodCb();
          fetchSummaryData();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "activity_log" },
        () => {
          fetchActivityLogs();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "districts" },
        () => {
          fetchSummaryData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchSummaryData, fetchActivityLogs, fetchLatestPeriodCb]);

  const totalSegmen = React.useMemo(
    () => new Set(ksaRows.map((row) => row.segment_id)).size,
    [ksaRows]
  );

  const districtProgress = React.useMemo(
    () => computeDistrictProgress(districtList, ksaRows, baselineRows),
    [districtList, ksaRows, baselineRows]
  );

  const districtCompleteCount = districtProgress.filter((item) => item.percent === 100).length;

  const summaryItems = [
    { title: "Total segmen", value: String(totalSegmen), icon: Database },
    { title: "Observasi periode aktif", value: String(ksaRows.length), icon: Upload },
    { title: "Kecamatan terdata", value: `${districtCompleteCount}/${districtList.length}`, icon: Layers },
  ];

  const { name, role } = useAdminAuth();
  const needyCount = districtProgress.filter((k) => k.percent < 80).length;
  const goodDistricts = districtProgress.filter((k) => k.percent >= 80);
  const warningDistricts = districtProgress.filter((k) => k.percent >= 40 && k.percent < 80);
  const criticalDistricts = districtProgress.filter((k) => k.percent < 40);

  const districtGroups = [
    {
      key: "good",
      label: "Baik",
      items: goodDistricts,
      chipClass:
        "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-200",
    },
    {
      key: "warning",
      label: "Perlu Perhatian",
      items: warningDistricts,
      chipClass:
        "bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-200",
    },
    {
      key: "critical",
      label: "Kritis",
      items: criticalDistricts,
      chipClass:
        "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-200",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Selamat datang kembali
        </p>
        <h1 className="text-2xl font-bold capitalize text-slate-900 dark:text-slate-100">
          {name || (role === "superadmin" ? "Superadmin" : "Admin")}
        </h1>
        <p
          className={cn(
            "mt-1 text-sm",
            needyCount > 0
              ? "text-amber-600 dark:text-amber-400"
              : "text-emerald-600 dark:text-emerald-400"
          )}
        >
          {needyCount > 0
            ? `${needyCount} kecamatan masih memerlukan pelengkapan data periode aktif.`
            : "Semua kecamatan sudah melengkapi data periode aktif."}
        </p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Periode data aktif: {formatPeriodLabel(activePeriod)}
        </p>
      </div>

      {loadError && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <div>
            <p className="font-medium">Gagal memuat data ringkasan</p>
            <p className="mt-0.5 text-red-600/90 dark:text-red-400/90">
              {loadError} Data berikut mungkin tidak akurat atau kosong.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {isLoading
          ? Array.from({ length: 3 }).map((_, index) => (
              <Card
                key={index}
                className="rounded-xl border border-l-4 border-l-slate-200 shadow-sm dark:border-l-slate-800"
              >
                <CardHeader className="px-5 pt-5">
                  <div className="flex items-center gap-3">
                    <span className="h-10 w-10 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
                    <span className="h-4 w-36 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                  </div>
                </CardHeader>
                <CardContent className="px-5 pb-5 pt-3">
                  <span className="block h-8 w-20 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
                </CardContent>
              </Card>
            ))
          : summaryItems.map((item) => {
          const Icon = item.icon;
          const accent = getCardAccent(item.title, item.value);
          return (
            <Card
              key={item.title}
              className={cn("rounded-xl border shadow-sm border-l-4", accent.borderColor)}
            >
              <CardHeader className="px-5 pt-5">
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "inline-flex h-10 w-10 items-center justify-center rounded-2xl",
                      accent.iconBg,
                      accent.iconColor
                    )}
                  >
                    <Icon className="size-5" />
                  </span>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                    {item.title}
                  </p>
                </div>
              </CardHeader>
              <CardContent className="px-5 pb-5 pt-3">
                <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                  {item.value}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <div className="grid gap-4 xl:grid-cols-[60%_40%]">
        <Card className="rounded-xl border shadow-sm">
          <CardHeader className="px-5 pb-0 pt-4">
            <CardTitle className="mb-0">Status Kelengkapan Data per Kecamatan</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5 pt-0">
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="h-3.5 w-28 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                      <span className="h-3.5 w-14 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                    </div>
                    <div className="h-2 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" />
                  </div>
                ))}
              </div>
            ) : districtList.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center dark:border-slate-800 dark:bg-slate-900/50">
                <Layers className="mx-auto mb-2 size-6 text-slate-400 dark:text-slate-500" />
                <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                  Belum ada data kecamatan
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Tambahkan referensi wilayah untuk melihat status kelengkapan.
                </p>
              </div>
            ) : (
              districtGroups.map((group, groupIndex) =>
                group.items.length ? (
                  <div key={group.key} className={groupIndex === 0 ? "" : "mt-4"}>
                    <div className="mb-3 flex items-center gap-2">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
                          group.chipClass
                        )}
                      >
                        {group.label} ({group.items.length} kecamatan)
                      </span>
                    </div>
                    {group.items.map((item) => (
                      <div
                        key={item.name}
                        className="space-y-2 rounded-xl px-2 py-2 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      >
                        <div className="flex items-center justify-between text-sm font-medium text-slate-700 dark:text-slate-200">
                          <span>{item.name}</span>
                          <span className="flex items-center gap-2">
                            {item.baseline > 0 ? (
                              <span className="text-xs text-slate-500 dark:text-slate-400">
                                {item.active}/{item.baseline} segmen
                              </span>
                            ) : null}
                            <span>{item.percent}%</span>
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all duration-300",
                              getProgressColor(item.percent)
                            )}
                            style={{ width: `${item.percent}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null
              )
            )}
          </CardContent>
        </Card>

        <Card className="rounded-xl border shadow-sm">
          <CardHeader className="px-5 pb-0 pt-4">
            <CardTitle className="mb-0">Log Aktivitas Terbaru</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 px-5 pb-5 pt-0">
            {logError ? (
              <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <div>
                  <p className="font-medium">Gagal memuat log aktivitas</p>
                  <p className="mt-0.5 text-red-600/90 dark:text-red-400/90">{logError}</p>
                </div>
              </div>
            ) : isLogLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900"
                  >
                    <span className="h-10 w-10 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
                    <div className="flex-1 space-y-2">
                      <span className="block h-3.5 w-3/4 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                      <span className="block h-3 w-1/2 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                    </div>
                  </div>
                ))}
              </div>
            ) : activityLogs.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center dark:border-slate-800 dark:bg-slate-900/50">
                <History className="mx-auto mb-2 size-6 text-slate-400 dark:text-slate-500" />
                <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                  Belum ada aktivitas tercatat
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Aktivitas seperti impor data KSA akan muncul di sini.
                </p>
              </div>
            ) : (
              activityLogs.map((item) => {
                const Icon = getActivityIcon(item.module);
                return (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 transition-colors hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800/50"
                  >
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-900 dark:bg-emerald-900/20 dark:text-emerald-200">
                      <Icon className="size-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {item.description ?? "-"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {item.actor_name ?? "Admin"} · {formatRelativeTime(item.created_at)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}