"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { TrashIcon, BanIcon } from "lucide-react";
import { ResetPasswordDialog } from "../_components/reset-password-dialog";
import {
  deactivateCoordinatorAction,
  deleteCoordinatorAction,
  resetCoordinatorPasswordAction,
} from "./actions";

export function CoordenadorActions({
  coordinatorId,
  disabled,
}: {
  coordinatorId: string;
  disabled: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function deactivate() {
    if (
      !window.confirm(
        "Desativar este coordenador? Os líderes e links dele serão desativados."
      )
    ) {
      return;
    }

    startTransition(async () => {
      const result = await deactivateCoordinatorAction(coordinatorId);
      if (!result.ok) {
        window.alert(result.message);
        return;
      }
      router.refresh();
    });
  }

  function deleteCoordinator() {
    if (
      !window.confirm(
        "Excluir permanentemente este coordenador e todos os líderes e eleitores vinculados? Esta ação não pode ser desfeita."
      )
    ) {
      return;
    }

    startTransition(async () => {
      const result = await deleteCoordinatorAction(coordinatorId);
      if (!result.ok) {
        window.alert(result.message);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex gap-1 items-center">
      <ResetPasswordDialog
        userId={coordinatorId}
        entityLabel="este coordenador"
        disabled={disabled}
        onReset={resetCoordinatorPasswordAction}
      />
      <Button
        type="button"
        variant="destructive"
        size="sm"
        onClick={deactivate}
        disabled={disabled || isPending}
        title="Desativar coordenador"
      >
        <BanIcon className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="destructive"
        size="sm"
        onClick={deleteCoordinator}
        disabled={isPending}
        title="Excluir permanentemente"
      >
        <TrashIcon className="h-4 w-4" />
      </Button>
    </div>
  );
}
