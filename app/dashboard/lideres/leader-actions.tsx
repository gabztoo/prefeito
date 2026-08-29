"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { deactivateLeaderAction } from "./actions";

export function LeaderActions({
  leaderId,
  disabled,
}: {
  leaderId: string;
  disabled: boolean;
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

  return (
    <Button
      type="button"
      variant="destructive"
      onClick={deactivate}
      disabled={disabled || isPending}
    >
      Desativar líder
    </Button>
  );
}
