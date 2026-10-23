"use client";

import * as React from "react";
import { Edit3, Plus, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { TableLoading } from "@/components/ui/table-loading";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/lib/supabase/client";
import { logActivity } from "@/lib/supabase/activity-log";
import { useAdminAuth } from "@/components/pages/admin-page/AdminAuthContext";

type District = {
  id: string
  district_code: string
  name: string
}

export default function RegionReference() {
  const { id: actorId, name, email } = useAdminAuth();
  const actorName = name || email || "Admin";

  const [districtData, setDistrictData] = React.useState<District[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [loadError, setLoadError] = React.useState("");

  const [modalOpen, setModalOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [districtCode, setDistrictCode] = React.useState("");
  const [districtName, setDistrictName] = React.useState("");
  const [formError, setFormError] = React.useState("");

  const [deleteModalOpen, setDeleteModalOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<{ id: string; name: string } | null>(null);

  const fetchData = React.useCallback(async () => {
    setIsLoading(true);
    setLoadError("");

    const { data, error } = await supabase
      .from("districts")
      .select("id, district_code, name")
      .order("district_code");

    if (error) {
      setLoadError(error.message || "Gagal memuat data kecamatan.");
      setIsLoading(false);
      return;
    }

    setDistrictData(data ?? []);
    setIsLoading(false);
  }, [setIsLoading]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  React.useEffect(() => {
    const channel = supabase
      .channel("referensi-wilayah-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "districts" }, () => fetchData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData]);

  const openAdd = () => {
    setEditingId(null);
    setDistrictCode("");
    setDistrictName("");
    setFormError("");
    setModalOpen(true);
  };

  const openEdit = (id: string) => {
    const target = districtData.find((item) => item.id === id);
    if (!target) return;
    setEditingId(id);
    setDistrictCode(target.district_code);
    setDistrictName(target.name);
    setFormError("");
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!districtCode.trim() || !districtName.trim()) {
      setFormError("Kode dan nama kecamatan harus diisi.");
      return;
    }

    const duplicateCode = districtData.some(
      (item) =>
        item.district_code === districtCode.trim() &&
        item.id !== editingId,
    );
    if (duplicateCode) {
      setFormError("Kode kecamatan sudah digunakan.");
      return;
    }

    setFormError("");

    try {
      const response = await fetch("/api/admin/districts", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          editingId
            ? { id: editingId, district_code: districtCode.trim(), name: districtName.trim() }
            : { district_code: districtCode.trim(), name: districtName.trim() },
        ),
      });
      const result = await response.json();

      if (!response.ok || result.error) {
        setFormError(
          result.error ||
            (editingId ? "Gagal menyimpan perubahan." : "Gagal menambahkan kecamatan."),
        );
        return;
      }
    } catch {
      setFormError("Terjadi kesalahan jaringan. Coba lagi.");
      return;
    }

    await logActivity({
      actorId,
      actorName,
      actionType: editingId ? "update_data" : "add_reference",
      description: `${editingId ? "Memperbarui" : "Menambahkan"} kecamatan ${districtCode.trim()} - ${districtName.trim()}`,
      module: "referensi_wilayah",
    });

    setModalOpen(false);
    fetchData();
  };

  const openDeleteModal = (item: District) => {
    setDeleteTarget({ id: item.id, name: item.name });
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    const target = districtData.find((item) => item.id === deleteTarget.id);

    try {
      const response = await fetch("/api/admin/districts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deleteTarget.id }),
      });
      const result = await response.json();

      if (!response.ok || result.error) {
        setDeleteModalOpen(false);
        return;
      }
    } catch {
      setDeleteModalOpen(false);
      return;
    }

    await logActivity({
      actorId,
      actorName,
      actionType: "delete_data",
      description: `Menghapus kecamatan ${target?.district_code ?? ""} - ${target?.name ?? ""}`,
      module: "referensi_wilayah",
    });

    setDeleteModalOpen(false);
    fetchData();
  };

  return (
    <div className="space-y-6">
      {loadError ? (
        <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/30 dark:bg-rose-950/40 dark:text-rose-200">
          {loadError}
        </p>
      ) : null}

      <Card className="rounded-xl shadow-sm">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Kecamatan
            </CardTitle>
            <CardDescription className="text-slate-500 dark:text-slate-400">
              Tambahkan atau kelola kecamatan sampel.
            </CardDescription>
          </div>
          <Button
            className="bg-[#639922] hover:bg-[#58751d]"
            onClick={openAdd}
          >
            <Plus className="size-4" /> Tambah Kecamatan
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table className="min-w-full">
              <TableHeader>
                <TableRow>
                  <TableHead>Kode Kecamatan</TableHead>
                  <TableHead>Nama Kecamatan</TableHead>
                  <TableHead>Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableLoading colSpan={3} />
                ) : districtData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center">
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Belum ada kecamatan terdaftar.
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  districtData.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.district_code}</TableCell>
                      <TableCell>{item.name}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => openEdit(item.id)}
                            className="max-md:h-10 max-md:w-10"
                          >
                            <Edit3 className="size-4" />
                          </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => openDeleteModal(item)}
                          className="max-md:h-10 max-md:w-10"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {editingId ? "Edit Kecamatan" : "Tambah Kecamatan"}
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Kelola kode dan nama kecamatan.
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setModalOpen(false)}>
                <X className="size-4" />
              </Button>
            </div>
            <div className="grid gap-4">
              <div>
                <Label htmlFor="kecamatan-kode">Kode Kecamatan</Label>
                <Input
                  id="kecamatan-kode"
                  value={districtCode}
                  onChange={(event) => setDistrictCode(event.target.value)}
                  placeholder="Contoh: 3278071"
                />
              </div>
              <div>
                <Label htmlFor="kecamatan-nama">Nama Kecamatan</Label>
                <Input
                  id="kecamatan-nama"
                  value={districtName}
                  onChange={(event) => setDistrictName(event.target.value)}
                  placeholder="Contoh: Bungursari"
                />
              </div>
              {formError ? (
                <p className="text-sm text-rose-600">{formError}</p>
              ) : null}
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setModalOpen(false)}>
                Batal
              </Button>
              <Button className="bg-[#639922] hover:bg-[#58751d]" onClick={handleSave}>
                Simpan
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={deleteModalOpen && deleteTarget !== null}
        title="Konfirmasi Hapus"
        description={
          deleteTarget
            ? `Yakin ingin menghapus kecamatan ${deleteTarget.name}? Tindakan ini tidak dapat dibatalkan.`
            : ""
        }
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteModalOpen(false)}
      />
    </div>
  );
}
