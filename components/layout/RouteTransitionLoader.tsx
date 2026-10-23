"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2 } from "lucide-react";

const MIN_VISIBLE_MS = 300;
const MAX_VISIBLE_MS = 60000;

export default function RouteTransitionLoader() {
  const pathname = usePathname();
  const [visible, setVisible] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const prevPath = React.useRef(pathname);
  const hideTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const hide = React.useCallback(() => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
    setVisible(false);
    setDone(false);
  }, []);

  const show = React.useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setDone(false);
    setVisible(true);
    hideTimer.current = setTimeout(hide, MAX_VISIBLE_MS);
  }, [hide]);

  React.useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const anchor = (event.target as HTMLElement).closest<HTMLAnchorElement>("a[href]");
      if (!anchor) return;
      const href = anchor.getAttribute("href") ?? "";
      const isInternal =
        href.startsWith("/") &&
        !href.startsWith("#") &&
        !anchor.hasAttribute("download") &&
        anchor.target !== "_blank";
      if (!isInternal) return;
      const isSamePage =
        anchor.origin === window.location.origin && href.split("#")[0] === pathname;
      if (isSamePage) return;
      show();
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [pathname, show]);

  React.useEffect(() => {
    if (prevPath.current === pathname) return;
    prevPath.current = pathname;
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
    setDone(true);
    hideTimer.current = setTimeout(hide, MIN_VISIBLE_MS);
  }, [pathname, hide]);

  React.useEffect(() => {
    const onTransitionShow = () => show();
    window.addEventListener("route-transition:show", onTransitionShow);
    return () => window.removeEventListener("route-transition:show", onTransitionShow);
  }, [show]);

  React.useEffect(() => {
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  return (
    <>
      <AnimatePresence>
        {visible && (
          <motion.div
            className="fixed inset-x-0 top-0 z-[9999] h-1 bg-emerald-500"
            initial={{ width: "0%" }}
            animate={{ width: done ? "100%" : "90%" }}
            exit={{ opacity: 0 }}
            transition={{ duration: done ? 0.15 : 1.2, ease: "easeOut" }}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {visible && (
          <motion.div
            className="fixed inset-0 z-[9998] flex items-center justify-center bg-white/70 backdrop-blur-sm dark:bg-slate-950/70"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <div className="flex flex-col items-center gap-3 rounded-xl border border-slate-200 bg-white px-6 py-5 shadow-lg dark:border-slate-800 dark:bg-slate-900">
              <Loader2 className="size-8 animate-spin text-emerald-600" />
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Menyiapkan halaman...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
