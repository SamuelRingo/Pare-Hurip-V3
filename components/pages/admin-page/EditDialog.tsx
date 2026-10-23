"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface TableRowData {
  id: string
  segment_id: string
  subsegment: string
  nama_kecamatan: string
  periode: string
  phase: string
  created_at: string | null
}

interface EditDialogProps {
  row: TableRowData
  periode: string
  phase: string
  error: string
  onPeriodeChange: (value: string) => void
  onPhaseChange: (value: string) => void
  onClose: () => void
  onSave: () => void
}

export default function EditDialog({
  row,
  periode,
  phase,
  error,
  onPeriodeChange,
  onPhaseChange,
  onClose,
  onSave,
}: EditDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
      <div className="w-full max-w-2xl max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Edit Observasi KSA</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">Kecamatan, segmen, dan subsegmen tidak dapat diubah di sini.</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="size-5" />
          </Button>
        </div>
        <div className="space-y-4 px-6 py-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Kecamatan</Label>
              <Input value={row.nama_kecamatan} readOnly />
            </div>
            <div className="space-y-2">
              <Label>Segmen</Label>
              <Input value={row.segment_id} readOnly />
            </div>
            <div className="space-y-2">
              <Label>Subsegmen</Label>
              <Input value={row.subsegment} readOnly />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Periode</Label>
              <Input
                type="month"
                value={periode}
                onChange={(event) => onPeriodeChange(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Fase Tanam</Label>
              <Input
                value={phase}
                onChange={(event) => onPhaseChange(event.target.value)}
                placeholder="Contoh: 3.1"
              />
            </div>
          </div>
          {error ? (
            <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/30 dark:bg-rose-950/40 dark:text-rose-200">
              {error}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 px-6 py-4 dark:border-slate-800">
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button
            disabled={!periode || !phase}
            onClick={onSave}
          >
            Simpan Perubahan
          </Button>
        </div>
      </div>
    </div>
  );
}
