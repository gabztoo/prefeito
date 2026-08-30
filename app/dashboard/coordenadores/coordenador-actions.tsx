"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { deactivateCoordinatorAction } from "./actions";

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

  return (
    <Button
      type="button"
      variant="destructive"
      onClick={deactivate}
      disabled={disabled || isPending}
    >
      Desativar coordenador
    </Button>
  );
}
