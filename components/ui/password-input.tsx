"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";

import { Input } from "@/components/ui/input";
import { CopyButton } from "@/components/ui/copy-button";
import { cn } from "@/lib/utils";
import { isStrongPassword } from "@/lib/password";

type PasswordInputProps = React.ComponentProps<"input"> & {
  allowCopy?: boolean
}

function PasswordInput({ className, allowCopy = true, ...props }: PasswordInputProps) {
  const [show, setShow] = React.useState(false);
  const value = typeof props.value === "string" ? props.value : "";

  return (
    <div className="relative">
      <Input
        {...props}
        type={show ? "text" : "password"}
        className={cn(allowCopy ? "pr-20" : "pr-10", className)}
      />
      {allowCopy ? (
        <CopyButton
          value={value}
          enabled={value.length > 0 && isStrongPassword(value)}
          label="Salin kata sandi"
          className="right-9"
        />
      ) : null}
      <button
        type="button"
        onClick={() => setShow((value) => !value)}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-500 dark:text-slate-400 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-100"
        aria-label={show ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
      >
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

export { PasswordInput };
