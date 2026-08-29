"use client";

import { FormEvent, useState, useTransition } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";
import { assignLeaderToCampaignAction } from "./actions";
import { Button } from "@/components/ui/button";

interface LeaderOption {
  id: string;
  name: string;
  email: string;
}

interface AssignLeaderFormProps {
  campaignId: string;
  campaignSlug: string;
  leaders: LeaderOption[];
  disabled: boolean;
}

export function AssignLeaderForm({
  campaignId,
  campaignSlug,
  leaders,
  disabled,
}: AssignLeaderFormProps) {
  const router = useRouter();
  const [selectedLeaderId, setSelectedLeaderId] = useState("");
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedLeaderId) return;

    setError(null);
    setCopied(false);

    startTransition(async () => {
      const result = await assignLeaderToCampaignAction(
        campaignId,
        selectedLeaderId
      );

      if (!result.ok) {
        setError(result.message);
        return;
      }

      const path = `/c/${campaignSlug}/${result.data.publicCode}`;
      const url = `${window.location.origin}${path}`;
      setGeneratedLink(url);
      router.refresh();
    });
  }

  async function copyGeneratedLink() {
    if (!generatedLink || !navigator.clipboard) {
      setError("Não foi possível copiar automaticamente. Selecione o link para copiar.");
      return;
    }

    try {
      await navigator.clipboard.writeText(generatedLink);
      setCopied(true);
      setError(null);
    } catch {
      setError("Não foi possível copiar automaticamente. Selecione o link para copiar.");
    }
  }

  return (
    <div className="space-y-4">
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-3 sm:flex-row sm:items-end"
      >
        <div className="flex-1 space-y-2">
          <label htmlFor="leaderId" className="text-sm font-medium">
            Líder
          </label>
          <select
            id="leaderId"
            name="leaderId"
            value={selectedLeaderId}
            onChange={(event) => setSelectedLeaderId(event.target.value)}
            className="border-input bg-background flex h-10 w-full rounded-md border px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
            required
            disabled={disabled || isPending}
          >
            <option value="">
              {leaders.length === 0
                ? "Nenhum líder disponível"
                : "Selecione um líder"}
            </option>
            {leaders.map((leader) => (
              <option key={leader.id} value={leader.id}>
                {leader.name} ({leader.email})
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" disabled={disabled || isPending || !selectedLeaderId}>
          {isPending ? "Gerando..." : "Gerar link"}
        </Button>
      </form>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      {generatedLink && (
        <div
          role="status"
          aria-live="polite"
          className="rounded-lg border border-primary/30 bg-primary/5 p-4"
        >
          <p className="text-sm font-medium">Link pronto para compartilhar</p>
          <code className="mt-2 block break-all rounded-md bg-background p-3 text-xs">
            {generatedLink}
          </code>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" onClick={copyGeneratedLink}>
              {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
              {copied ? "Link copiado" : "Copiar link"}
            </Button>
            <Button asChild type="button" variant="outline">
              <a href={generatedLink} target="_blank" rel="noreferrer">
                <ExternalLink aria-hidden="true" /> Abrir cadastro
              </a>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
