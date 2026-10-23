"use client";

import * as React from "react";

import { Input } from "@/components/ui/input";
import { CopyButton } from "@/components/ui/copy-button";
import { cn } from "@/lib/utils";
import { isValidEmail } from "@/lib/email";

function EmailInput({ className, ...props }: React.ComponentProps<"input">) {
  const value = typeof props.value === "string" ? props.value : "";

  return (
    <div className="relative">
      <Input {...props} className={cn("pr-10", className)} />
      <CopyButton
        value={value}
        enabled={value.length > 0 && isValidEmail(value)}
        label="Salin email"
        className="right-2"
      />
    </div>
  );
}

export { EmailInput };
