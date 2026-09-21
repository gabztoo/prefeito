"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { UserCogIcon } from "lucide-react";
import { transferLeaderAction } from "./actions";

const NO_COORDINATOR = "__none__";

export function ReassignCoordinatorDialog({
  leaderId,
  leaderName,
  currentCoordinatorId,
  coordinators,
}: {
  leaderId: string;
  leaderName: string;
  currentCoordinatorId: string | null;
  coordinators: Array<{ id: string; name: string }>;
}) {
  const [open, setOpen] = useState(false);
  const [coordinatorId, setCoordinatorId] = useState(
    currentCoordinatorId ?? NO_COORDINATOR
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      setError(null);
      setCoordinatorId(currentCoordinatorId ?? NO_COORDINATOR);
    }
  }

  function handleSubmit() {
    setError(null);

    startTransition(async () => {
      const result = await transferLeaderAction(
        leaderId,
        coordinatorId === NO_COORDINATOR ? null : coordinatorId
      );

      if (!result.ok) {
        setError(result.message);
        return;
      }

      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          title="Alterar coordenador responsável"
        >
          <UserCogIcon className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Transferir {leaderName}</DialogTitle>
          <DialogDescription>
            Altera o papel para líder e define o coordenador responsável. Os
            eleitores já cadastrados são preservados.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor={`coordinator-${leaderId}`}>
            Coordenador responsável
          </Label>
          <Select value={coordinatorId} onValueChange={setCoordinatorId}>
            <SelectTrigger id={`coordinator-${leaderId}`}>
              <SelectValue placeholder="Selecione um coordenador" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_COORDINATOR}>Sem coordenador</SelectItem>
              {coordinators.map((coordinator) => (
                <SelectItem key={coordinator.id} value={coordinator.id}>
                  {coordinator.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={isPending}>
              Cancelar
            </Button>
          </DialogClose>
          <Button type="button" onClick={handleSubmit} disabled={isPending}>
            {isPending ? "Transferindo..." : "Confirmar transferência"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
