import type { Metadata } from "next";
import Login from "@/components/pages/admin-page/Login";

export const metadata: Metadata = {
  title: "Masuk Admin — Pare Hurip",
  robots: { index: false, follow: false },
};

export default function AdminLoginPage() {
  return <Login />;
}
