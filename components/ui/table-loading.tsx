import { Loader2 } from "lucide-react";

import { TableCell, TableRow } from "@/components/ui/table";

function TableLoading({
  colSpan,
  label = "Memuat data...",
}: {
  colSpan: number
  label?: string
}) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="h-24 text-center">
        <div className="flex items-center justify-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <Loader2 className="size-4 animate-spin text-emerald-600" />
          <span>{label}</span>
        </div>
      </TableCell>
    </TableRow>
  );
}

export { TableLoading };
