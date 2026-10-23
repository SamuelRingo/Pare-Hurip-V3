"use client";

import * as React from "react";
import { CheckCircle, Plus, Trash2, UserCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { TableLoading } from "@/components/ui/table-loading";
import { getPasswordFeedback, isStrongPassword } from "@/lib/password";
import { getEmailFeedback, isValidEmail } from "@/lib/email";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAdminAuth } from "@/components/pages/admin-page/AdminAuthContext";
import { AddUserDialog, EditUserDialog } from "@/components/pages/admin-page/UserDialogs";

type UserProfile = {
  id: string
  name?: string
  email: string
  role?: "admin" | "superadmin"
  created_at: string
}

type FetchStatus = "idle" | "loading" | "success" | "error"

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

// RoleBadge removed — role column no longer displayed in table.

export default function AdminUsers() {
  const { id: currentUserId, role: currentRole } = useAdminAuth();
  const isSuperadmin = currentRole === "superadmin";

  const [users, setUsers] = React.useState<UserProfile[]>([]);
  const [status, setStatus] = React.useState<FetchStatus>("idle");
  const [message, setMessage] = React.useState<string>("");

  const [isAdding, setIsAdding] = React.useState(false);
  const [newName, setNewName] = React.useState("");
  const [newEmail, setNewEmail] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState("");

  const [isEditing, setIsEditing] = React.useState(false);
  const [editingUserId, setEditingUserId] = React.useState<string | null>(null);
  const [editingUserName, setEditingUserName] = React.useState<string>("");
  const [editingUserEmail, setEditingUserEmail] = React.useState<string>("");
  const [editingPassword, setEditingPassword] = React.useState("");
  const [isSubmittingEdit, setIsSubmittingEdit] = React.useState(false);
  const [editError, setEditError] = React.useState("");

  const [deletingUser, setDeletingUser] = React.useState<UserProfile | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const newPasswordFeedback = getPasswordFeedback(newPassword);
  const editingPasswordFeedback = getPasswordFeedback(editingPassword);
  const newEmailFeedback = getEmailFeedback(newEmail.trim());

  const fetchUsers = React.useCallback(async () => {
    setStatus("loading");
    try {
      const response = await fetch("/api/admin/users");
      if (!response.ok) {
        throw new Error("Tidak dapat memuat daftar pengguna.");
      }
      const data = await response.json();

      setUsers(
        (data?.users ?? []).map((item: Record<string, unknown>) => ({
          id: item.id,
          name: item.name ?? "",
          email: item.email,
          role: item.role,
          created_at: item.created_at,
        })),
      );
      setStatus("success");
    } catch {
      setUsers([]);
      setStatus("error");
    }
  }, []);

  React.useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  React.useEffect(() => {
    if (!message) return;
    const handle = window.setTimeout(() => setMessage(""), 3000);
    return () => window.clearTimeout(handle);
  }, [message]);

  const openAdd = () => {
    setNewName("");
    setNewEmail("");
    setNewPassword("");
    setFormError("");
    setIsAdding(true);
  };

  const closeAdd = () => {
    setIsAdding(false);
    setFormError("");
  };

  const openEdit = (user: UserProfile) => {
    setEditingUserId(user.id);
    setEditingUserName(user.name ?? "");
    setEditingUserEmail(user.email);
    setEditingPassword("");
    setEditError("");
    setIsEditing(true);
  };

  const closeEdit = () => {
    setIsEditing(false);
    setEditingUserId(null);
    setEditingPassword("");
    setEditError("");
  };

  const handleEditSave = async () => {
    if (!editingUserId || isSubmittingEdit) return;
    if (editingPassword && !isStrongPassword(editingPassword)) {
      setEditError("Password belum kuat. Periksa kembali ketentuannya.");
      return;
    }

    setIsSubmittingEdit(true);
    setEditError("");
    try {
      const response = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: editingUserId,
          name: editingUserName.trim(),
          email: editingUserEmail.trim(),
          password: editingPassword.trim() || undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Gagal memperbarui pengguna.");
      }
      setMessage("Data pengguna berhasil diperbarui.");
      closeEdit();
      fetchUsers();
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : "Terjadi kesalahan saat memperbarui pengguna.");
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleSave = async () => {
    if (isSubmitting) return;
    if (!newName.trim()) {
      setFormError("Nama harus diisi.");
      return;
    }
    if (!isValidEmail(newEmail.trim())) {
      setFormError("Email tidak valid.");
      return;
    }
    if (!newPassword.trim()) {
      setFormError("Password harus diisi.");
      return;
    }
    if (!isStrongPassword(newPassword)) {
      setFormError("Password belum kuat. Periksa kembali ketentuannya.");
      return;
    }

    setIsSubmitting(true);
    setFormError("");
    try {
      // Default role for created users via UI is 'admin' (form no longer exposes role)
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), email: newEmail.trim(), password: newPassword.trim(), role: "admin" }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Gagal menambah pengguna.");
      }
      setMessage("Admin baru berhasil ditambahkan.");
      closeAdd();
      fetchUsers();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Terjadi kesalahan saat menambahkan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (user: UserProfile) => {
    setDeletingUser(user);
  };

  const handleConfirmDelete = async () => {
    if (!deletingUser || isDeleting) return;
    setIsDeleting(true);
    try {
      const response = await fetch("/api/admin/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deletingUser.id }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Gagal menghapus pengguna.");
      }
      setMessage("Pengguna berhasil dihapus.");
      setDeletingUser(null);
      fetchUsers();
    } catch (err: unknown) {
      setDeletingUser(null);
      setMessage(err instanceof Error ? err.message : "Terjadi kesalahan saat menghapus.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="rounded-xl shadow-sm">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Pengguna Admin
            </CardTitle>
            <CardDescription className="text-slate-500 dark:text-slate-400">
              Kelola akun admin.
            </CardDescription>
          </div>
          {isSuperadmin ? (
            <Button className="bg-[#639922] hover:bg-[#58751d]" onClick={openAdd}>
              <Plus className="size-4" /> Tambah Admin
            </Button>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-4">
          {currentRole !== "superadmin" ? (
            <div className="rounded-3xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-sm dark:border-amber-900/30 dark:bg-amber-950/40 dark:text-amber-200">
              Hanya superadmin yang dapat menambah atau menghapus akun admin.
            </div>
          ) : null}

          {message ? (
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 shadow-sm dark:border-emerald-900/30 dark:bg-emerald-950/40 dark:text-emerald-200">
              <div className="flex items-center gap-2">
                <CheckCircle className="size-4" />
                <span>{message}</span>
              </div>
            </div>
          ) : null}

          <div className="overflow-x-auto px-0">
            <Table className="min-w-full">
              <TableHeader>
                <TableRow>
                  <TableHead>Nama / Email</TableHead>
                  <TableHead>Tanggal dibuat</TableHead>
                  {isSuperadmin ? <TableHead>Aksi</TableHead> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {status === "loading" ? (
                  <TableLoading colSpan={isSuperadmin ? 3 : 2} />
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isSuperadmin ? 3 : 2} className="h-24 text-center">
                      <div className="flex flex-col items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                        <span>
                          {status === "error"
                            ? "Tidak dapat memuat data pengguna."
                            : "Belum ada pengguna terdaftar."}
                        </span>
                        {status === "error" ? (
                          <Button variant="outline" size="sm" onClick={fetchUsers}>
                            Coba Lagi
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{user.name ?? ""}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(user.created_at)}</TableCell>
                      {isSuperadmin ? (
                        <TableCell>
                          <div className="flex flex-wrap gap-2">
                            <Button variant="secondary" size="sm" onClick={() => openEdit(user)} className="max-md:h-10 max-md:w-10">
                              <UserCheck className="size-4" />
                            </Button>
                            {user.id !== currentUserId ? (
                              <Button variant="destructive" size="sm" onClick={() => handleDelete(user)} className="max-md:h-10 max-md:w-10">
                                <Trash2 className="size-4" />
                              </Button>
                            ) : null}
                          </div>
                        </TableCell>
                      ) : null}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {isAdding ? (
        <AddUserDialog
          name={newName}
          email={newEmail}
          password={newPassword}
          emailFeedback={newEmailFeedback}
          passwordFeedback={newPasswordFeedback}
          formError={formError}
          isSubmitting={isSubmitting}
          onNameChange={setNewName}
          onEmailChange={setNewEmail}
          onPasswordChange={setNewPassword}
          onClose={closeAdd}
          onSave={handleSave}
        />
      ) : null}

      {isEditing ? (
        <EditUserDialog
          name={editingUserName}
          email={editingUserEmail}
          password={editingPassword}
          passwordFeedback={editingPasswordFeedback}
          error={editError}
          isSubmitting={isSubmittingEdit}
          onNameChange={setEditingUserName}
          onPasswordChange={setEditingPassword}
          onClose={closeEdit}
          onSave={handleEditSave}
        />
      ) : null}

      <ConfirmDialog
        open={deletingUser !== null}
        title="Hapus Pengguna"
        description={
          deletingUser
            ? `Yakin ingin menghapus pengguna ${deletingUser.name || deletingUser.email}? Tindakan ini tidak dapat dibatalkan.`
            : ""
        }
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingUser(null)}
        confirmDisabled={isDeleting}
      />
    </div>
  );
}
