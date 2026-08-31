"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Copy, Check, Link } from "lucide-react";

interface GenerateLinkDialogProps {
  onGenerate: () => Promise<{ ok: boolean; data?: { url: string } | null; message?: string }>;
  triggerLabel?: string;
}

export function GenerateLinkDialog({ onGenerate, triggerLabel = "Gerar Link" }: GenerateLinkDialogProps) {
  const [open, setOpen] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setIsGenerating(true);
    setError(null);
    setGeneratedUrl(null);

    try {
      const result = await onGenerate();
      if (result.ok && result.data) {
        const fullUrl = `${window.location.origin}/cadastro/${result.data.url}`;
        setGeneratedUrl(fullUrl);
      } else {
        setError(result.message || "Erro ao gerar link");
      }
    } catch {
      setError("Erro ao gerar link. Tente novamente.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleCopy() {
    if (!generatedUrl) return;

    try {
      await navigator.clipboard.writeText(generatedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const input = document.createElement("input");
      input.value = generatedUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function handleOpenChange(newOpen: boolean) {
    setOpen(newOpen);
    if (!newOpen) {
      setGeneratedUrl(null);
      setError(null);
      setCopied(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Link className="h-4 w-4 mr-2" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Gerar Link de Cadastro</DialogTitle>
          <DialogDescription>
            Gere um link público para que a pessoa faça seu próprio cadastro.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {generatedUrl ? (
            <div className="space-y-2">
              <Label>Link gerado:</Label>
              <div className="flex gap-2">
                <Input
                  value={generatedUrl}
                  readOnly
                  className="flex-1 font-mono text-sm"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  onClick={handleCopy}
                  title="Copiar link"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Copie e envie este link para a pessoa se cadastrar.
              </p>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          {generatedUrl ? (
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              Fechar
            </Button>
          ) : (
            <Button onClick={handleGenerate} disabled={isGenerating}>
              {isGenerating ? "Gerando..." : "Gerar Link"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
