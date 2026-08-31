"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { TrashIcon, BanIcon } from "lucide-react";
import { ResetPasswordDialog } from "../_components/reset-password-dialog";
import {
  deactivateLeaderAction,
  deleteLeaderAction,
  resetLeaderPasswordAction,
} from "./actions";

export function LeaderActions({
  leaderId,
  disabled,
  isAdmin,
}: {
  leaderId: string;
  disabled: boolean;
  isAdmin: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function deactivate() {
    if (!window.confirm("Desativar este líder? Os links e sessões dele serão revogados.")) {
      return;
    }

    startTransition(async () => {
      const result = await deactivateLeaderAction(leaderId);
      if (!result.ok) {
        window.alert(result.message);
        return;
      }
      router.refresh();
    });
  }

  function deleteLeaderFn() {
    if (
      !window.confirm(
        "Excluir permanentemente este líder e todos os eleitores vinculados? Esta ação não pode ser desfeita."
      )
    ) {
      return;
    }

    startTransition(async () => {
      const result = await deleteLeaderAction(leaderId);
      if (!result.ok) {
        window.alert(result.message);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex gap-1 items-center">
      {isAdmin && (
        <ResetPasswordDialog
          userId={leaderId}
          entityLabel="este líder"
          disabled={disabled}
          onReset={resetLeaderPasswordAction}
        />
      )}
      <Button
        type="button"
        variant="destructive"
        size="sm"
        onClick={deactivate}
        disabled={disabled || isPending}
        title="Desativar líder"
      >
        <BanIcon className="h-4 w-4" />
      </Button>
      {isAdmin && (
        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={deleteLeaderFn}
          disabled={isPending}
          title="Excluir permanentemente"
        >
          <TrashIcon className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
