"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createCampaignAction } from "../actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";

export default function NovaCampanhaPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const result = await createCampaignAction({
        name,
        slug,
        description: description || undefined,
      });

      if (result.ok) {
        router.push(`/dashboard/campanhas/${result.data.id}`);
        router.refresh();
      } else {
        setError(result.message);
      }
    } catch {
      setError("Erro ao criar campanha. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="flex flex-col items-start justify-start p-6 w-full">
      <div className="w-full max-w-2xl">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/dashboard/campanhas">
            <Button variant="outline" size="sm">
              Voltar
            </Button>
          </Link>
          <h1 className="text-3xl font-semibold tracking-tight">
            Nova Campanha
          </h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Criar nova campanha eleitoral</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="name">Nome da Campanha</Label>
                <Input
                  id="name"
                  placeholder="Ex: Campanha Municipal 2026"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    // Auto-generate slug from name
                    if (!slug) {
                      setSlug(
                        e.target.value
                          .toLowerCase()
                          .normalize("NFD")
                          .replace(/[\u0300-\u036f]/g, "")
                          .replace(/[^a-z0-9\s-]/g, "")
                          .replace(/\s+/g, "-")
                          .replace(/-+/g, "-")
                      );
                    }
                  }}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">Slug (URL)</Label>
                <Input
                  id="slug"
                  placeholder="campanha-municipal-2026"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Será usado na URL: /c/{slug}/[codigo]
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição (opcional)</Label>
                <Input
                  id="description"
                  placeholder="Descreva o objetivo da campanha"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="flex gap-4">
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Criando..." : "Criar Campanha"}
                </Button>
                <Link href="/dashboard/campanhas">
                  <Button type="button" variant="outline">
                    Cancelar
                  </Button>
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
