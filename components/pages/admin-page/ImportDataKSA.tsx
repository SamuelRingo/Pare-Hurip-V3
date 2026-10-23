"use client";

import { logActivity } from "@/lib/supabase/activity-log";
import { useAdminAuth } from "@/components/pages/admin-page/AdminAuthContext";
import * as React from "react";
import * as XLSX from "xlsx";
import { AlertTriangle, Check, CheckCircle, Download, Upload, XCircle } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  ValidatedImportRow,
  extractFileInfo,
  parseExcelToRows,
  validateRows,
} from "@/lib/excel-import";

export default function ImportDataKSA() {
  const { id: actorId, name, email } = useAdminAuth();
  const actorName = name || email || "Admin";

  const [stage, setStage] = React.useState<"upload" | "parsing" | "preview" | "saved">("upload");
  const setSelectedFile = React.useState<File | null>(null)[1];
  const [fileError, setFileError] = React.useState<string>("");
  const [validatedRows, setValidatedRows] = React.useState<ValidatedImportRow[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [savedCount, setSavedCount] = React.useState(0);
  const [isSaving, setIsSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string>("");
  const [pageSize, setPageSize] = React.useState(10);
  const [page, setPage] = React.useState(1);
  const [showOnlyProblems, setShowOnlyProblems] = React.useState(false);

  const savableRows = validatedRows.filter((row) => row.errors.length === 0 && !row.skip);
  const validRowCount = savableRows.length;
  const invalidRowCount = validatedRows.length - validRowCount;
  const autoFixedCount = validatedRows.filter((row) => row.autoFixes.length > 0 && row.errors.length === 0).length;

  const problemRows = validatedRows.filter((row) => row.errors.length > 0 || row.skip);
  const displayedRows = showOnlyProblems ? problemRows : validatedRows;
  const pageCount = Math.max(1, Math.ceil(displayedRows.length / pageSize));
  const pagedRows = displayedRows.slice((page - 1) * pageSize, page * pageSize);

  const jumpToFirstProblem = () => {
    const index = displayedRows.findIndex((row) => row.errors.length > 0 || row.skip);
    if (index >= 0) {
      setPage(Math.floor(index / pageSize) + 1);
    }
  };

  React.useEffect(() => {
    setPage(1);
  }, [validatedRows, showOnlyProblems]);

  const handleDownloadTemplate = () => {
    const templateRows = [
      { segment_id: "123456789", subsegment: "A1", periode: "2024-01", phase: "3.1" },
      { segment_id: "123456790", subsegment: "A2", periode: "2024-02", phase: "4" },
    ];
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(templateRows);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Template");
    const excelData = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelData], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "template-data-ksa.xlsx";
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleFile = async (file: File) => {
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith(".xlsx") && !fileName.endsWith(".xls")) {
      setFileError("Format file tidak valid. Harap unggah file .xlsx atau .xls.");
      return;
    }

    setSelectedFile(file);
    setFileError("");
    setStage("parsing");
    setIsLoading(true);

    try {
      const fileInfo = extractFileInfo(file.name);
      const parsedRows = await parseExcelToRows(file, fileInfo.year, fileInfo.periode);
      const validated = validateRows(parsedRows);
      setValidatedRows(validated);
      setIsLoading(false);
      setStage("preview");
    } catch (error) {
      setFileError(error instanceof Error ? error.message : "Gagal membaca file Excel.");
      setIsLoading(false);
      setStage("upload");
    }
  };

  const resetUploader = () => {
    setStage("upload");
    setSelectedFile(null);
    setFileError("");
    setValidatedRows([]);
    setSavedCount(0);
    setSaveError("");
  };

  const handleSaveToDatabase = async () => {
    setIsSaving(true);
    setSaveError("");

    const payload = savableRows.map(({ segment_id, subsegment, periode, phase }) => ({
      segment_id,
      subsegment,
      periode,
      phase,
    }));

    if (payload.length === 0) {
      setSaveError("Tidak ada baris valid untuk disimpan.");
      setIsSaving(false);
      return;
    }

    try {
      const response = await fetch("/api/admin/ksa-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: payload }),
      });
      const result = await response.json();

      if (!response.ok || result.error) {
        setSaveError(result.error || "Gagal menyimpan data ke database.");
        return;
      }

      const savedRowCount = result.savedCount ?? payload.length;

      await logActivity({
        actorId,
        actorName,
        actionType: "import_data",
        description: `Mengunggah ${savedRowCount} baris data KSA baru`,
        module: "import_data",
      });

      setSavedCount(savedRowCount);
      setStage("saved");
    } catch (error) {
      console.error(error);
      setSaveError("Terjadi kesalahan jaringan. Coba lagi.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const file = event.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleSelectFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const stepLabels = ["Upload", "Parsing", "Preview", "Selesai"];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        {stepLabels.map((label, index) => {
          const stepIndex = index + 1;
          const activeIndex =
            stage === "upload"
              ? 1
              : stage === "parsing"
              ? 2
              : stage === "preview"
              ? 3
              : 4;
          const isActive = stepIndex === activeIndex;
          const isDone = stepIndex < activeIndex;
          return (
            <React.Fragment key={label}>
              {index > 0 ? (
                <span
                  className={cn(
                    "h-px w-6 sm:w-10",
                    isDone || isActive
                      ? "bg-emerald-400"
                      : "bg-slate-200 dark:bg-slate-700"
                  )}
                />
              ) : null}
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors",
                    isActive
                      ? "bg-emerald-600 text-white"
                      : isDone
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300"
                      : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                  )}
                >
                  {isDone ? <Check className="size-3.5" /> : stepIndex}
                </span>
                <span
                  className={cn(
                    "text-xs font-semibold",
                    isActive
                      ? "text-emerald-700 dark:text-emerald-300"
                      : "text-slate-500 dark:text-slate-400"
                  )}
                >
                  {label}
                </span>
              </div>
            </React.Fragment>
          );
        })}
      </div>

      {stage === "upload" && (
        <Card className="rounded-xl border shadow-sm">
          <CardHeader className="flex flex-wrap items-start justify-between gap-4 px-5 py-5">
            <div>
              <CardTitle>Unggah file KSA</CardTitle>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Seret dan letakkan file .xlsx/.xls di area ini atau pilih file dari komputer.
              </p>
            </div>
            <Button
              variant="outline"
              className="inline-flex items-center gap-2"
              onClick={handleDownloadTemplate}
            >
              <Download className="size-4" /> Unduh Template
            </Button>
          </CardHeader>
          <CardContent className="space-y-4 px-5 pb-5">
            <div
              onDragOver={(event) => event.preventDefault()}
              onDrop={handleDrop}
              className="relative rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-14 text-center text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
            >
              <Upload className="mx-auto mb-3 size-6 text-emerald-600" />
              <p className="text-sm font-semibold">Tarik dan lepas file di sini</p>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Mendukung format wide (kolom bulan), hybrid (nama bulan), maupun long (segment_id, subsegment, periode, phase).
              </p>
              <label className="mt-5 inline-flex cursor-pointer items-center rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700">
                Pilih File
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  className="sr-only"
                  onChange={handleSelectFile}
                />
              </label>
              {fileError ? (
                <p className="mt-4 text-sm text-destructive">{fileError}</p>
              ) : null}
            </div>
          </CardContent>
        </Card>
      )}

      {stage === "parsing" && (
        <Card className="rounded-xl border shadow-sm">
          <CardContent className="px-5 py-10 text-center">
            <Upload className="mx-auto mb-4 size-10 text-emerald-600 animate-pulse" />
            <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">Memproses file...</p>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Sistem sedang membaca data Excel dan menyiapkan preview.
            </p>
          </CardContent>
        </Card>
      )}

      {stage === "preview" && (
        <div className="space-y-5">
          <Card className="rounded-xl border shadow-sm">
            <CardHeader className="px-5 py-5">
              <CardTitle>Hasil Preview & Validasi</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 px-5 pb-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex flex-wrap gap-4">
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-900/30 dark:bg-emerald-950/40 dark:text-emerald-200">
                    <p className="font-semibold">Baris siap disimpan</p>
                    <p>{validRowCount}</p>
                  </div>
                  {autoFixedCount > 0 && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/30 dark:bg-amber-950/40 dark:text-amber-200">
                      <p className="font-semibold">Otomatis diperbaiki</p>
                      <p>{autoFixedCount}</p>
                    </div>
                  )}
                  <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 dark:border-rose-900/30 dark:bg-rose-950/40 dark:text-rose-200">
                    <p className="font-semibold">Dilewati (invalid/duplikat)</p>
                    <p>{invalidRowCount}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant={showOnlyProblems ? "default" : "outline"}
                    size="sm"
                    disabled={problemRows.length === 0}
                    onClick={() => setShowOnlyProblems((value) => !value)}
                  >
                    <AlertTriangle className="size-3.5" />
                    Hanya bermasalah ({problemRows.length})
                  </Button>
                  {!showOnlyProblems ? (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={problemRows.length === 0}
                      onClick={jumpToFirstProblem}
                    >
                      Loncat ke baris bermasalah pertama
                    </Button>
                  ) : null}
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950">
                <Table className="min-w-[720px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Segmen</TableHead>
                      <TableHead>Subsegmen</TableHead>
                      <TableHead>Periode</TableHead>
                      <TableHead>Phase</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagedRows.map((row, index) => {
                      const rowIndex = (page - 1) * pageSize + index;
                      const rowHasBlockingError = row.errors.length > 0;
                      const rowHasAutoFix = row.autoFixes.length > 0 && !rowHasBlockingError;
                      return (
                        <TableRow
                          key={`${row.segment_id}-${row.subsegment}-${row.periode}-${rowIndex}`}
                          className={
                            rowHasBlockingError
                              ? "bg-rose-50 dark:bg-rose-950/40"
                              : rowHasAutoFix
                              ? "bg-amber-50 dark:bg-amber-950/20"
                              : ""
                          }
                        >
                          <TableCell>{row.segment_id}</TableCell>
                          <TableCell>{row.subsegment}</TableCell>
                          <TableCell>{row.periode}</TableCell>
                          <TableCell>{row.phase}</TableCell>
                          <TableCell className="text-sm text-slate-600 dark:text-slate-300">
                            {rowHasBlockingError ? (
                              <div className="flex items-start gap-2">
                                <XCircle className="mt-0.5 size-4 shrink-0 text-rose-600" />
                                <span>{row.errors.join(", ")}</span>
                              </div>
                            ) : rowHasAutoFix ? (
                              <div className="flex items-start gap-2">
                                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
                                <span>{row.autoFixes.join(", ")}</span>
                              </div>
                            ) : (
                              <span className="text-emerald-700 dark:text-emerald-300">Valid</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
                  <span>Baris per halaman:</span>
                  <Select value={String(pageSize)} onValueChange={(value) => setPageSize(Number(value))}>
                    <SelectTrigger className="w-[6.5rem]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[10, 25, 50].map((size) => (
                        <SelectItem key={size} value={String(size)}>
                          {size}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <span>Halaman</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((value) => Math.max(1, value - 1))}
                    disabled={page <= 1}
                  >
                    Sebelumnya
                  </Button>
                  <span>{page} / {pageCount}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
                    disabled={page >= pageCount}
                  >
                    Berikutnya
                  </Button>
                </div>
              </div>

              {saveError ? (
                <div className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 dark:border-rose-900/30 dark:bg-rose-950/40 dark:text-rose-200">
                  <XCircle className="mt-0.5 size-4 shrink-0" />
                  <span>{saveError}</span>
                </div>
              ) : null}

              <div className="flex flex-wrap items-center justify-between gap-3">
                <Button variant="outline" onClick={resetUploader} disabled={isSaving}>
                  Batal
                </Button>
                <Button disabled={validRowCount === 0 || isSaving} onClick={handleSaveToDatabase}>
                  {isSaving
                    ? "Menyimpan..."
                    : `Simpan ${validRowCount} Baris ke Database`}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {stage === "saved" && (
        <Card className="rounded-xl border shadow-sm">
          <CardContent className="text-center px-5 py-10">
            <CheckCircle className="mx-auto mb-4 size-10 text-emerald-600" />
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Data berhasil disimpan</h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              {savedCount} baris data berhasil disimpan.
            </p>
            <Button className="mt-6" onClick={resetUploader}>
              Upload Data Lain
            </Button>
          </CardContent>
        </Card>
      )}

      {stage === "parsing" && isLoading && (
        <div className="sr-only">Memproses file...</div>
      )}
    </div>
  );
}
