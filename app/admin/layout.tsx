"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAdminAuth } from "@/components/pages/admin-page/AdminAuthContext";
import { showRouteTransition } from "@/lib/route-transition";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { role, loading } = useAdminAuth();

  const isLoginPage = pathname === "/admin/login";

  React.useEffect(() => {
    if (!isLoginPage && !loading && !role) {
      showRouteTransition();
      router.replace("/admin/login");
    }
  }, [isLoginPage, loading, role, router]);

  // The login page must render as-is, without a guard —
  // Login.tsx already has its own loading/redirect logic.
  if (isLoginPage) {
    return <>{children}</>;
  }

  if (loading || !role) {
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

  return <>{children}</>;
}