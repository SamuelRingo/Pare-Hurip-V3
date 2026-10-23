"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { EmailInput } from "@/components/ui/email-input";

type PasswordFeedback = { strong: boolean; message: string } | null;
type EmailFeedback = { valid: boolean; message: string } | null;

function PasswordHint({ feedback }: { feedback: PasswordFeedback }) {
  if (!feedback) return null;
  return (
    <p
      className={
        feedback.strong
          ? "mt-1 text-xs font-medium text-emerald-600 dark:text-emerald-400"
          : "mt-1 text-xs font-medium text-amber-600 dark:text-amber-400"
      }
    >
      {feedback.message}
    </p>
  );
}

interface AddUserDialogProps {
  name: string
  email: string
  password: string
  emailFeedback: EmailFeedback
  passwordFeedback: PasswordFeedback
  formError: string
  isSubmitting: boolean
  onNameChange: (value: string) => void
  onEmailChange: (value: string) => void
  onPasswordChange: (value: string) => void
  onClose: () => void
  onSave: () => void
}

export function AddUserDialog({
  name,
  email,
  password,
  emailFeedback,
  passwordFeedback,
  formError,
  isSubmitting,
  onNameChange,
  onEmailChange,
  onPasswordChange,
  onClose,
  onSave,
}: AddUserDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
      <div className="w-full max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Tambah Admin Baru</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Tambahkan akun admin atau superadmin melalui email.
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>
        <div className="grid gap-4">
          <div>
            <Label htmlFor="new-admin-name">Nama</Label>
            <Input
              id="new-admin-name"
              value={name}
              onChange={(event) => onNameChange(event.target.value)}
              placeholder="Nama lengkap"
            />
          </div>
          <div>
            <Label htmlFor="new-admin-email">Email</Label>
            {emailFeedback ? (
              <p
                className={
                  emailFeedback.valid
                    ? "mt-1 text-xs font-medium text-emerald-600 dark:text-emerald-400"
                    : "mt-1 text-xs font-medium text-amber-600 dark:text-amber-400"
                }
              >
                {emailFeedback.message}
              </p>
            ) : null}
            <EmailInput
              id="new-admin-email"
              value={email}
              onChange={(event) => onEmailChange(event.target.value)}
              placeholder="admin@example.com"
            />
          </div>
          <div>
            <Label htmlFor="new-admin-password">Password</Label>
            <PasswordHint feedback={passwordFeedback} />
            <PasswordInput
              id="new-admin-password"
              value={password}
              onChange={(event) => onPasswordChange(event.target.value)}
              placeholder="Minimal 8 karakter"
            />
          </div>
          {formError ? <p className="text-sm text-rose-600">{formError}</p> : null}
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>Batal</Button>
          <Button className="bg-[#639922] hover:bg-[#58751d]" onClick={onSave} disabled={isSubmitting}>
            {isSubmitting ? "Menyimpan..." : "Simpan"}
          </Button>
        </div>
      </div>
    </div>
  );
}

interface EditUserDialogProps {
  name: string
  email: string
  password: string
  passwordFeedback: PasswordFeedback
  error: string
  isSubmitting: boolean
  onNameChange: (value: string) => void
  onPasswordChange: (value: string) => void
  onClose: () => void
  onSave: () => void
}

export function EditUserDialog({
  name,
  email,
  password,
  passwordFeedback,
  error,
  isSubmitting,
  onNameChange,
  onPasswordChange,
  onClose,
  onSave,
}: EditUserDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
      <div className="w-full max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Ubah Pengguna</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Perbarui nama, email, atau password pengguna.
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>
        <div className="grid gap-4">
          <div>
            <Label htmlFor="edit-admin-name">Nama</Label>
            <Input
              id="edit-admin-name"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="Nama lengkap"
            />
          </div>
          <div>
            <Label htmlFor="edit-admin-email">Email</Label>
            <Input
              id="edit-admin-email"
              value={email}
              placeholder="admin@example.com"
              disabled
            />
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Email tidak dapat diubah.
            </p>
          </div>
          <div>
            <Label htmlFor="edit-admin-password">Password Baru (opsional)</Label>
            <PasswordHint feedback={passwordFeedback} />
            <PasswordInput
              id="edit-admin-password"
              value={password}
              onChange={(e) => onPasswordChange(e.target.value)}
              placeholder="Minimal 8 karakter"
            />
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Kosongkan jika tidak ingin mengubah password.
            </p>
          </div>
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>Batal</Button>
          <Button className="bg-[#639922] hover:bg-[#58751d]" onClick={onSave} disabled={isSubmitting}>
            {isSubmitting ? "Menyimpan..." : "Simpan"}
          </Button>
        </div>
      </div>
    </div>
  );
}
