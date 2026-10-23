"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";

import { cn } from "@/lib/utils";

const IDLE_DELAY = 700;
const SUCCESS_DELAY = 2000;

type CopyButtonProps = {
  value: string
  /** Whether the button is shown (e.g. strong password / valid email) */
  enabled: boolean
  label?: string
  className?: string
}

function CopyButton({ value, enabled, label = "Salin", className }: CopyButtonProps) {
  const [copied, setCopied] = React.useState(false);
  const [idle, setIdle] = React.useState(false);

  React.useEffect(() => {
    setIdle(false);
    if (!value) return;

    const handle = window.setTimeout(() => setIdle(true), IDLE_DELAY);
    return () => window.clearTimeout(handle);
  }, [value]);

  React.useEffect(() => {
    if (!copied) return;

    const handle = window.setTimeout(() => setCopied(false), SUCCESS_DELAY);
    return () => window.clearTimeout(handle);
  }, [copied]);

  const visible = enabled && idle;

  const copyValue = async () => {
    if (!visible) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      // clipboard unavailable — ignore
    }
  };

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={copyValue}
      aria-label={label}
      title={label}
      className={cn(
        "absolute top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-500 dark:text-slate-400 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-100",
        className
      )}
    >
      {copied ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
    </button>
  );
}

export { CopyButton };
