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
import { Copy, Check, UserPlus } from "lucide-react";

interface GenerateVoterLinkDialogProps {
  onGenerate: () => Promise<{ ok: boolean; data?: { url: string } | null; message?: string }>;
}

export function GenerateVoterLinkDialog({ onGenerate }: GenerateVoterLinkDialogProps) {
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

  async function handleWhatsApp() {
    if (!generatedUrl) return;
    const message = encodeURIComponent(
      `Olá! Clique no link abaixo para se cadastrar como eleitor:\n\n${generatedUrl}`
    );
    window.open(`https://wa.me/?text=${message}`, "_blank");
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
        <Button variant="ghost" size="sm" className="h-8 px-2 text-muted-foreground">
          <UserPlus className="h-4 w-4 mr-1" />
          Link de cadastro
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Link de Cadastro de Eleitor</DialogTitle>
          <DialogDescription>
            Gere um link para que a pessoa se cadastre como eleitor vinculada a você.
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
            <div className="flex gap-2 w-full">
              <Button variant="outline" onClick={() => handleOpenChange(false)} className="flex-1">
                Fechar
              </Button>
              <Button onClick={handleWhatsApp} className="flex-1">
                Compartilhar no WhatsApp
              </Button>
            </div>
          ) : (
            <Button onClick={handleGenerate} disabled={isGenerating} className="w-full">
              {isGenerating ? "Gerando..." : "Gerar Link"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
