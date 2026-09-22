"use client";

import { useState } from "react";
import { FileSpreadsheetIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface VoterExportButtonProps {
  filters: {
    leaderId?: string;
    leaderUserId?: string;
    zone?: string;
    section?: string;
    search?: string;
  };
  compact?: boolean;
}

export function VoterExportButton({ filters, compact = false }: VoterExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  async function handleExport() {
    setIsExporting(true);

    try {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(filters)) {
        if (value) params.set(key, value);
      }

      const response = await fetch(`/api/eleitores/exportar?${params.toString()}`);
      if (!response.ok) {
        const error = await response.json().catch(() => null) as { message?: string } | null;
        toast.error(error?.message ?? "Não foi possível exportar os eleitores.");
        return;
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "eleitores.xlsx";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
      toast.success("Planilha exportada com sucesso.");
    } catch {
      toast.error("Não foi possível exportar os eleitores.");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size={compact ? "sm" : "default"}
      onClick={handleExport}
      disabled={isExporting}
      aria-busy={isExporting}
    >
      <FileSpreadsheetIcon aria-hidden="true" className="mr-2 size-4" />
      {isExporting ? "Exportando..." : "Exportar XLSX"}
    </Button>
  );
}
