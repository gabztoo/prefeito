"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { KeyRound } from "lucide-react";

const DEFAULT_RESET_PASSWORD = "12345678";

interface ResetPasswordDialogProps {
  userId: string;
  onReset: (userId: string) => Promise<{
    ok: boolean;
    message?: string;
    data?: { id: string } | null;
  }>;
  disabled?: boolean;
  triggerLabel?: string;
  entityLabel: string;
}

export function ResetPasswordDialog({
  userId,
  onReset,
  disabled = false,
  triggerLabel = "Resetar senha",
  entityLabel,
}: ResetPasswordDialogProps) {
  const [open, setOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  async function handleReset() {
    setIsResetting(true);
    setError(null);
    setSuccess(false);

    try {
      const result = await onReset(userId);
      if (!result.ok) {
        setError(result.message || "Erro ao resetar a senha");
        return;
      }
      setSuccess(true);
      setTimeout(() => {
        setOpen(false);
        setSuccess(false);
        router.refresh();
      }, 1500);
    } catch {
      setError("Erro ao resetar a senha. Tente novamente.");
    } finally {
      setIsResetting(false);
    }
  }

  function handleOpenChange(newOpen: boolean) {
    if (isResetting) return;
    setOpen(newOpen);
    if (!newOpen) {
      setError(null);
      setSuccess(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled}>
          <KeyRound className="h-4 w-4 mr-2" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Resetar senha de {entityLabel}</DialogTitle>
          <DialogDescription>
            A senha voltará para a senha padrão{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">
              {DEFAULT_RESET_PASSWORD}
            </code>
            . O usuário será desconectado de todos os dispositivos e precisará
            trocar a senha no próximo acesso.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="border-green-500 bg-green-50">
              <AlertDescription className="text-green-800">
                Senha resetada com sucesso! O usuário precisará trocar a senha
                no próximo login.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isResetting}>
            Cancelar
          </Button>
          <Button onClick={handleReset} disabled={isResetting || success}>
            {isResetting ? "Resetando..." : "Confirmar reset"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}