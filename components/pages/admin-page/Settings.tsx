"use client";

import * as React from "react";
import * as XLSX from "xlsx";
import { Download } from "lucide-react";

import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase/client";
import { fetchAllChunked } from "@/lib/supabase/query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardDescription, CardTitle } from "@/components/ui/card";

type ExportState = {
  isLoading: boolean
  message: string
  isError?: boolean
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function buildCsvContent(rows: Array<Record<string, string | number>>) {
  const headers = Object.keys(rows[0] ?? {});
  const lines = [headers.join(",")];
  rows.forEach((row) => {
    const line = headers
      .map((key) => {
        const value = String(row[key] ?? "");
        return `"${value.replace(/"/g, "\"\"")}"`;
      })
      .join(",");
    lines.push(line);
  });
  return lines.join("\r\n");
}

export default function Settings() {
  const [exportStatus, setExportStatus] = React.useState<Record<string, ExportState>>({
    ksa: { isLoading: false, message: "" },
    log: { isLoading: false, message: "" },
  });

  React.useEffect(() => {
    const timeout = setTimeout(() => {
      setExportStatus((current) => ({
        ksa: { ...current.ksa, message: "" },
        log: { ...current.log, message: "" },
      }));
    }, 4000);

    return () => clearTimeout(timeout);
  }, [exportStatus.ksa.message, exportStatus.log.message]);

  const exportWorkbook = (rows: Array<Record<string, string | number>>, fileName: string) => {
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
    const excelData = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelData], { type: "application/octet-stream" });
    downloadBlob(blob, fileName);
  };

  const handleExportKsa = async () => {
    setExportStatus((status) => ({
      ...status,
      ksa: { isLoading: true, message: "", isError: false },
    }));
    try {
      const rows = await fetchAllChunked<Record<string, string | number>>((from, to) =>
        supabase
          .from("data_ksa")
          .select("segment_id, subsegment, periode, phase")
          .order("periode", { ascending: true })
          .range(from, to)
      );

      if (rows.length === 0) throw new Error("Belum ada data KSA untuk diekspor.");

      exportWorkbook(rows, "data-ksa.xlsx");
      setExportStatus((status) => ({
        ...status,
        ksa: { isLoading: false, message: "Export Data KSA berhasil." },
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gagal mengekspor data KSA.";
      setExportStatus((status) => ({
        ...status,
        ksa: { isLoading: false, message, isError: true },
      }));
    }
  };

  const handleExportLog = async () => {
    setExportStatus((status) => ({
      ...status,
      log: { isLoading: true, message: "", isError: false },
    }));
    try {
      const rows = await fetchAllChunked<Record<string, string | number>>((from, to) =>
        supabase
          .from("activity_log")
          .select("actor_name, action_type, module, description, created_at")
          .order("created_at", { ascending: false })
          .range(from, to)
      );

      if (rows.length === 0) throw new Error("Belum ada log aktivitas untuk diekspor.");

      const csv = buildCsvContent(rows);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      downloadBlob(blob, "log-aktivitas.csv");
      setExportStatus((status) => ({
        ...status,
        log: { isLoading: false, message: "Export Log Aktivitas berhasil." },
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gagal mengekspor log aktivitas.";
      setExportStatus((status) => ({
        ...status,
        log: { isLoading: false, message, isError: true },
      }));
    }
  };

  return (
    <div className="space-y-6">
      <Card className="rounded-xl shadow-sm">
        <CardHeader>
          <CardTitle>Export Data</CardTitle>
          <CardDescription>Unduh data sistem dalam format Excel atau CSV untuk laporan dan audit.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                <Download className="size-4" />
                <span>Export Data KSA (.xlsx)</span>
              </div>
              <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
                Data KSA dengan segmen, subsegmen, periode, dan fase tanam.
              </p>
              <Button
                variant="default"
                className="w-full"
                onClick={handleExportKsa}
                disabled={exportStatus.ksa.isLoading}
              >
                {exportStatus.ksa.isLoading ? "Menyiapkan file..." : "Export Data KSA"}
              </Button>
              {exportStatus.ksa.message ? (
                <div
                  className={cn(
                    "mt-3 rounded-xl border px-3 py-2 text-sm",
                    exportStatus.ksa.isError
                      ? "border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-900/30 dark:bg-rose-950/40 dark:text-rose-200"
                      : "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/30 dark:bg-emerald-950/40 dark:text-emerald-200"
                  )}
                >
                  {exportStatus.ksa.message}
                </div>
              ) : null}
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                <Download className="size-4" />
                <span>Export Log Aktivitas (.csv)</span>
              </div>
              <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
                Unduh aktivitas pengguna dan sistem dari database dalam format CSV.
              </p>
              <Button
                variant="default"
                className="w-full"
                onClick={handleExportLog}
                disabled={exportStatus.log.isLoading}
              >
                {exportStatus.log.isLoading ? "Menyiapkan file..." : "Export Log Aktivitas"}
              </Button>
              {exportStatus.log.message ? (
                <div
                  className={cn(
                    "mt-3 rounded-xl border px-3 py-2 text-sm",
                    exportStatus.log.isError
                      ? "border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-900/30 dark:bg-rose-950/40 dark:text-rose-200"
                      : "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/30 dark:bg-emerald-950/40 dark:text-emerald-200"
                  )}
                >
                  {exportStatus.log.message}
                </div>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
