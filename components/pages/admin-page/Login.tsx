"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Eye, EyeOff, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase/client";
import { showRouteTransition } from "@/lib/route-transition";
import { useAdminAuth } from "@/components/pages/admin-page/AdminAuthContext";

type LoginErrors = {
  email?: string
  password?: string
  form?: string
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export default function Login() {
  const router = useRouter();
  const { role: currentRole, loading: authLoading, setRole: setAdminRole } = useAdminAuth();

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [errors, setErrors] = React.useState<LoginErrors>({});
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!authLoading && currentRole) {
      showRouteTransition();
      router.replace("/admin/dashboard");
    }
  }, [authLoading, currentRole, router]);

  const validate = React.useCallback(() => {
    const nextErrors: LoginErrors = {};

    if (!email.trim()) {
      nextErrors.email = "Email wajib diisi.";
    } else if (!isValidEmail(email)) {
      nextErrors.email = "Format email tidak valid.";
    }

    if (!password) {
      nextErrors.password = "Kata sandi wajib diisi.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }, [email, password]);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!validate()) {
      return;
    }

    setLoading(true);
    setErrors({});

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.user) {
      setLoading(false);
      setErrors({ form: "Email atau kata sandi salah." });
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", authData.user.id)
      .single();

    setLoading(false);

    if (profileError || !profile) {
      setErrors({ form: "Gagal mengambil data profil. Coba lagi." });
      return;
    }

    if (profile.role !== "admin" && profile.role !== "superadmin") {
      setErrors({ form: "Akun ini belum memiliki akses admin. Hubungi superadmin." });
      await supabase.auth.signOut();
      return;
    }

    setAdminRole(profile.role);
    showRouteTransition();
  };

  if (authLoading || currentRole) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-8 animate-spin text-emerald-600" />
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
            Menyiapkan halaman...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
        <div className="mx-auto flex w-full max-w-md flex-col gap-8">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-3xl bg-emerald-100 dark:bg-emerald-900/20">
            <Image src="/images/logo.png" alt="Pare Hurip" width={48} height={48} className="rounded-2xl object-cover" />
          </div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
            Pare Hurip Admin
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Masuk untuk mengelola data KSA resmi
          </p>
        </div>

        <Card className="shadow-xl">
          <CardContent className="space-y-5 px-8 py-8">
            <form className="space-y-5" onSubmit={onSubmit} noValidate>
              {errors.form ? (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/30 dark:bg-red-950/40 dark:text-red-300">
                  {errors.form}
                </div>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="admin-email">Email</Label>
                <Input
                  id="admin-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="admin@bps-tasikmalaya.go.id"
                  autoComplete="email"
                />
                {errors.email ? (
                  <p className="text-sm text-destructive">{errors.email}</p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="admin-password">Password</Label>
                <div className="relative">
                  <Input
                    id="admin-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Masukkan kata sandi"
                    autoComplete="current-password"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-500 dark:text-slate-400 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                    aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                {errors.password ? (
                  <p className="text-sm text-destructive">{errors.password}</p>
                ) : null}
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-[#639922] text-white hover:bg-[#4f7d19]"
              >
                {loading ? "Memproses..." : "Masuk"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}