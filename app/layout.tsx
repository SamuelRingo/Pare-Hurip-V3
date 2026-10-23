import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AdminAuthProvider } from "@/components/pages/admin-page/AdminAuthContext";
import { ThemeProvider } from "@/lib/theme-context";
import RouteTransitionLoader from "@/components/layout/RouteTransitionLoader";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://parehurip.app"),
  title: "Prediksi Fase Tanam KSA & Harga Beras | BPS Kota Tasikmalaya",
  description: "Sistem prediksi fase tanam berbasis Kerangka Sampel Area (KSA) dan analisis harga beras real-time di Kota Tasikmalaya oleh BPS Kota Tasikmalaya.",
  keywords: [
    "Beras Tasikmalaya",
    "Prediksi Harga Beras",
    "Fase Tanam KSA",
    "BPS Kota Tasikmalaya",
    "Kerangka Sampel Area",
    "Pangan Tasikmalaya",
    "Pertanian Tasikmalaya",
  ],
  openGraph: {
    title: "Prediksi Fase Tanam KSA & Harga Beras | BPS Kota Tasikmalaya",
    description: "Sistem prediksi fase tanam berbasis Kerangka Sampel Area (KSA) dan analisis harga beras real-time di Kota Tasikmalaya oleh BPS Kota Tasikmalaya.",
    url: "https://parehurip.app",
    siteName: "Pare Hurip 2.0",
    locale: "id_ID",
    type: "website",
  },
  alternates: {
    canonical: "/",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Predict the theme on the server from the `theme` cookie (written by
  // theme-context) so the `dark` class is already in the SSR HTML and the
  // anti-FOUC script never mutates <html> in a way hydration can detect.
  const themeCookie = (await cookies()).get("theme")?.value;
  const isDark = themeCookie === "dark";

  return (
    <html lang="id" suppressHydrationWarning className={isDark ? "dark" : undefined}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <script
          dangerouslySetInnerHTML={{
            __html: "(function(){try{var t=localStorage.getItem(\"theme\");var d=t?t===\"dark\":(new Date().getHours()>=18||new Date().getHours()<6);document.documentElement.classList.toggle(\"dark\",d)}catch(e){}})();",
          }}
        />
        <ThemeProvider>
          <AdminAuthProvider>{children}</AdminAuthProvider>
        </ThemeProvider>
        <RouteTransitionLoader />
      </body>
    </html>
  );
}
